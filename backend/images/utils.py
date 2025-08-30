from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from galleries.models import Gallery


def generate_image_upload_path(
    filename: str, 
    gallery_id: Optional[int] = None, 
    gallery_slug: Optional[str] = None,
    upload_date: Optional[datetime] = None
) -> str:
    """
    Generate the upload path for an image based on gallery association or date.
    
    For gallery images: /images/galleries/<gallery-slug>/<original-filename>
    For non-gallery images: /images/<year>/<month>/<original-filename>
    
    Args:
        filename: Original filename with extension
        gallery_id: Gallery ID if image belongs to a gallery
        gallery_slug: Gallery slug if known (to avoid DB lookup)
        upload_date: Upload date (defaults to now)
    
    Returns:
        Upload path string
    """
    if gallery_id or gallery_slug:
        # Gallery image path: /images/galleries/<gallery-slug>/<filename>
        if gallery_slug:
            slug = gallery_slug
        else:
            # Would need to lookup gallery slug from DB in actual implementation
            # For now, use gallery_id as fallback
            slug = f"gallery-{gallery_id}"
        
        return f"/images/galleries/{slug}/{filename}"
    else:
        # Non-gallery image path: /images/<year>/<month>/<filename>
        if upload_date is None:
            upload_date = datetime.utcnow()
        
        year = upload_date.year
        month = f"{upload_date.month:02d}"
        
        return f"/images/{year}/{month}/{filename}"


def generate_thumbnail_path(
    original_path: str,
    size: str,
    filename: str
) -> str:
    """
    Generate thumbnail path based on original image path.
    
    Converts:
    /images/galleries/<gallery-slug>/<filename> -> /thumbnails/images/galleries/<gallery-slug>/<filename>-<size>.<ext>
    /images/<year>/<month>/<filename> -> /thumbnails/images/<year>/<month>/<filename>-<size>.<ext>
    
    Args:
        original_path: Original image path
        size: Thumbnail size (sm, md, lg)
        filename: Original filename
        
    Returns:
        Thumbnail path string
    """
    # Extract directory and filename
    directory = os.path.dirname(original_path)
    name, ext = os.path.splitext(filename)
    
    # Generate thumbnail filename with size suffix
    thumbnail_filename = f"{name}-{size}{ext}"
    
    # Prepend /thumbnails to the directory structure
    thumbnail_path = f"/thumbnails{directory}/{thumbnail_filename}"
    
    return thumbnail_path


def get_cloudfront_url(file_path: Optional[str]) -> Optional[str]:
    """
    Get CloudFront URL for a file path.
    
    Args:
        file_path: The stored file path (e.g., "/images/galleries/slug/filename.jpg")
        
    Returns:
        CloudFront URL or None if file_path is None
    """
    if not file_path:
        return None
        
    cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', 'media.robertmoggach.com')
    
    # Ensure we have https:// prefix
    if not cloudfront_domain.startswith('http'):
        cloudfront_domain = f"https://{cloudfront_domain}"
    
    # Remove leading slash from file_path to avoid double slashes
    clean_path = file_path.lstrip('/')
    
    return f"{cloudfront_domain}/{clean_path}"