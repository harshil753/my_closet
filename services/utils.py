"""
Utility functions for AI processing services
Common utilities for image processing and AI integration
"""

import os
import json
import base64
import hashlib
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict


@dataclass
class ProcessingStats:
    """Statistics for processing operations"""
    start_time: float
    end_time: Optional[float] = None
    processing_time: Optional[float] = None
    success: bool = False
    error: Optional[str] = None
    retry_count: int = 0
    metadata: Optional[Dict[str, Any]] = None
    
    def finish(self, success: bool = True, error: Optional[str] = None):
        """Finish processing and calculate stats"""
        self.end_time = time.time()
        self.processing_time = self.end_time - self.start_time
        self.success = success
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class ProcessingLogger:
    """Logger for processing operations"""
    
    def __init__(self, log_level: str = "INFO"):
        self.log_level = log_level
        self.levels = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3}
    
    def log(self, message: str, level: str = "INFO", **kwargs):
        """Log a message with optional metadata"""
        if self.levels.get(level, 1) >= self.levels.get(self.log_level, 1):
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [{level}] {message}")
            if kwargs:
                print(f"  Metadata: {json.dumps(kwargs, indent=2)}")
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.log(message, "DEBUG", **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self.log(message, "INFO", **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.log(message, "WARNING", **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self.log(message, "ERROR", **kwargs)


def generate_session_id(user_id: str, timestamp: Optional[float] = None) -> str:
    """Generate a unique session ID"""
    if timestamp is None:
        timestamp = time.time()
    
    # Create a hash from user ID and timestamp
    hash_input = f"{user_id}_{timestamp}".encode('utf-8')
    session_hash = hashlib.md5(hash_input).hexdigest()[:12]
    
    return f"session_{session_hash}"


def validate_base64_image(image_base64: str) -> Dict[str, Any]:
    """Validate base64 encoded image"""
    try:
        # Check if it's a data URL
        if image_base64.startswith('data:image/'):
            # Extract base64 part
            header, data = image_base64.split(',', 1)
            image_data = base64.b64decode(data)
        else:
            # Assume it's raw base64
            image_data = base64.b64decode(image_base64)
        
        # Check if it's valid base64
        if len(image_data) == 0:
            return {'valid': False, 'error': 'Empty image data'}
        
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024
        if len(image_data) > max_size:
            return {'valid': False, 'error': f'Image too large (max {max_size / 1024 / 1024:.1f}MB)'}
        
        return {'valid': True, 'data': image_data}
        
    except Exception as e:
        return {'valid': False, 'error': f'Invalid base64 image: {str(e)}'}


def calculate_image_hash(image_data: bytes) -> str:
    """Calculate hash for image data"""
    return hashlib.sha256(image_data).hexdigest()


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"


def format_processing_time(seconds: float) -> str:
    """Format processing time in human readable format"""
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    else:
        minutes = int(seconds // 60)
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds:.1f}s"


def create_error_response(error_code: str, message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create standardized error response"""
    response = {
        'error': {
            'code': error_code,
            'message': message
        }
    }
    
    if details:
        response['error']['details'] = details
    
    return response


def create_success_response(data: Any, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create standardized success response"""
    response = {
        'success': True,
        'data': data
    }
    
    if metadata:
        response['metadata'] = metadata
    
    return response


def validate_environment() -> Dict[str, Any]:
    """Validate required environment variables"""
    required_vars = [
        'GEMINI_API_KEY',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    return {
        'valid': len(missing_vars) == 0,
        'missing_vars': missing_vars
    }


def get_processing_limits() -> Dict[str, Any]:
    """Get processing limits configuration"""
    return {
        'max_file_size': int(os.getenv('UPLOAD_MAX_SIZE', 50 * 1024 * 1024)),
        'max_processing_time': int(os.getenv('MAX_PROCESSING_TIME', 60)),
        'max_retries': int(os.getenv('MAX_RETRIES', 2)),
        'retry_delay': int(os.getenv('RETRY_DELAY', 5)),
        'max_images_per_request': int(os.getenv('MAX_IMAGES_PER_REQUEST', 5))
    }


def create_processing_stats() -> ProcessingStats:
    """Create new processing stats instance"""
    return ProcessingStats(start_time=time.time())


# Create global logger instance
logger = ProcessingLogger(os.getenv('LOG_LEVEL', 'INFO'))
