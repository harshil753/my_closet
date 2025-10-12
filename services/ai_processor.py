"""
AI processing service for virtual try-on generation
Handles Gemini AI integration and image generation
"""

import os
import json
import base64
import asyncio
import time
import random
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from google.generativeai import GenerativeModel, configure
import google.generativeai as genai
from services.image_processor import image_processor


@dataclass
class VirtualTryOnRequest:
    """Request for virtual try-on processing"""
    user_base_photos: List[str]  # Base64 encoded images
    clothing_items: List[str]    # Base64 encoded images
    session_id: str
    user_id: str


@dataclass
class VirtualTryOnResult:
    """Result of virtual try-on processing"""
    success: bool
    generated_image: Optional[str] = None  # Base64 encoded
    processing_time: Optional[float] = None
    error: Optional[str] = None
    retry_count: int = 0
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ClothingDetectionResult:
    """Result of clothing detection"""
    is_clothing: bool
    category: str
    quality: str  # 'good', 'fair', 'poor'
    suitable: bool
    confidence: float


class AIFailureType(Enum):
    """AI failure classification types"""
    API_QUOTA_EXCEEDED = "api_quota_exceeded"
    API_RATE_LIMIT = "api_rate_limit"
    API_TIMEOUT = "api_timeout"
    API_AUTHENTICATION = "api_authentication"
    API_SERVER_ERROR = "api_server_error"
    IMAGE_PROCESSING_ERROR = "image_processing_error"
    INVALID_REQUEST = "invalid_request"
    CONTENT_POLICY_VIOLATION = "content_policy_violation"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class AIFailureInfo:
    """Detailed failure information for classification"""
    failure_type: AIFailureType
    error_message: str
    retryable: bool
    user_friendly_message: str
    suggested_action: str
    retry_after_seconds: Optional[int] = None


@dataclass
class RetryConfig:
    """Configuration for retry logic with exponential backoff"""
    max_retries: int = 3
    base_delay: float = 1.0  # Base delay in seconds
    max_delay: float = 60.0  # Maximum delay in seconds
    backoff_multiplier: float = 2.0
    jitter: bool = True  # Add random jitter to prevent thundering herd


