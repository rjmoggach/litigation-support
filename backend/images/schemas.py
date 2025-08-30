from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

# Import tag types for integration
from tags.schemas import TagResponse


class ImageBase(BaseModel):
    title: str
    alt_text: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


class ImageCreate(ImageBase):
    stored_file_id: int


class ImageUpdate(BaseModel):
    title: Optional[str] = None
    alt_text: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


class ImageResponse(ImageBase):
    id: int
    stored_file_id: int
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_sm_id: Optional[int] = None
    thumbnail_md_id: Optional[int] = None
    thumbnail_lg_id: Optional[int] = None
    user_profile_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    tag_objects: Optional[List[TagResponse]] = None  # Full tag objects for rich display
    
    # Computed CloudFront URLs for thumbnails and original
    cloudfront_url: Optional[str] = None
    thumbnail_sm_url: Optional[str] = None
    thumbnail_md_url: Optional[str] = None
    thumbnail_lg_url: Optional[str] = None

    class Config:
        from_attributes = True