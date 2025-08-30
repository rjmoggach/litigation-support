from __future__ import annotations

"""
Thumbnail service for image thumbnails.

Responsibilities:
- Generate thumbnails from original images in three sizes (150px, 300px, 600px)
- Handle image optimization and format conversion
- Integrate with storage backend for thumbnail persistence
- Provide async thumbnail generation for performance
"""

import asyncio
import io
from typing import Optional, Tuple, Dict
from sqlalchemy.orm import Session
from PIL import Image as PILImage, ImageOps
# Use ImageOps.exif_transpose for automatic orientation handling

from core.storage import get_storage_instance
from storage.models import StoredFile
from users.models import UserProfile
from users.services import update_storage_usage

from . import models as m
from .utils import generate_thumbnail_path


class ImageThumbnailService:
    """Service for generating and managing image thumbnails."""

    # Thumbnail sizes in pixels (max dimension)
    THUMBNAIL_SIZES = {
        'sm': 150,  # Small thumbnails
        'md': 300,  # Medium thumbnails  
        'lg': 600,  # Large thumbnails
    }

    def __init__(self, db: Session):
        self.db = db

    async def generate_thumbnails_for_image(self, image: m.Image) -> Dict[str, int]:
        """
        Generate all three thumbnail sizes for an image.
        
        Returns dict mapping size ('sm', 'md', 'lg') to StoredFile IDs.
        """
        if not image.stored_file_id:
            raise ValueError("Image has no stored file")

        # Get original stored file
        original_file = self.db.query(StoredFile).filter(
            StoredFile.id == image.stored_file_id
        ).first()
        
        if not original_file:
            raise ValueError("Original file not found")

        # Download original image content
        storage = get_storage_instance()
        try:
            original_content = await storage.get(original_file.file_path)
        except Exception as e:
            raise ValueError(f"Failed to download original image: {e}")

        # Generate thumbnails
        thumbnail_ids = {}
        
        for size_key, max_dimension in self.THUMBNAIL_SIZES.items():
            try:
                thumbnail_content, thumbnail_width, thumbnail_height = await self._generate_single_thumbnail(
                    original_content, max_dimension
                )
                
                # Generate thumbnail path
                thumbnail_path = generate_thumbnail_path(
                    original_file.file_path,
                    size_key,
                    original_file.original_filename
                )
                
                # Upload thumbnail to storage
                await storage.put(thumbnail_path, thumbnail_content)
                
                # Create StoredFile record for thumbnail
                thumbnail_file = StoredFile(
                    filename=f"{original_file.filename.rsplit('.', 1)[0]}-{size_key}.{original_file.filename.rsplit('.', 1)[1]}" if '.' in original_file.filename else f"{original_file.filename}-{size_key}",
                    original_filename=f"{original_file.original_filename.rsplit('.', 1)[0]}-{size_key}.{original_file.original_filename.rsplit('.', 1)[1]}" if '.' in original_file.original_filename else f"{original_file.original_filename}-{size_key}",
                    file_path=thumbnail_path,
                    file_size=len(thumbnail_content),
                    content_type=original_file.content_type,
                    dropbox_path=thumbnail_path,
                    user_profile_id=original_file.user_profile_id,
                    category="thumbnails"
                )
                
                self.db.add(thumbnail_file)
                self.db.flush()  # Get the ID
                
                # Update user's storage usage
                user_profile = self.db.query(UserProfile).filter(
                    UserProfile.id == original_file.user_profile_id
                ).first()
                if user_profile:
                    update_storage_usage(self.db, user_profile, len(thumbnail_content))
                
                thumbnail_ids[size_key] = thumbnail_file.id
                
            except Exception as e:
                print(f"Error generating {size_key} thumbnail for image {image.id}: {e}")
                # Continue with other sizes even if one fails
                continue

        # Update image model with thumbnail IDs
        if 'sm' in thumbnail_ids:
            image.thumbnail_sm_id = thumbnail_ids['sm']
        if 'md' in thumbnail_ids:
            image.thumbnail_md_id = thumbnail_ids['md']
        if 'lg' in thumbnail_ids:
            image.thumbnail_lg_id = thumbnail_ids['lg']

        self.db.commit()
        return thumbnail_ids

    async def _generate_single_thumbnail(self, image_content: bytes, max_dimension: int) -> Tuple[bytes, int, int]:
        """
        Generate a single thumbnail from image content.
        
        Returns (thumbnail_content, width, height)
        """
        # Run PIL processing in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            self._process_thumbnail_sync, 
            image_content, 
            max_dimension
        )

    def _process_thumbnail_sync(self, image_content: bytes, max_dimension: int) -> Tuple[bytes, int, int]:
        """
        Synchronous thumbnail processing using PIL.
        """
        # Open image with PIL
        with PILImage.open(io.BytesIO(image_content)) as img:
            # Handle EXIF orientation
            img = ImageOps.exif_transpose(img)
            
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode not in ('RGB', 'L'):
                if img.mode == 'RGBA':
                    # Create white background for transparent images
                    background = PILImage.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                else:
                    img = img.convert('RGB')
            
            # Calculate thumbnail size maintaining aspect ratio
            original_width, original_height = img.size
            
            if original_width <= max_dimension and original_height <= max_dimension:
                # Image is already smaller than thumbnail size
                thumbnail = img.copy()
            else:
                # Calculate new dimensions
                if original_width > original_height:
                    new_width = max_dimension
                    new_height = int((original_height * max_dimension) / original_width)
                else:
                    new_height = max_dimension
                    new_width = int((original_width * max_dimension) / original_height)
                
                # Resize with high-quality resampling
                thumbnail = img.resize((new_width, new_height), PILImage.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            
            # Determine format - prefer JPEG for photos, PNG for graphics
            if img.mode == 'L':
                # Grayscale - save as JPEG
                format_to_use = 'JPEG'
                save_kwargs = {'quality': 85, 'optimize': True}
            else:
                # Color - save as JPEG for efficiency
                format_to_use = 'JPEG'
                save_kwargs = {'quality': 85, 'optimize': True}
            
            thumbnail.save(output, format=format_to_use, **save_kwargs)
            thumbnail_content = output.getvalue()
            
            return thumbnail_content, thumbnail.width, thumbnail.height

    async def delete_thumbnails_for_image(self, image: m.Image) -> None:
        """Delete all thumbnails for an image from storage and database."""
        storage = get_storage_instance()
        
        # Get all thumbnail file IDs
        thumbnail_ids = []
        if image.thumbnail_sm_id:
            thumbnail_ids.append(image.thumbnail_sm_id)
        if image.thumbnail_md_id:
            thumbnail_ids.append(image.thumbnail_md_id)
        if image.thumbnail_lg_id:
            thumbnail_ids.append(image.thumbnail_lg_id)
        
        for thumbnail_id in thumbnail_ids:
            try:
                # Get stored file record
                thumbnail_file = self.db.query(StoredFile).filter(
                    StoredFile.id == thumbnail_id
                ).first()
                
                if thumbnail_file:
                    # Delete from storage
                    await storage.delete(thumbnail_file.file_path)
                    
                    # Update user's storage usage
                    user_profile = self.db.query(UserProfile).filter(
                        UserProfile.id == thumbnail_file.user_profile_id
                    ).first()
                    if user_profile and thumbnail_file.file_size:
                        update_storage_usage(self.db, user_profile, -thumbnail_file.file_size)
                    
                    # Delete database record
                    self.db.delete(thumbnail_file)
                
            except Exception as e:
                print(f"Error deleting thumbnail {thumbnail_id}: {e}")
                # Continue with other thumbnails
                continue
        
        # Clear thumbnail references from image
        image.thumbnail_sm_id = None
        image.thumbnail_md_id = None
        image.thumbnail_lg_id = None
        
        self.db.commit()

    async def regenerate_thumbnails_for_image(self, image: m.Image) -> Dict[str, int]:
        """Regenerate all thumbnails for an image (delete old ones first)."""
        # Delete existing thumbnails
        await self.delete_thumbnails_for_image(image)
        
        # Generate new thumbnails
        return await self.generate_thumbnails_for_image(image)