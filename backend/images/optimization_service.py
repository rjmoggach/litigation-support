from __future__ import annotations

"""
Image optimization service for automatic image processing during upload.

Responsibilities:
- Compress and optimize images for web delivery
- Handle EXIF data removal for privacy
- Convert images to optimal formats
- Resize oversized images
- Maintain quality while reducing file size
"""

import asyncio
import io
from typing import Tuple, Optional, Dict, Any
from PIL import Image as PILImage, ImageOps
# Use ImageOps.exif_transpose for automatic orientation handling
# piexif not needed - using PIL's built-in EXIF handling


class ImageOptimizationService:
    """Service for optimizing images during upload."""

    # Maximum dimensions for original images (to prevent excessive storage)
    MAX_ORIGINAL_WIDTH = 3840  # 4K width
    MAX_ORIGINAL_HEIGHT = 2160  # 4K height
    
    # Quality settings for different use cases
    QUALITY_SETTINGS = {
        'high': 95,      # For galleries and featured images
        'medium': 85,    # Default for most images  
        'low': 75,       # For thumbnails and previews
    }

    def __init__(self):
        pass

    async def optimize_image(
        self, 
        image_content: bytes, 
        quality: str = 'medium',
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
        remove_exif: bool = True,
        convert_format: Optional[str] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Optimize an image with various processing options.
        
        Args:
            image_content: Original image bytes
            quality: Quality setting ('high', 'medium', 'low')
            max_width: Maximum width (defaults to MAX_ORIGINAL_WIDTH)
            max_height: Maximum height (defaults to MAX_ORIGINAL_HEIGHT)
            remove_exif: Whether to remove EXIF data
            convert_format: Target format ('JPEG', 'PNG', 'WEBP', or None for auto)
            
        Returns:
            Tuple of (optimized_content, metadata_dict)
        """
        if max_width is None:
            max_width = self.MAX_ORIGINAL_WIDTH
        if max_height is None:
            max_height = self.MAX_ORIGINAL_HEIGHT

        # Run optimization in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._optimize_image_sync,
            image_content,
            quality,
            max_width,
            max_height,
            remove_exif,
            convert_format
        )

    def _optimize_image_sync(
        self,
        image_content: bytes,
        quality: str,
        max_width: int,
        max_height: int,
        remove_exif: bool,
        convert_format: Optional[str]
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Synchronous image optimization using PIL."""
        
        metadata = {
            'original_size': len(image_content),
            'original_format': None,
            'original_dimensions': None,
            'optimized_size': None,
            'optimized_format': None,
            'optimized_dimensions': None,
            'compression_ratio': None,
            'exif_removed': remove_exif,
            'resized': False
        }

        with PILImage.open(io.BytesIO(image_content)) as img:
            # Store original metadata
            metadata['original_format'] = img.format
            metadata['original_dimensions'] = img.size
            
            # Handle EXIF orientation before any processing
            img = ImageOps.exif_transpose(img)
            
            # Extract basic EXIF data using PIL's built-in capabilities
            exif_data = {}
            try:
                # Use PIL's _getexif() for basic metadata extraction
                exif_dict = img._getexif() if hasattr(img, '_getexif') else None
                if exif_dict:
                    # Extract common EXIF tags without external dependencies
                    exif_data = {
                        'camera_make': exif_dict.get(271),  # Make tag
                        'camera_model': exif_dict.get(272),  # Model tag
                        'datetime': exif_dict.get(306),  # DateTime tag
                    }
                    # Convert bytes to strings if needed
                    for key, value in exif_data.items():
                        if isinstance(value, bytes):
                            exif_data[key] = value.decode('utf-8', errors='ignore')
            except Exception:
                # Ignore EXIF errors - metadata extraction is not critical
                pass
            
            metadata['exif_data'] = exif_data
            
            # Resize if image is too large
            original_width, original_height = img.size
            if original_width > max_width or original_height > max_height:
                # Calculate new dimensions maintaining aspect ratio
                if original_width > original_height:
                    new_width = min(max_width, original_width)
                    new_height = int((original_height * new_width) / original_width)
                else:
                    new_height = min(max_height, original_height)
                    new_width = int((original_width * new_height) / original_height)
                
                img = img.resize((new_width, new_height), PILImage.Resampling.LANCZOS)
                metadata['resized'] = True
                metadata['optimized_dimensions'] = (new_width, new_height)
            else:
                metadata['optimized_dimensions'] = (original_width, original_height)
            
            # Convert color mode if necessary
            if img.mode not in ('RGB', 'L', 'RGBA'):
                if img.mode == 'P' and 'transparency' in img.info:
                    # Palette mode with transparency - convert to RGBA
                    img = img.convert('RGBA')
                elif img.mode == 'P':
                    # Palette mode without transparency - convert to RGB
                    img = img.convert('RGB')
                else:
                    # Other modes - convert to RGB
                    img = img.convert('RGB')
            
            # Determine optimal format
            target_format = self._determine_optimal_format(img, convert_format)
            metadata['optimized_format'] = target_format
            
            # Handle transparency for JPEG conversion
            if target_format == 'JPEG' and img.mode == 'RGBA':
                # Create white background for transparent images
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            
            # Prepare save parameters
            save_kwargs = self._get_save_parameters(target_format, quality)
            
            # Remove EXIF data if requested
            if remove_exif and 'exif' in save_kwargs:
                del save_kwargs['exif']
            
            # Save optimized image
            output = io.BytesIO()
            img.save(output, format=target_format, **save_kwargs)
            optimized_content = output.getvalue()
            
            # Update metadata
            metadata['optimized_size'] = len(optimized_content)
            metadata['compression_ratio'] = len(optimized_content) / len(image_content)
            
            return optimized_content, metadata

    def _determine_optimal_format(self, img: PILImage.Image, convert_format: Optional[str]) -> str:
        """Determine the optimal format for an image."""
        if convert_format:
            return convert_format.upper()
        
        # Auto-determine format based on image characteristics
        if img.mode == 'RGBA' or 'transparency' in img.info:
            # Image has transparency - use PNG
            return 'PNG'
        elif img.mode == 'L':
            # Grayscale - JPEG is fine
            return 'JPEG'
        else:
            # Color image - analyze for best format
            # For photos, JPEG is usually better
            # For graphics with few colors, PNG might be better
            # For now, default to JPEG for web optimization
            return 'JPEG'

    def _get_save_parameters(self, format: str, quality: str) -> Dict[str, Any]:
        """Get save parameters for different formats."""
        quality_value = self.QUALITY_SETTINGS.get(quality, self.QUALITY_SETTINGS['medium'])
        
        if format == 'JPEG':
            return {
                'quality': quality_value,
                'optimize': True,
                'progressive': True,  # Progressive JPEG for better perceived loading
            }
        elif format == 'PNG':
            return {
                'optimize': True,
                'compress_level': 6,  # Good compression without excessive CPU usage
            }
        elif format == 'WEBP':
            return {
                'quality': quality_value,
                'optimize': True,
                'method': 6,  # Good compression method
            }
        else:
            return {'optimize': True}

    async def optimize_for_web(self, image_content: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """
        Optimize image specifically for web delivery.
        Uses medium quality and removes EXIF data.
        """
        return await self.optimize_image(
            image_content,
            quality='medium',
            remove_exif=True,
            convert_format=None  # Auto-determine best format
        )

    async def optimize_for_gallery(self, image_content: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """
        Optimize image for gallery display.
        Uses high quality and preserves larger dimensions.
        """
        return await self.optimize_image(
            image_content,
            quality='high',
            max_width=2560,  # Larger max size for galleries
            max_height=1440,
            remove_exif=True
        )

    async def optimize_for_thumbnail(self, image_content: bytes, max_size: int = 600) -> Tuple[bytes, Dict[str, Any]]:
        """
        Optimize image for thumbnail use.
        Uses lower quality and smaller dimensions.
        """
        return await self.optimize_image(
            image_content,
            quality='low',
            max_width=max_size,
            max_height=max_size,
            remove_exif=True,
            convert_format='JPEG'  # Force JPEG for thumbnails
        )