from __future__ import annotations

import re
import unicodedata
from sqlalchemy.orm import Session
from typing import Optional, List

from tags.services import TagService
from images.services import ImageService
from core.storage import get_storage_instance
from storage.models import StoredFile

from . import models as m
from . import schemas as s


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


class GalleryService:
    def __init__(self, db: Session):
        self.db = db
        self.image_service = ImageService(db)

    def _build_gallery_response(self, gallery: m.Gallery, include_images: bool = False) -> s.GalleryResponse | s.GalleryWithImages:
        """Build enriched gallery response with tags and optional images"""
        # Get tag objects for rich display
        tag_service = TagService(self.db)
        gallery_tags = gallery.get_tags(self.db)
        tag_objects = [tag_service._tag_to_response(tag) for tag in gallery_tags]
        
        # Get image count
        image_count = len(gallery.gallery_images)
        
        # Get thumbnail image - use first image if no thumbnail set
        thumbnail_image = None
        thumbnail_url = None
        if gallery.thumbnail_image_id and gallery.thumbnail_image:
            thumbnail_image = self.image_service._build_image_response(gallery.thumbnail_image)
            thumbnail_url = thumbnail_image.thumbnail_md_url if thumbnail_image else None
        elif gallery.gallery_images:
            # Use first image as thumbnail if no explicit thumbnail set
            first_image = gallery.gallery_images[0].image
            if first_image:
                thumbnail_image = self.image_service._build_image_response(first_image)
                thumbnail_url = thumbnail_image.thumbnail_md_url if thumbnail_image else None
        
        base_data = {
            "id": gallery.id,
            "title": gallery.title,
            "slug": gallery.slug,
            "description": gallery.description,
            "tags": gallery.tags if hasattr(gallery, 'tags') else None,  # Legacy string tags
            "date": gallery.date,  # Custom date field
            "is_public": gallery.is_public,
            "thumbnail_image_id": gallery.thumbnail_image_id,
            "user_profile_id": gallery.user_profile_id,
            "created_at": gallery.created_at,
            "updated_at": gallery.updated_at,
            "tag_objects": tag_objects,
            "thumbnail_image": thumbnail_image,
            "thumbnail_url": thumbnail_url,  # Add thumbnail URL for frontend
            "image_count": image_count,
        }
        
        if include_images:
            # Get images in order
            images = [
                self.image_service._build_image_response(gi.image) 
                for gi in gallery.gallery_images
            ]
            return s.GalleryWithImages(**base_data, images=images)
        else:
            return s.GalleryResponse(**base_data)

    def _get_gallery(self, gallery_id: int) -> m.Gallery | None:
        return self.db.query(m.Gallery).filter(m.Gallery.id == gallery_id).first()

    async def list_galleries(self, skip: int = 0, limit: int = 20, tags: Optional[List[str]] = None, user_profile_id: Optional[int] = None, is_public: Optional[bool] = None) -> list[s.GalleryResponse]:
        query = self.db.query(m.Gallery)
        
        # Filter by user if provided
        if user_profile_id:
            query = query.filter(m.Gallery.user_profile_id == user_profile_id)
        
        # Filter by public status if provided
        if is_public is not None:
            query = query.filter(m.Gallery.is_public == is_public)
        
        # Filter by tags if provided
        if tags:
            from tags.models import Tag, TaggedItem, ContentType
            
            # Get content type for galleries
            content_type = self.db.query(ContentType).filter(
                ContentType.app_label == "galleries",
                ContentType.model == "gallery"
            ).first()
            
            if content_type:
                # Filter galleries that have at least one of the specified tags
                tag_ids = self.db.query(Tag.id).filter(Tag.name.in_(tags)).subquery()
                
                query = query.join(
                    TaggedItem,
                    (TaggedItem.object_id == m.Gallery.id) & 
                    (TaggedItem.content_type_id == content_type.id)
                ).filter(TaggedItem.tag_id.in_(tag_ids)).distinct()
        
        galleries = (
            query
            .order_by(m.Gallery.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [self._build_gallery_response(gallery) for gallery in galleries]

    async def get_gallery(self, gallery_id: int, include_images: bool = False) -> s.GalleryResponse | s.GalleryWithImages | None:
        gallery = self._get_gallery(gallery_id)
        return self._build_gallery_response(gallery, include_images) if gallery else None

    async def get_gallery_by_slug(self, slug: str, include_images: bool = False) -> s.GalleryResponse | s.GalleryWithImages | None:
        gallery = self.db.query(m.Gallery).filter(m.Gallery.slug == slug).first()
        return self._build_gallery_response(gallery, include_images) if gallery else None

    async def create_gallery(self, payload: s.GalleryCreate, user_profile_id: int) -> s.GalleryResponse:
        # Generate slug from title if not provided
        slug = payload.slug
        if not slug and payload.title:
            base_slug = generate_slug(payload.title)
            # Ensure slug is unique
            counter = 0
            slug = base_slug
            while self.db.query(m.Gallery).filter(m.Gallery.slug == slug).first():
                counter += 1
                slug = f"{base_slug}-{counter}"
        
        gallery = m.Gallery(
            title=payload.title,
            slug=slug,
            description=payload.description,
            is_public=payload.is_public,
            thumbnail_image_id=payload.thumbnail_image_id,
            user_profile_id=user_profile_id,
        )

        self.db.add(gallery)
        self.db.flush()  # Get gallery.id for tags

        # Handle tags if provided
        if payload.tags:
            tag_service = TagService(self.db)
            try:
                tag_service.tag_object(
                    content_type="galleries.gallery",
                    object_id=gallery.id,
                    tag_names=payload.tags
                )
            except Exception as e:
                # Log error but don't fail gallery creation
                print(f"Warning: Failed to tag gallery {gallery.id}: {e}")

        self.db.commit()
        self.db.refresh(gallery)
        return self._build_gallery_response(gallery)

    async def update_gallery(self, gallery_id: int, payload: s.GalleryUpdate) -> s.GalleryResponse:
        gallery = self._get_gallery(gallery_id)
        if gallery is None:
            raise ValueError("Gallery not found")

        # Store old slug for S3 folder renaming
        old_slug = gallery.slug

        # Update basic fields
        data = payload.model_dump(exclude_unset=True)
        
        # Handle tags separately
        tags_to_update = None
        if 'tags' in data:
            tags_to_update = data.pop('tags')
        
        for field, value in data.items():
            setattr(gallery, field, value)
        
        # Update tags using the tagging service
        if tags_to_update is not None:
            tag_service = TagService(self.db)
            try:
                # Clear existing tags and set new ones
                gallery.clear_tags(self.db)
                if tags_to_update:
                    tag_service.tag_object(
                        content_type="galleries.gallery",
                        object_id=gallery.id,
                        tag_names=tags_to_update
                    )
            except Exception as e:
                # Log error but don't fail gallery update
                print(f"Warning: Failed to update tags for gallery {gallery.id}: {e}")

        # Handle S3 folder renaming if slug changed
        new_slug = gallery.slug
        if old_slug and new_slug and old_slug != new_slug:
            try:
                await self._rename_gallery_folder(gallery_id, old_slug, new_slug)
            except Exception as e:
                print(f"Warning: Failed to rename S3 folder for gallery {gallery.id}: {e}")

        self.db.commit()
        self.db.refresh(gallery)
        return self._build_gallery_response(gallery)

    async def delete_gallery(self, gallery_id: int) -> None:
        gallery = self._get_gallery(gallery_id)
        if gallery is None:
            return
        
        # Clean up S3 files before deleting gallery
        try:
            await self._delete_gallery_files(gallery_id)
        except Exception as e:
            print(f"Warning: Failed to delete S3 files for gallery {gallery_id}: {e}")
        
        self.db.delete(gallery)
        self.db.commit()

    async def add_images_to_gallery(self, gallery_id: int, payload: s.BulkGalleryImageOperation) -> dict:
        """Add multiple images to a gallery"""
        gallery = self._get_gallery(gallery_id)
        if gallery is None:
            raise ValueError("Gallery not found")
        
        # Get current max sort order
        max_order = 0
        if gallery.gallery_images:
            max_order = max(gi.sort_order for gi in gallery.gallery_images)
        
        results = {"success": [], "failed": [], "skipped": []}
        
        for i, image_id in enumerate(payload.image_ids):
            try:
                # Check if image already in gallery
                existing = self.db.query(m.GalleryImage).filter(
                    m.GalleryImage.gallery_id == gallery_id,
                    m.GalleryImage.image_id == image_id
                ).first()
                
                if existing:
                    results["skipped"].append(image_id)
                    continue
                
                # Get caption if provided
                caption = None
                if payload.captions and i < len(payload.captions):
                    caption = payload.captions[i]
                
                gallery_image = m.GalleryImage(
                    gallery_id=gallery_id,
                    image_id=image_id,
                    sort_order=max_order + i + 1,
                    caption=caption
                )
                
                self.db.add(gallery_image)
                results["success"].append(image_id)
                
            except Exception as e:
                results["failed"].append({"id": image_id, "error": str(e)})
        
        self.db.commit()
        return results

    async def remove_images_from_gallery(self, gallery_id: int, image_ids: List[int]) -> dict:
        """Remove multiple images from a gallery"""
        results = {"success": [], "failed": []}
        
        for image_id in image_ids:
            try:
                gallery_image = self.db.query(m.GalleryImage).filter(
                    m.GalleryImage.gallery_id == gallery_id,
                    m.GalleryImage.image_id == image_id
                ).first()
                
                if gallery_image:
                    self.db.delete(gallery_image)
                    results["success"].append(image_id)
                else:
                    results["failed"].append({"id": image_id, "error": "Not found in gallery"})
                    
            except Exception as e:
                results["failed"].append({"id": image_id, "error": str(e)})
        
        self.db.commit()
        return results

    async def reorder_gallery_images(self, gallery_id: int, payload: s.GalleryReorderRequest) -> dict:
        """Reorder images in a gallery"""
        gallery = self._get_gallery(gallery_id)
        if gallery is None:
            raise ValueError("Gallery not found")
        
        results = {"success": [], "failed": []}
        
        for order_data in payload.image_orders:
            try:
                image_id = order_data["image_id"]
                sort_order = order_data["sort_order"]
                
                gallery_image = self.db.query(m.GalleryImage).filter(
                    m.GalleryImage.gallery_id == gallery_id,
                    m.GalleryImage.image_id == image_id
                ).first()
                
                if gallery_image:
                    gallery_image.sort_order = sort_order
                    results["success"].append(image_id)
                else:
                    results["failed"].append({"id": image_id, "error": "Not found in gallery"})
                    
            except Exception as e:
                results["failed"].append({"id": order_data.get("image_id", "unknown"), "error": str(e)})
        
        self.db.commit()
        return results

    async def get_stats(self) -> dict:
        total = self.db.query(m.Gallery).count()
        public_count = self.db.query(m.Gallery).filter(m.Gallery.is_public == True).count()
        private_count = total - public_count
        
        return {
            "total": total,
            "public": public_count,
            "private": private_count
        }

    async def _rename_gallery_folder(self, gallery_id: int, old_slug: str, new_slug: str) -> None:
        """
        Rename S3 folder for gallery and update all associated file paths.
        
        This method:
        1. Gets all images in the gallery
        2. Copies files from old folder to new folder in S3
        3. Updates file paths in database
        4. Deletes old folder
        """
        try:
            storage = get_storage_instance()
            
            # Get all images in this gallery
            gallery_images = self.db.query(m.GalleryImage).filter(
                m.GalleryImage.gallery_id == gallery_id
            ).all()
            
            if not gallery_images:
                return  # No images to move
            
            # Get all stored files for gallery images (including thumbnails)
            file_updates = []
            
            for gallery_image in gallery_images:
                image = gallery_image.image
                stored_files = []
                
                # Add main image file
                if image.stored_file:
                    stored_files.append(image.stored_file)
                
                # Add thumbnail files
                for thumb_file in [image.thumbnail_sm, image.thumbnail_md, image.thumbnail_lg]:
                    if thumb_file:
                        stored_files.append(thumb_file)
                
                # Process each stored file
                for stored_file in stored_files:
                    if self._file_belongs_to_gallery(stored_file.file_path, old_slug):
                        old_path = stored_file.file_path
                        new_path = self._update_file_path_for_gallery(old_path, old_slug, new_slug)
                        
                        if old_path != new_path:
                            file_updates.append((stored_file, old_path, new_path))
            
            # Perform S3 operations
            for stored_file, old_path, new_path in file_updates:
                try:
                    # Copy file to new location
                    file_content = await storage.get(old_path)
                    await storage.put(new_path, file_content)
                    
                    # Update database record
                    stored_file.file_path = new_path
                    if hasattr(stored_file, 'dropbox_path'):
                        stored_file.dropbox_path = new_path
                    
                    print(f"Moved gallery file: {old_path} -> {new_path}")
                    
                except Exception as e:
                    print(f"Failed to move file {old_path} to {new_path}: {e}")
                    # Continue with other files even if one fails
                    continue
            
            # Save all database updates
            self.db.commit()
            
            # Clean up old files (after successful database update)
            for stored_file, old_path, new_path in file_updates:
                try:
                    await storage.delete(old_path)
                    print(f"Deleted old gallery file: {old_path}")
                except Exception as e:
                    print(f"Warning: Failed to delete old file {old_path}: {e}")
                    # Non-critical - file copies exist in new location
                    
        except Exception as e:
            print(f"Error in _rename_gallery_folder: {e}")
            raise

    def _file_belongs_to_gallery(self, file_path: str, gallery_slug: str) -> bool:
        """Check if a file path belongs to a specific gallery folder"""
        # Gallery files are typically stored as: images/{gallery_slug}/{filename}
        # or images/galleries/{gallery_slug}/{filename}
        return f"/{gallery_slug}/" in file_path or f"images/{gallery_slug}/" in file_path

    def _update_file_path_for_gallery(self, old_path: str, old_slug: str, new_slug: str) -> str:
        """Update file path to use new gallery slug"""
        # Replace old slug with new slug in path
        if f"/{old_slug}/" in old_path:
            return old_path.replace(f"/{old_slug}/", f"/{new_slug}/")
        elif f"images/{old_slug}/" in old_path:
            return old_path.replace(f"images/{old_slug}/", f"images/{new_slug}/")
        else:
            # Fallback - replace any occurrence of old slug
            return old_path.replace(old_slug, new_slug)

    async def _delete_gallery_files(self, gallery_id: int) -> None:
        """
        Delete all S3 files associated with a gallery.
        
        This method:
        1. Gets all images in the gallery and deletes them
        2. Deletes all files in the gallery's S3 folder (cleanup orphaned files)
        3. Updates user storage usage
        """
        try:
            storage = get_storage_instance()
            
            # Get the gallery for its slug
            gallery = self._get_gallery(gallery_id)
            if not gallery:
                return
            
            # Get all images in this gallery
            gallery_images = self.db.query(m.GalleryImage).filter(
                m.GalleryImage.gallery_id == gallery_id
            ).all()
            
            total_size_deleted = 0
            user_profile_id = None
            
            # Delete database-linked files first
            for gallery_image in gallery_images:
                image = gallery_image.image
                if not image:
                    continue
                    
                # Track user for storage usage update
                if not user_profile_id:
                    user_profile_id = image.user_profile_id
                
                # Delete main image file
                if image.stored_file:
                    try:
                        await storage.delete(image.stored_file.file_path)
                        total_size_deleted += image.stored_file.file_size or 0
                        print(f"Deleted gallery image: {image.stored_file.file_path}")
                    except Exception as e:
                        print(f"Failed to delete image {image.stored_file.file_path}: {e}")
                
                # Delete thumbnail files
                for thumb_file in [image.thumbnail_sm, image.thumbnail_md, image.thumbnail_lg]:
                    if thumb_file:
                        try:
                            await storage.delete(thumb_file.file_path)
                            total_size_deleted += thumb_file.file_size or 0
                            print(f"Deleted gallery thumbnail: {thumb_file.file_path}")
                        except Exception as e:
                            print(f"Failed to delete thumbnail {thumb_file.file_path}: {e}")
            
            # Additional cleanup: Delete all files in gallery folder (cleanup orphaned files)
            if gallery.slug:
                gallery_folder_patterns = [
                    f"/images/galleries/{gallery.slug}/",
                    f"/images/{gallery.slug}/",  # Alternative path structure
                ]
                
                # Get all stored files that match the gallery folder pattern
                from storage.models import StoredFile
                for pattern in gallery_folder_patterns:
                    orphaned_files = self.db.query(StoredFile).filter(
                        StoredFile.file_path.contains(pattern)
                    ).all()
                    
                    for orphaned_file in orphaned_files:
                        try:
                            await storage.delete(orphaned_file.file_path)
                            total_size_deleted += orphaned_file.file_size or 0
                            print(f"Deleted orphaned gallery file: {orphaned_file.file_path}")
                            
                            # Update user profile if not set
                            if not user_profile_id:
                                user_profile_id = orphaned_file.user_profile_id
                            
                            # Remove the StoredFile record from database
                            self.db.delete(orphaned_file)
                                
                        except Exception as e:
                            print(f"Failed to delete orphaned file {orphaned_file.file_path}: {e}")
            
            # Update user's storage usage
            if user_profile_id and total_size_deleted > 0:
                from users.models import UserProfile
                from users.services import update_storage_usage
                
                user_profile = self.db.query(UserProfile).filter(
                    UserProfile.id == user_profile_id
                ).first()
                if user_profile:
                    update_storage_usage(self.db, user_profile, -total_size_deleted)
                    print(f"Updated storage usage: -{total_size_deleted} bytes for user {user_profile_id}")
                    
        except Exception as e:
            print(f"Error in _delete_gallery_files: {e}")
            raise