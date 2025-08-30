from __future__ import annotations

import re
import unicodedata
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
# from PIL import Image as PILImage  # TODO: Add PIL to dependencies when implementing thumbnail generation

from core.storage import get_storage_instance
from storage.models import StoredFile
from tags.services import TagService
from users.models import UserProfile
from users.services import update_storage_usage

from . import models as m
from . import schemas as s
from .utils import generate_image_upload_path, generate_thumbnail_path, get_cloudfront_url
from .thumbnail_service import ImageThumbnailService
from .optimization_service import ImageOptimizationService


def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug from text"""
    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    # Convert to ASCII
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Convert to lowercase and replace spaces/special chars with hyphens
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text




class ImageService:
    def __init__(self, db: Session):
        self.db = db
        self.thumbnail_service = ImageThumbnailService(db)
        self.optimization_service = ImageOptimizationService()

    def _build_image_response(self, image: m.Image) -> s.ImageResponse:
        """Build enriched image response with CloudFront URLs and tags"""
        # Get CloudFront URLs for all image variants
        cloudfront_url = None
        thumbnail_sm_url = None
        thumbnail_md_url = None
        thumbnail_lg_url = None
        
        if image.stored_file_id:
            stored_file = self.db.query(StoredFile).filter(
                StoredFile.id == image.stored_file_id
            ).first()
            if stored_file:
                cloudfront_url = get_cloudfront_url(stored_file.file_path)
        
        # Get thumbnail URLs
        for size, field in [
            ("sm", "thumbnail_sm_id"), 
            ("md", "thumbnail_md_id"), 
            ("lg", "thumbnail_lg_id")
        ]:
            thumb_id = getattr(image, field)
            if thumb_id:
                thumb_file = self.db.query(StoredFile).filter(
                    StoredFile.id == thumb_id
                ).first()
                if thumb_file:
                    thumb_url = get_cloudfront_url(thumb_file.file_path)
                    if size == "sm":
                        thumbnail_sm_url = thumb_url
                    elif size == "md":
                        thumbnail_md_url = thumb_url
                    elif size == "lg":
                        thumbnail_lg_url = thumb_url
        
        # Get tag objects for rich display
        tag_service = TagService(self.db)
        image_tags = image.get_tags(self.db)
        tag_objects = [tag_service._tag_to_response(tag) for tag in image_tags]
        
        return s.ImageResponse(
            id=image.id,
            stored_file_id=image.stored_file_id,
            title=image.title,
            alt_text=image.alt_text,
            description=image.description,
            tags=image.tags if hasattr(image, 'tags') else None,  # Legacy string tags
            width=image.width,
            height=image.height,
            thumbnail_sm_id=image.thumbnail_sm_id,
            thumbnail_md_id=image.thumbnail_md_id,
            thumbnail_lg_id=image.thumbnail_lg_id,
            user_profile_id=image.user_profile_id,
            created_at=image.created_at,
            updated_at=image.updated_at,
            tag_objects=tag_objects,
            cloudfront_url=cloudfront_url,
            thumbnail_sm_url=thumbnail_sm_url,
            thumbnail_md_url=thumbnail_md_url,
            thumbnail_lg_url=thumbnail_lg_url,
        )

    def _get_image(self, image_id: int) -> m.Image | None:
        return self.db.query(m.Image).filter(m.Image.id == image_id).first()

    async def list_images(self, skip: int = 0, limit: int = 20, tags: Optional[List[str]] = None, user_profile_id: Optional[int] = None) -> list[s.ImageResponse]:
        query = self.db.query(m.Image)
        
        # Filter by user if provided
        if user_profile_id:
            query = query.filter(m.Image.user_profile_id == user_profile_id)
        
        # Filter by tags if provided
        if tags:
            from tags.models import Tag, TaggedItem, ContentType
            
            # Get content type for images
            content_type = self.db.query(ContentType).filter(
                ContentType.app_label == "images",
                ContentType.model == "image"
            ).first()
            
            if content_type:
                # Filter images that have at least one of the specified tags
                tag_ids = self.db.query(Tag.id).filter(Tag.name.in_(tags)).subquery()
                
                query = query.join(
                    TaggedItem,
                    (TaggedItem.object_id == m.Image.id) & 
                    (TaggedItem.content_type_id == content_type.id)
                ).filter(TaggedItem.tag_id.in_(tag_ids)).distinct()
        
        images = (
            query
            .order_by(m.Image.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [self._build_image_response(image) for image in images]

    async def get_image(self, image_id: int) -> s.ImageResponse | None:
        image = self._get_image(image_id)
        return self._build_image_response(image) if image else None

    async def create_image(self, payload: s.ImageCreate, user_profile_id: int, gallery_id: Optional[int] = None) -> s.ImageResponse:
        # Get image dimensions from stored file
        width, height = await self._get_image_dimensions(payload.stored_file_id)
        
        image = m.Image(
            stored_file_id=payload.stored_file_id,
            title=payload.title,
            alt_text=payload.alt_text,
            description=payload.description,
            width=width,
            height=height,
            user_profile_id=user_profile_id,
        )

        self.db.add(image)
        self.db.flush()  # Get image.id for tags

        # Handle tags if provided
        if payload.tags:
            tag_service = TagService(self.db)
            try:
                tag_service.tag_object(
                    content_type="images.image",
                    object_id=image.id,
                    tag_names=payload.tags
                )
            except Exception as e:
                # Log error but don't fail image creation
                print(f"Warning: Failed to tag image {image.id}: {e}")

        self.db.commit()
        self.db.refresh(image)
        
        # Generate thumbnails asynchronously
        import asyncio
        asyncio.create_task(self._generate_thumbnails_background(image.id))
        
        return self._build_image_response(image)

    async def update_image(self, image_id: int, payload: s.ImageUpdate) -> s.ImageResponse:
        image = self._get_image(image_id)
        if image is None:
            raise ValueError("Image not found")

        # Update basic fields
        data = payload.model_dump(exclude_unset=True)
        
        # Handle tags separately
        tags_to_update = None
        if 'tags' in data:
            tags_to_update = data.pop('tags')
        
        for field, value in data.items():
            setattr(image, field, value)
        
        # Update tags using the tagging service
        if tags_to_update is not None:
            tag_service = TagService(self.db)
            try:
                # Clear existing tags and set new ones
                image.clear_tags(self.db)
                if tags_to_update:
                    tag_service.tag_object(
                        content_type="images.image",
                        object_id=image.id,
                        tag_names=tags_to_update
                    )
            except Exception as e:
                # Log error but don't fail image update
                print(f"Warning: Failed to update tags for image {image.id}: {e}")

        self.db.commit()
        self.db.refresh(image)
        return self._build_image_response(image)

    async def delete_image(self, image_id: int) -> None:
        image = self._get_image(image_id)
        if image is None:
            return
        self.db.delete(image)
        self.db.commit()

    async def _get_image_dimensions(self, stored_file_id: int) -> Tuple[Optional[int], Optional[int]]:
        """Extract image dimensions from stored file"""
        try:
            stored_file = self.db.query(StoredFile).filter(
                StoredFile.id == stored_file_id
            ).first()
            
            if not stored_file:
                return None, None
            
            # Get file content and extract dimensions
            metadata = await self.extract_image_metadata(stored_file_id)
            if metadata and 'dimensions' in metadata:
                return metadata['dimensions']['width'], metadata['dimensions']['height']
            
            return None, None
        except Exception as e:
            print(f"Warning: Failed to get image dimensions for file {stored_file_id}: {e}")
            return None, None

    async def extract_image_metadata(self, stored_file_id: int) -> Optional[dict]:
        """
        Extract comprehensive metadata from an image file.
        
        Returns dict with:
        - dimensions: width, height
        - format: image format
        - mode: color mode
        - exif: EXIF data (if available)
        - file_info: file size, content type
        """
        try:
            stored_file = self.db.query(StoredFile).filter(
                StoredFile.id == stored_file_id
            ).first()
            
            if not stored_file:
                return None
            
            # Download file content
            storage = get_storage_instance()
            image_content = await storage.get(stored_file.file_path)
            
            # Run metadata extraction in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                self._extract_metadata_sync,
                image_content,
                stored_file
            )
            
        except Exception as e:
            print(f"Error extracting metadata for file {stored_file_id}: {e}")
            return None

    def _extract_metadata_sync(self, image_content: bytes, stored_file: StoredFile) -> dict:
        """Synchronous metadata extraction using PIL."""
        # Import here to avoid dependency issues if PIL not available
        try:
            from PIL import Image as PILImage
            from PIL.ExifTags import TAGS, GPSTAGS
            import piexif
        except ImportError:
            print("PIL not available for metadata extraction")
            return {}
        
        metadata = {
            'file_info': {
                'filename': stored_file.original_filename,
                'file_size': stored_file.file_size,
                'content_type': stored_file.content_type,
                'file_path': stored_file.file_path
            }
        }
        
        try:
            with PILImage.open(io.BytesIO(image_content)) as img:
                # Basic image information
                metadata['dimensions'] = {
                    'width': img.width,
                    'height': img.height
                }
                metadata['format'] = img.format
                metadata['mode'] = img.mode
                
                # Calculate aspect ratio
                if img.height > 0:
                    metadata['aspect_ratio'] = round(img.width / img.height, 3)
                
                # Extract EXIF data
                exif_data = {}
                if hasattr(img, '_getexif') and img._getexif() is not None:
                    try:
                        exif_dict = piexif.load(img.info.get('exif', b''))
                        
                        # Process basic EXIF data
                        if '0th' in exif_dict:
                            for tag_id, value in exif_dict['0th'].items():
                                tag = TAGS.get(tag_id, tag_id)
                                if isinstance(value, bytes):
                                    try:
                                        value = value.decode('utf-8', errors='ignore')
                                    except:
                                        value = str(value)
                                exif_data[tag] = value
                        
                        # Process EXIF-specific data
                        if 'Exif' in exif_dict:
                            for tag_id, value in exif_dict['Exif'].items():
                                tag = TAGS.get(tag_id, tag_id)
                                if isinstance(value, bytes):
                                    try:
                                        value = value.decode('utf-8', errors='ignore')
                                    except:
                                        value = str(value)
                                exif_data[tag] = value
                        
                        # Process GPS data
                        if 'GPS' in exif_dict and exif_dict['GPS']:
                            gps_data = {}
                            for tag_id, value in exif_dict['GPS'].items():
                                tag = GPSTAGS.get(tag_id, tag_id)
                                gps_data[tag] = value
                            if gps_data:
                                exif_data['GPS'] = gps_data
                                
                    except Exception as e:
                        print(f"Error processing EXIF data: {e}")
                
                metadata['exif'] = exif_data
                
                # Extract color profile information
                if hasattr(img, 'info'):
                    if 'icc_profile' in img.info:
                        metadata['has_color_profile'] = True
                    if 'transparency' in img.info:
                        metadata['has_transparency'] = True
                
                # Calculate estimated quality for JPEG
                if img.format == 'JPEG':
                    # Rough quality estimation based on file size vs dimensions
                    pixel_count = img.width * img.height
                    if pixel_count > 0:
                        bytes_per_pixel = len(image_content) / pixel_count
                        if bytes_per_pixel > 3:
                            estimated_quality = 'high'
                        elif bytes_per_pixel > 1.5:
                            estimated_quality = 'medium'
                        else:
                            estimated_quality = 'low'
                        metadata['estimated_quality'] = estimated_quality
                
                # Extract common EXIF fields for easy access
                camera_info = {}
                if exif_data:
                    camera_info = {
                        'make': exif_data.get('Make', ''),
                        'model': exif_data.get('Model', ''),
                        'datetime': exif_data.get('DateTimeOriginal', exif_data.get('DateTime', '')),
                        'software': exif_data.get('Software', ''),
                        'orientation': exif_data.get('Orientation', 1)
                    }
                metadata['camera_info'] = camera_info
                
        except Exception as e:
            print(f"Error extracting image metadata: {e}")
            metadata['error'] = str(e)
        
        return metadata

    async def _generate_thumbnails_background(self, image_id: int):
        """Background task to generate thumbnails without blocking image creation."""
        try:
            # Create a new DB session for the background task
            from core.database import SessionLocal
            with SessionLocal() as bg_db:
                # Create thumbnail service with background session
                bg_thumbnail_service = ImageThumbnailService(bg_db)
                
                image = bg_db.query(m.Image).filter(m.Image.id == image_id).first()
                if image:
                    # Generate thumbnails in three sizes (150px, 300px, 600px)
                    thumbnail_ids = await bg_thumbnail_service.generate_thumbnails_for_image(image)
                    print(f"Generated thumbnails for image {image_id}: {thumbnail_ids}")
        except Exception as e:
            # Log error but don't fail
            print(f"Background thumbnail generation failed for image {image_id}: {e}")

    async def get_stats(self) -> dict:
        total = self.db.query(m.Image).count()
        return {"total": total}

    def get_upload_path_for_image(self, filename: str, gallery_id: Optional[int] = None) -> str:
        """
        Generate the correct upload path for an image based on gallery association.
        
        Gallery images: /images/galleries/<gallery-slug>/<filename>
        Non-gallery images: /images/<year>/<month>/<filename>
        """
        gallery_slug = None
        if gallery_id:
            # Get gallery slug from database
            from galleries.models import Gallery
            gallery = self.db.query(Gallery).filter(Gallery.id == gallery_id).first()
            if gallery and gallery.slug:
                gallery_slug = gallery.slug
        
        return generate_image_upload_path(
            filename=filename,
            gallery_id=gallery_id,
            gallery_slug=gallery_slug
        )

    def get_thumbnail_paths_for_image(self, original_path: str, filename: str) -> dict[str, str]:
        """
        Generate thumbnail paths for all three sizes.
        
        Returns dict with 'sm', 'md', 'lg' keys mapping to thumbnail paths.
        """
        return {
            'sm': generate_thumbnail_path(original_path, 'sm', filename),
            'md': generate_thumbnail_path(original_path, 'md', filename),
            'lg': generate_thumbnail_path(original_path, 'lg', filename),
        }

    async def regenerate_thumbnails(self, image_id: int) -> dict:
        """Regenerate thumbnails for an image."""
        image = self._get_image(image_id)
        if not image:
            raise ValueError("Image not found")
        
        try:
            thumbnail_ids = await self.thumbnail_service.regenerate_thumbnails_for_image(image)
            return {"success": True, "thumbnail_ids": thumbnail_ids}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def optimize_image_content(self, image_content: bytes, optimization_type: str = 'web') -> Tuple[bytes, dict]:
        """
        Optimize image content using the optimization service.
        
        Args:
            image_content: Raw image bytes
            optimization_type: 'web', 'gallery', or 'thumbnail'
        
        Returns:
            Tuple of (optimized_content, metadata)
        """
        if optimization_type == 'gallery':
            return await self.optimization_service.optimize_for_gallery(image_content)
        elif optimization_type == 'thumbnail':
            return await self.optimization_service.optimize_for_thumbnail(image_content)
        else:
            return await self.optimization_service.optimize_for_web(image_content)

    async def bulk_upload_images(
        self, 
        image_payloads: List[s.ImageCreate], 
        user_profile_id: int, 
        gallery_id: Optional[int] = None,
        generate_thumbnails: bool = True
    ) -> dict:
        """
        Process bulk image uploads efficiently.
        
        Args:
            image_payloads: List of ImageCreate payloads
            user_profile_id: User profile ID
            gallery_id: Optional gallery to add images to
            generate_thumbnails: Whether to generate thumbnails asynchronously
            
        Returns:
            Dict with success/failed results and progress tracking
        """
        results = {
            "success": [],
            "failed": [],
            "total": len(image_payloads),
            "processed": 0,
            "gallery_id": gallery_id
        }
        
        created_images = []
        
        try:
            # Process images in batches to avoid overwhelming the database
            batch_size = 10
            for i in range(0, len(image_payloads), batch_size):
                batch = image_payloads[i:i + batch_size]
                
                for payload in batch:
                    try:
                        # Create image without async thumbnail generation initially
                        width, height = await self._get_image_dimensions(payload.stored_file_id)
                        
                        image = m.Image(
                            stored_file_id=payload.stored_file_id,
                            title=payload.title,
                            alt_text=payload.alt_text,
                            description=payload.description,
                            width=width,
                            height=height,
                            user_profile_id=user_profile_id,
                        )

                        self.db.add(image)
                        self.db.flush()  # Get image.id
                        
                        # Handle tags if provided
                        if payload.tags:
                            tag_service = TagService(self.db)
                            try:
                                tag_service.tag_object(
                                    content_type="images.image",
                                    object_id=image.id,
                                    tag_names=payload.tags
                                )
                            except Exception as e:
                                print(f"Warning: Failed to tag image {image.id}: {e}")
                        
                        created_images.append(image)
                        results["success"].append({
                            "id": image.id,
                            "title": image.title,
                            "stored_file_id": image.stored_file_id
                        })
                        results["processed"] += 1
                        
                    except Exception as e:
                        results["failed"].append({
                            "payload": payload.model_dump(),
                            "error": str(e)
                        })
                        results["processed"] += 1
                
                # Commit batch
                self.db.commit()
            
            # Add images to gallery if specified
            if gallery_id and created_images:
                try:
                    from galleries.services import GalleryService
                    gallery_service = GalleryService(self.db)
                    
                    # Create bulk operation payload
                    from galleries.schemas import BulkGalleryImageOperation
                    bulk_payload = BulkGalleryImageOperation(
                        image_ids=[img.id for img in created_images]
                    )
                    
                    gallery_result = await gallery_service.add_images_to_gallery(gallery_id, bulk_payload)
                    results["gallery_result"] = gallery_result
                    
                except Exception as e:
                    results["gallery_error"] = str(e)
            
            # Generate thumbnails for all successful images asynchronously
            if generate_thumbnails and created_images:
                import asyncio
                for image in created_images:
                    asyncio.create_task(self._generate_thumbnails_background(image.id))
                
                results["thumbnails_queued"] = len(created_images)
            
        except Exception as e:
            # Rollback on critical error
            self.db.rollback()
            results["critical_error"] = str(e)
        
        return results

    async def process_bulk_upload_with_progress(
        self,
        image_payloads: List[s.ImageCreate],
        user_profile_id: int,
        gallery_id: Optional[int] = None,
        progress_callback: Optional[callable] = None
    ) -> dict:
        """
        Process bulk upload with progress tracking callback.
        
        Args:
            image_payloads: List of ImageCreate payloads
            user_profile_id: User profile ID
            gallery_id: Optional gallery to add images to
            progress_callback: Optional callback function called with progress updates
            
        Returns:
            Final results dict
        """
        total = len(image_payloads)
        processed = 0
        results = {"success": [], "failed": [], "total": total}
        
        for payload in image_payloads:
            try:
                # Create single image
                image = await self.create_image(payload, user_profile_id, gallery_id)
                results["success"].append({
                    "id": image.id,
                    "title": image.title
                })
                
            except Exception as e:
                results["failed"].append({
                    "payload": payload.model_dump(),
                    "error": str(e)
                })
            
            processed += 1
            
            # Call progress callback if provided
            if progress_callback:
                try:
                    progress_callback({
                        "processed": processed,
                        "total": total,
                        "progress_percent": (processed / total) * 100,
                        "current_item": payload.title
                    })
                except Exception:
                    # Don't fail on callback errors
                    pass
        
        return results

    async def bulk_tag_images(self, image_ids: List[int], tag_names: List[str]) -> dict:
        """Bulk tag multiple images"""
        tag_service = TagService(self.db)
        results = {"success": [], "failed": []}
        
        for image_id in image_ids:
            try:
                tag_service.tag_object(
                    content_type="images.image",
                    object_id=image_id,
                    tag_names=tag_names
                )
                results["success"].append(image_id)
            except Exception as e:
                results["failed"].append({"id": image_id, "error": str(e)})
        
        self.db.commit()
        return results