from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional

from pydantic import BaseModel, Field

# Import tag types and image schemas for integration
from tags.schemas import TagResponse
from images.schemas import ImageResponse


class GalleryBase(BaseModel):
    title: str
    slug: Optional[str] = None  # Will be auto-generated if not provided
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    date: Optional[datetime] = None  # Custom date for sorting/chronological order
    is_public: bool = False
    thumbnail_image_id: Optional[int] = None


class GalleryCreate(GalleryBase):
    pass


class GalleryUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    date: Optional[datetime] = None
    is_public: Optional[bool] = None
    thumbnail_image_id: Optional[int] = None


class GalleryResponse(GalleryBase):
    id: int
    user_profile_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    tag_objects: Optional[List[TagResponse]] = None  # Full tag objects for rich display
    
    # Optional thumbnail image details
    thumbnail_image: Optional[ImageResponse] = None
    thumbnail_url: Optional[str] = None  # Direct URL for thumbnail display
    
    # Image count for gallery listings
    image_count: Optional[int] = None

    class Config:
        from_attributes = True


class GalleryWithImages(GalleryResponse):
    """Extended gallery response that includes the full list of images"""
    images: List[ImageResponse] = Field(default_factory=list)


class GalleryImageBase(BaseModel):
    gallery_id: int
    image_id: int
    sort_order: int = 0
    caption: Optional[str] = None


class GalleryImageCreate(GalleryImageBase):
    pass


class GalleryImageUpdate(BaseModel):
    sort_order: Optional[int] = None
    caption: Optional[str] = None


class GalleryImageResponse(GalleryImageBase):
    id: int
    created_at: datetime
    image: Optional[ImageResponse] = None  # Full image details

    class Config:
        from_attributes = True


class BulkGalleryImageOperation(BaseModel):
    """For bulk adding/removing images from galleries"""
    image_ids: List[int]
    captions: Optional[List[str]] = None  # Optional captions matching image_ids order


class GalleryReorderRequest(BaseModel):
    """For reordering images in a gallery"""
    image_orders: List[dict[str, int]]  # [{"image_id": 1, "sort_order": 0}, ...]