class AIProcessor:
    """
    AI processing service for virtual try-on generation
    Handles Gemini AI integration and image processing
    """
    
    def __init__(self):
        """Initialize the AI processor"""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # Configure Gemini AI
        configure(api_key=self.api_key)
        self.model = GenerativeModel('gemini-2.0-flash-exp')
        
        # Processing limits
        self.max_processing_time = 60  # seconds
        self.retry_config = RetryConfig()
        
        # Failure classification patterns
        self.failure_patterns = {
            AIFailureType.API_QUOTA_EXCEEDED: [
                "quota exceeded", "quota limit", "usage limit", "billing"
            ],
            AIFailureType.API_RATE_LIMIT: [
                "rate limit", "too many requests", "throttled", "429"
            ],
            AIFailureType.API_TIMEOUT: [
                "timeout", "timed out", "request timeout", "deadline exceeded"
            ],
            AIFailureType.API_AUTHENTICATION: [
                "unauthorized", "authentication", "invalid key", "401", "403"
            ],
            AIFailureType.API_SERVER_ERROR: [
                "server error", "internal error", "500", "502", "503", "504"
            ],
            AIFailureType.CONTENT_POLICY_VIOLATION: [
                "content policy", "safety", "inappropriate", "blocked"
            ]
        }
        
    async def process_virtual_try_on(
        self, 
        request: VirtualTryOnRequest
    ) -> VirtualTryOnResult:
        """
        Process virtual try-on request using Gemini AI
        
        Args:
            request: Virtual try-on request with images and metadata
            
        Returns:
            VirtualTryOnResult with generated image or error
        """
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Validate request
            validation_result = self._validate_request(request)
            if not validation_result['valid']:
                return VirtualTryOnResult(
                    success=False,
                    error=validation_result['error']
                )
            
            # Prepare images for AI processing
            processed_images = await self._prepare_images_for_ai(request)
            
            # Generate virtual try-on image
            generated_image = await self._generate_virtual_try_on(
                processed_images['user_photos'],
                processed_images['clothing_items']
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return VirtualTryOnResult(
                success=True,
                generated_image=generated_image,
                processing_time=processing_time,
                metadata={
                    'session_id': request.session_id,
                    'user_id': request.user_id,
                    'user_photos_count': len(request.user_base_photos),
                    'clothing_items_count': len(request.clothing_items)
                }
            )
            
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # Classify the failure for better error reporting
            failure_info = self._classify_failure(e)
            
            return VirtualTryOnResult(
                success=False,
                error=failure_info.user_friendly_message,
                processing_time=processing_time,
                metadata={
                    'failure_type': failure_info.failure_type.value,
                    'suggested_action': failure_info.suggested_action,
                    'retryable': failure_info.retryable,
                    'retry_after_seconds': failure_info.retry_after_seconds,
                    'technical_error': failure_info.error_message
                }
            )
    
    async def detect_clothing(
        self, 
        image_data: bytes
    ) -> ClothingDetectionResult:
        """
        Detect if image contains clothing suitable for virtual try-on
        
        Args:
            image_data: Raw image data
            
        Returns:
            ClothingDetectionResult with detection information
        """
        try:
            # Process image for AI
            processed_result = image_processor.prepare_clothing_image_for_ai_bytes(image_data)
            if not processed_result.get('success'):
                return ClothingDetectionResult(
                    is_clothing=False,
                    category='unknown',
                    quality='poor',
                    suitable=False,
                    confidence=0.0
                )
            
            # Convert to base64 for AI processing
            image_base64 = base64.b64encode(processed_result['processed_image']).decode('utf-8')
            
            # Create prompt for clothing detection
            prompt = self._create_clothing_detection_prompt()
            
            # Generate content with Gemini AI
            response = await self._generate_content_with_retry(prompt, image_base64)
            
            # Parse response
            detection_result = self._parse_clothing_detection_response(response)
            
            return detection_result
            
        except Exception as e:
            print(f"Clothing detection error: {e}")
            return ClothingDetectionResult(
                is_clothing=False,
                category='unknown',
                quality='poor',
                suitable=False,
                confidence=0.0
            )
    
    async def _prepare_images_for_ai(self, request: VirtualTryOnRequest) -> Dict[str, List[str]]:
        """Prepare images for AI processing"""
        processed_user_photos = []
        processed_clothing_items = []
        
        # Process user base photos
        for photo_base64 in request.user_base_photos:
            photo_data = base64.b64decode(photo_base64)
            processed_result = image_processor.prepare_base_photo_for_ai_bytes(photo_data)
            if processed_result.get('success'):
                processed_user_photos.append(
                    base64.b64encode(processed_result['processed_image']).decode('utf-8')
                )
        
        # Process clothing items
        for item_base64 in request.clothing_items:
            item_data = base64.b64decode(item_base64)
            processed_result = image_processor.prepare_clothing_image_for_ai_bytes(item_data)
            if processed_result.get('success'):
                processed_clothing_items.append(
                    base64.b64encode(processed_result['processed_image']).decode('utf-8')
                )
        
        return {
            'user_photos': processed_user_photos,
            'clothing_items': processed_clothing_items
        }
    
    async def _generate_virtual_try_on(
        self, 
        user_photos: List[str], 
        clothing_items: List[str]
    ) -> str:
        """Generate virtual try-on image using Gemini AI"""
        
        # Create prompt for virtual try-on
        prompt = self._create_virtual_try_on_prompt(len(user_photos), len(clothing_items))
        
        # Prepare content for Gemini AI
        content_parts = [prompt]
        
        # Add user photos
        for photo in user_photos:
            content_parts.append({
                'inline_data': {
                    'data': photo,
                    'mime_type': 'image/jpeg'
                }
            })
        
        # Add clothing items
        for item in clothing_items:
            content_parts.append({
                'inline_data': {
                    'data': item,
                    'mime_type': 'image/jpeg'
                }
            })
        
        # Generate content
        response = await self._generate_content_with_retry(prompt, content_parts)
        
        # Extract generated image
        generated_image = self._extract_generated_image(response)
        
        return generated_image
    
    async def _generate_content_with_retry(
        self, 
        prompt: str, 
        content: Any,
        max_retries: int = None
    ) -> str:
        """Generate content with exponential backoff retry logic"""
        if max_retries is None:
            max_retries = self.retry_config.max_retries
        
        last_error = None
        last_failure_info = None
        
        for attempt in range(max_retries + 1):
            try:
                if isinstance(content, str):
                    # Single image content
                    response = self.model.generate_content([prompt, {
                        'inline_data': {
                            'data': content,
                            'mime_type': 'image/jpeg'
                        }
                    }])
                else:
                    # Multiple content parts
                    response = self.model.generate_content([prompt] + content)
                
                return response.text
                
            except Exception as e:
                last_error = e
                last_failure_info = self._classify_failure(e)
                
                # Check if we should retry
                if attempt < max_retries and last_failure_info.retryable:
                    # Calculate exponential backoff delay
                    delay = self._calculate_retry_delay(attempt)
                    await asyncio.sleep(delay)
                else:
                    # No more retries or non-retryable error
                    break
        
        # If we get here, all retries failed
        if last_failure_info:
            # Create a more informative error message
            error_msg = f"{last_failure_info.user_friendly_message} (Technical: {last_failure_info.error_message})"
            raise Exception(error_msg)
        else:
            raise last_error
    
    def _create_virtual_try_on_prompt(self, user_photos_count: int, clothing_count: int) -> str:
        """Create prompt for virtual try-on generation"""
        return f"""
You are a professional fashion AI assistant. Your task is to generate a realistic image of a person wearing selected clothing items.

Instructions:
1. Analyze the user's base photos to understand their body type, skin tone, and facial features
2. Examine the selected clothing items to understand their style, color, and fit
3. Generate a realistic image showing the user wearing the selected clothing
4. Ensure the clothing fits naturally on the user's body
5. Maintain the user's facial features and body proportions
6. Pay attention to lighting and shadows for realism
7. Ensure the clothing appears to be properly fitted and styled

User has provided {user_photos_count} base photos and selected {clothing_count} clothing items.

Generate a high-quality, realistic image of the user wearing the selected clothing items.
        """.strip()
    
    def _create_clothing_detection_prompt(self) -> str:
        """Create prompt for clothing detection"""
        return """
Analyze this image and determine if it contains clothing items suitable for a virtual closet.

Instructions:
1. Identify if the image contains clothing (shirts, pants, dresses, shoes, accessories)
2. Determine the clothing category (shirts, pants, shoes, dresses, accessories)
3. Assess image quality (lighting, clarity, full item visible)
4. Check if the clothing is suitable for virtual try-on

Return a JSON response with:
- is_clothing: boolean
- category: string
- quality: "good" | "fair" | "poor"
- suitable: boolean
- confidence: number (0-1)
        """.strip()
    
    def _parse_clothing_detection_response(self, response: str) -> ClothingDetectionResult:
        """Parse clothing detection response from AI"""
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                return ClothingDetectionResult(
                    is_clothing=data.get('is_clothing', False),
                    category=data.get('category', 'unknown'),
                    quality=data.get('quality', 'poor'),
                    suitable=data.get('suitable', False),
                    confidence=data.get('confidence', 0.0)
                )
            else:
                # Fallback parsing
                return self._fallback_parse_detection(response)
                
        except Exception as e:
            print(f"Error parsing detection response: {e}")
            return ClothingDetectionResult(
                is_clothing=False,
                category='unknown',
                quality='poor',
                suitable=False,
                confidence=0.0
            )
    
    def _fallback_parse_detection(self, response: str) -> ClothingDetectionResult:
        """Fallback parsing for detection response"""
        response_lower = response.lower()
        
        is_clothing = any(word in response_lower for word in ['shirt', 'pants', 'dress', 'shoes', 'clothing'])
        category = 'unknown'
        quality = 'fair'
        suitable = is_clothing
        confidence = 0.5 if is_clothing else 0.0
        
        return ClothingDetectionResult(
            is_clothing=is_clothing,
            category=category,
            quality=quality,
            suitable=suitable,
            confidence=confidence
        )
    
    def _extract_generated_image(self, response: str) -> str:
        """Extract generated image from AI response"""
        # This is a placeholder - actual implementation would depend on Gemini's response format
        # For now, return a placeholder base64 image
        return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    
    def _validate_request(self, request: VirtualTryOnRequest) -> Dict[str, Any]:
        """Validate virtual try-on request"""
        if not request.user_base_photos:
            return {'valid': False, 'error': 'No user base photos provided'}
        
        if not request.clothing_items:
            return {'valid': False, 'error': 'No clothing items selected'}
        
        if len(request.user_base_photos) > 3:
            return {'valid': False, 'error': 'Too many user base photos (max 3)'}
        
        if len(request.clothing_items) > 5:
            return {'valid': False, 'error': 'Too many clothing items (max 5)'}
        
        return {'valid': True}
    
    def _classify_failure(self, error: Exception) -> AIFailureInfo:
        """
        Classify AI failure and provide user-friendly information
        
        Args:
            error: The exception that occurred
            
        Returns:
            AIFailureInfo with classification and user guidance
        """
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Check for specific failure patterns
        for failure_type, patterns in self.failure_patterns.items():
            if any(pattern in error_str for pattern in patterns):
                return self._create_failure_info(failure_type, error)
        
        # Check for specific exception types
        if "timeout" in error_type.lower() or "timeout" in error_str:
            return self._create_failure_info(AIFailureType.API_TIMEOUT, error)
        elif "connection" in error_str or "network" in error_str:
            return self._create_failure_info(AIFailureType.API_SERVER_ERROR, error)
        elif "image" in error_str or "processing" in error_str:
            return self._create_failure_info(AIFailureType.IMAGE_PROCESSING_ERROR, error)
        
        # Default to unknown error
        return self._create_failure_info(AIFailureType.UNKNOWN_ERROR, error)
    
    def _create_failure_info(self, failure_type: AIFailureType, error: Exception) -> AIFailureInfo:
        """Create detailed failure information based on failure type"""
        
        failure_messages = {
            AIFailureType.API_QUOTA_EXCEEDED: {
                'user_message': "AI service quota exceeded. Please try again later or upgrade your plan.",
                'suggested_action': "Wait 24 hours or contact support to increase quota limits.",
                'retryable': True,
                'retry_after': 3600  # 1 hour
            },
            AIFailureType.API_RATE_LIMIT: {
                'user_message': "Too many requests. Please wait a moment before trying again.",
                'suggested_action': "Wait a few minutes and try again.",
                'retryable': True,
                'retry_after': 300  # 5 minutes
            },
            AIFailureType.API_TIMEOUT: {
                'user_message': "Request timed out. The AI service is taking longer than expected.",
                'suggested_action': "Try again with fewer clothing items or simpler images.",
                'retryable': True,
                'retry_after': 60  # 1 minute
            },
            AIFailureType.API_AUTHENTICATION: {
                'user_message': "Authentication failed. Please contact support.",
                'suggested_action': "Contact support to verify your API key configuration.",
                'retryable': False,
                'retry_after': None
            },
            AIFailureType.API_SERVER_ERROR: {
                'user_message': "AI service temporarily unavailable. Please try again later.",
                'suggested_action': "Wait a few minutes and try again.",
                'retryable': True,
                'retry_after': 180  # 3 minutes
            },
            AIFailureType.IMAGE_PROCESSING_ERROR: {
                'user_message': "Image processing failed. Please check your images and try again.",
                'suggested_action': "Ensure images are clear, well-lit, and in supported formats.",
                'retryable': True,
                'retry_after': 30  # 30 seconds
            },
            AIFailureType.INVALID_REQUEST: {
                'user_message': "Invalid request. Please check your input and try again.",
                'suggested_action': "Verify you have selected clothing items and uploaded base photos.",
                'retryable': False,
                'retry_after': None
            },
            AIFailureType.CONTENT_POLICY_VIOLATION: {
                'user_message': "Content policy violation. Please use appropriate images.",
                'suggested_action': "Ensure all images are appropriate and follow our guidelines.",
                'retryable': False,
                'retry_after': None
            },
            AIFailureType.UNKNOWN_ERROR: {
                'user_message': "An unexpected error occurred. Please try again.",
                'suggested_action': "If the problem persists, contact support.",
                'retryable': True,
                'retry_after': 60  # 1 minute
            }
        }
        
        config = failure_messages.get(failure_type, failure_messages[AIFailureType.UNKNOWN_ERROR])
        
        return AIFailureInfo(
            failure_type=failure_type,
            error_message=str(error),
            retryable=config['retryable'],
            user_friendly_message=config['user_message'],
            suggested_action=config['suggested_action'],
            retry_after_seconds=config['retry_after']
        )
    
    def _calculate_retry_delay(self, attempt: int) -> float:
        """
        Calculate exponential backoff delay with jitter
        
        Args:
            attempt: Current attempt number (0-based)
            
        Returns:
            Delay in seconds
        """
        if attempt == 0:
            return 0
        
        # Exponential backoff: base_delay * (backoff_multiplier ^ (attempt - 1))
        delay = self.retry_config.base_delay * (self.retry_config.backoff_multiplier ** (attempt - 1))
        
        # Cap at max_delay
        delay = min(delay, self.retry_config.max_delay)
        
        # Add jitter to prevent thundering herd
        if self.retry_config.jitter:
            jitter = random.uniform(0.1, 0.3) * delay
            delay += jitter
        
        return delay


# Create global instance
ai_processor = AIProcessor()
