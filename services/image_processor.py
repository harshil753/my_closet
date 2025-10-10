"""
Image Processing Service for My Closet Virtual Try-On

This service handles image compression, optimization, and processing for clothing items
and user base photos. It uses Pillow (PIL) for image manipulation and provides
functions for resizing, compressing, and generating thumbnails.

Key Features:
- Image compression with quality optimization
- Thumbnail generation for fast loading
- Format conversion and validation
- Metadata extraction
- Batch processing capabilities
"""

import os
import io
import logging
from typing import Dict, List, Optional, Tuple, Union
from pathlib import Path
from PIL import Image, ImageOps, ExifTags
from PIL.ExifTags import TAGS
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageProcessor:
    """
    Main image processing class that handles compression, resizing, and optimization
    """
    
    # Image quality settings for different use cases
    QUALITY_SETTINGS = {
        'thumbnail': {'quality': 85, 'max_size': (300, 300)},
        'preview': {'quality': 90, 'max_size': (800, 800)},
        'full': {'quality': 95, 'max_size': (2048, 2048)},
        'compressed': {'quality': 80, 'max_size': (1024, 1024)}
    }
    
    # Supported image formats
    SUPPORTED_FORMATS = ['JPEG', 'PNG', 'WEBP']
    
    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        'clothing_item': 50 * 1024 * 1024,  # 50MB
        'base_photo': 10 * 1024 * 1024,     # 10MB
        'thumbnail': 500 * 1024             # 500KB
    }
    
    def __init__(self):
        """Initialize the image processor with default settings"""
        self.temp_dir = Path("temp_images")
        self.temp_dir.mkdir(exist_ok=True)
    
    def process_clothing_image(
        self, 
        image_path: Union[str, Path], 
        output_dir: Union[str, Path],
        item_name: str
    ) -> Dict[str, str]:
        """
        Process a clothing item image with compression and thumbnail generation
        
        Args:
            image_path: Path to the source image
            output_dir: Directory to save processed images
            item_name: Name of the clothing item (used for file naming)
            
        Returns:
            Dictionary with paths to processed images and metadata
        """
        try:
            # Validate input
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Load and validate image
            with Image.open(image_path) as img:
                # Check file size
                file_size = os.path.getsize(image_path)
                if file_size > self.MAX_FILE_SIZES['clothing_item']:
                    raise ValueError(f"Image too large: {file_size} bytes (max: {self.MAX_FILE_SIZES['clothing_item']})")
                
                # Extract metadata
                metadata = self._extract_metadata(img)
                
                # Process main image (compressed for storage)
                main_image_path = self._process_main_image(
                    img, output_dir, item_name, 'compressed'
                )
                
                # Generate thumbnail
                thumbnail_path = self._generate_thumbnail(
                    img, output_dir, item_name
                )
                
                # Generate preview image
                preview_path = self._generate_preview(
                    img, output_dir, item_name
                )
                
                return {
                    'main_image': str(main_image_path),
                    'thumbnail': str(thumbnail_path),
                    'preview': str(preview_path),
                    'metadata': metadata,
                    'original_size': file_size,
                    'processed_size': os.path.getsize(main_image_path)
                }
                
        except Exception as e:
            logger.error(f"Error processing clothing image {image_path}: {str(e)}")
            raise
    
    def process_base_photo(
        self, 
        image_path: Union[str, Path], 
        output_dir: Union[str, Path],
        photo_type: str,
        user_id: str
    ) -> Dict[str, str]:
        """
        Process a user base photo with specific requirements for AI processing
        
        Args:
            image_path: Path to the source image
            output_dir: Directory to save processed images
            photo_type: Type of base photo ('front', 'side', 'full_body')
            user_id: User ID for file naming
            
        Returns:
            Dictionary with paths to processed images and metadata
        """
        try:
            # Validate input
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Base photo not found: {image_path}")
            
            # Load and validate image
            with Image.open(image_path) as img:
                # Check file size
                file_size = os.path.getsize(image_path)
                if file_size > self.MAX_FILE_SIZES['base_photo']:
                    raise ValueError(f"Base photo too large: {file_size} bytes (max: {self.MAX_FILE_SIZES['base_photo']})")
                
                # Validate minimum dimensions for AI processing
                if img.width < 512 or img.height < 512:
                    raise ValueError(f"Base photo too small: {img.width}x{img.height} (minimum: 512x512)")
                
                # Extract metadata
                metadata = self._extract_metadata(img)
                
                # Process main image (high quality for AI)
                main_image_path = self._process_main_image(
                    img, output_dir, f"{user_id}_{photo_type}", 'full'
                )
                
                # Generate thumbnail for UI
                thumbnail_path = self._generate_thumbnail(
                    img, output_dir, f"{user_id}_{photo_type}"
                )
                
                return {
                    'main_image': str(main_image_path),
                    'thumbnail': str(thumbnail_path),
                    'metadata': metadata,
                    'original_size': file_size,
                    'processed_size': os.path.getsize(main_image_path),
                    'photo_type': photo_type
                }
                
        except Exception as e:
            logger.error(f"Error processing base photo {image_path}: {str(e)}")
            raise
    
    def _process_main_image(
        self, 
        img: Image.Image, 
        output_dir: Path, 
        filename: str, 
        quality_setting: str
    ) -> Path:
        """
        Process the main image with specified quality settings
        
        Args:
            img: PIL Image object
            output_dir: Output directory
            filename: Base filename (without extension)
            quality_setting: Quality setting from QUALITY_SETTINGS
            
        Returns:
            Path to the processed image
        """
        settings = self.QUALITY_SETTINGS[quality_setting]
        
        # Convert to RGB if necessary (for JPEG output)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if necessary
        if img.size[0] > settings['max_size'][0] or img.size[1] > settings['max_size'][1]:
            img.thumbnail(settings['max_size'], Image.Resampling.LANCZOS)
        
        # Auto-orient based on EXIF data
        img = ImageOps.exif_transpose(img)
        
        # Save with specified quality
        output_path = output_dir / f"{filename}_main.jpg"
        img.save(output_path, 'JPEG', quality=settings['quality'], optimize=True)
        
        return output_path
    
    def _generate_thumbnail(
        self, 
        img: Image.Image, 
        output_dir: Path, 
        filename: str
    ) -> Path:
        """
        Generate a thumbnail image for fast loading
        
        Args:
            img: PIL Image object
            output_dir: Output directory
            filename: Base filename (without extension)
            
        Returns:
            Path to the thumbnail image
        """
        settings = self.QUALITY_SETTINGS['thumbnail']
        
        # Create thumbnail
        thumbnail = img.copy()
        thumbnail.thumbnail(settings['max_size'], Image.Resampling.LANCZOS)
        
        # Auto-orient
        thumbnail = ImageOps.exif_transpose(thumbnail)
        
        # Save thumbnail
        thumbnail_path = output_dir / f"{filename}_thumb.jpg"
        thumbnail.save(thumbnail_path, 'JPEG', quality=settings['quality'], optimize=True)
        
        return thumbnail_path
    
    def _generate_preview(
        self, 
        img: Image.Image, 
        output_dir: Path, 
        filename: str
    ) -> Path:
        """
        Generate a preview image for UI display
        
        Args:
            img: PIL Image object
            output_dir: Output directory
            filename: Base filename (without extension)
            
        Returns:
            Path to the preview image
        """
        settings = self.QUALITY_SETTINGS['preview']
        
        # Create preview
        preview = img.copy()
        preview.thumbnail(settings['max_size'], Image.Resampling.LANCZOS)
        
        # Auto-orient
        preview = ImageOps.exif_transpose(preview)
        
        # Save preview
        preview_path = output_dir / f"{filename}_preview.jpg"
        preview.save(preview_path, 'JPEG', quality=settings['quality'], optimize=True)
        
        return preview_path
    
    def _extract_metadata(self, img: Image.Image) -> Dict:
        """
        Extract metadata from image including EXIF data
        
        Args:
            img: PIL Image object
            
        Returns:
            Dictionary with image metadata
        """
        metadata = {
            'width': img.width,
            'height': img.height,
            'mode': img.mode,
            'format': img.format,
            'size_bytes': len(img.tobytes()),
            'created_at': datetime.now().isoformat()
        }
        
        # Extract EXIF data if available
        if hasattr(img, '_getexif') and img._getexif() is not None:
            exif_data = {}
            exif = img._getexif()
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                exif_data[tag] = value
            metadata['exif'] = exif_data
        
        return metadata
    
    def validate_image(self, image_path: Union[str, Path]) -> Dict[str, Union[bool, str, int]]:
        """
        Validate an image file for upload requirements
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with validation results
        """
        try:
            if not os.path.exists(image_path):
                return {'valid': False, 'error': 'File not found'}
            
            # Check file size
            file_size = os.path.getsize(image_path)
            
            with Image.open(image_path) as img:
                # Check format
                if img.format not in self.SUPPORTED_FORMATS:
                    return {
                        'valid': False, 
                        'error': f'Unsupported format: {img.format}. Supported: {", ".join(self.SUPPORTED_FORMATS)}'
                    }
                
                # Check dimensions
                if img.width < 100 or img.height < 100:
                    return {
                        'valid': False,
                        'error': f'Image too small: {img.width}x{img.height}. Minimum: 100x100'
                    }
                
                # Check if image can be processed
                try:
                    img.verify()
                except Exception as e:
                    return {
                        'valid': False,
                        'error': f'Corrupted image: {str(e)}'
                    }
                
                return {
                    'valid': True,
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'size_bytes': file_size,
                    'mode': img.mode
                }
                
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}
    
    def batch_process_images(
        self, 
        image_paths: List[Union[str, Path]], 
        output_dir: Union[str, Path],
        process_type: str = 'clothing'
    ) -> List[Dict[str, str]]:
        """
        Process multiple images in batch
        
        Args:
            image_paths: List of image file paths
            output_dir: Output directory
            process_type: Type of processing ('clothing' or 'base_photo')
            
        Returns:
            List of processing results
        """
        results = []
        
        for i, image_path in enumerate(image_paths):
            try:
                if process_type == 'clothing':
                    result = self.process_clothing_image(
                        image_path, output_dir, f"item_{i+1}"
                    )
                elif process_type == 'base_photo':
                    result = self.process_base_photo(
                        image_path, output_dir, f"photo_{i+1}", f"user_{i+1}"
                    )
                else:
                    raise ValueError(f"Unknown process type: {process_type}")
                
                results.append({
                    'success': True,
                    'input_path': str(image_path),
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Error processing image {image_path}: {str(e)}")
                results.append({
                    'success': False,
                    'input_path': str(image_path),
                    'error': str(e)
                })
        
        return results
    
    def cleanup_temp_files(self):
        """Clean up temporary files"""
        try:
            if self.temp_dir.exists():
                for file in self.temp_dir.iterdir():
                    if file.is_file():
                        file.unlink()
                logger.info("Temporary files cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")


# Utility functions for easy integration
def process_clothing_image(image_path: str, output_dir: str, item_name: str) -> Dict[str, str]:
    """
    Convenience function to process a single clothing image
    
    Args:
        image_path: Path to the source image
        output_dir: Directory to save processed images
        item_name: Name of the clothing item
        
    Returns:
        Dictionary with processing results
    """
    processor = ImageProcessor()
    return processor.process_clothing_image(image_path, output_dir, item_name)


def process_base_photo(image_path: str, output_dir: str, photo_type: str, user_id: str) -> Dict[str, str]:
    """
    Convenience function to process a single base photo
    
    Args:
        image_path: Path to the source image
        output_dir: Directory to save processed images
        photo_type: Type of base photo
        user_id: User ID
        
    Returns:
        Dictionary with processing results
    """
    processor = ImageProcessor()
    return processor.process_base_photo(image_path, output_dir, photo_type, user_id)


def validate_image(image_path: str) -> Dict[str, Union[bool, str, int]]:
    """
    Convenience function to validate an image
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary with validation results
    """
    processor = ImageProcessor()
    return processor.validate_image(image_path)


if __name__ == "__main__":
    # Example usage
    processor = ImageProcessor()
    
    # Process a clothing image
    try:
        result = processor.process_clothing_image(
            "sample_clothing.jpg", 
            "output", 
            "blue_shirt"
        )
        print("Processing result:", result)
    except Exception as e:
        print(f"Error: {e}")
    
    # Clean up
    processor.cleanup_temp_files()