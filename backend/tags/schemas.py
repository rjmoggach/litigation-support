from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field


class TagBase(BaseModel):
    """Base schema for tag fields"""
    name: str = Field(..., min_length=1, max_length=100, description="Tag name")


class TagCreate(TagBase):
    """Schema for creating a new tag"""
    slug: Optional[str] = Field(None, max_length=100, description="URL-safe slug (auto-generated if not provided)")


class TagUpdate(BaseModel):
    """Schema for updating an existing tag"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Tag name")
    slug: Optional[str] = Field(None, max_length=100, description="URL-safe slug")


class TagResponse(TagBase):
    """Schema for tag response data"""
    id: int
    slug: str
    usage_count: int = Field(0, description="Number of items tagged with this tag")
    created_at: datetime

    class Config:
        from_attributes = True


class TagStats(BaseModel):
    """Schema for tag usage statistics"""
    total_tags: int
    total_tagged_items: int
    most_used_tags: List[TagResponse]
    recent_tags: List[TagResponse]


# Object tagging schemas
class TagObjectRequest(BaseModel):
    """Schema for tagging an object"""
    content_type: str = Field(..., description="Content type in format 'app_label.model'")
    object_id: int = Field(..., gt=0, description="ID of the object to tag")
    tag_names: List[str] = Field(..., min_items=1, description="List of tag names to apply")


class UntagObjectRequest(BaseModel):
    """Schema for removing tags from an object"""
    content_type: str = Field(..., description="Content type in format 'app_label.model'")
    object_id: int = Field(..., gt=0, description="ID of the object to untag")
    tag_names: List[str] = Field(..., min_items=1, description="List of tag names to remove")


class ObjectTagsResponse(BaseModel):
    """Schema for returning tags associated with an object"""
    content_type: str
    object_id: int
    tags: List[TagResponse]


class TaggedObjectResponse(BaseModel):
    """Schema for objects that have been tagged"""
    content_type: str
    object_id: int
    object_data: Dict[str, Any] = Field(default_factory=dict, description="Basic object metadata")
    tags: List[TagResponse]


class TaggedObjectsResponse(BaseModel):
    """Schema for listing objects tagged with a specific tag"""
    tag: TagResponse
    objects: List[TaggedObjectResponse]
    total_count: int
    page: int = 1
    limit: int = 50


# Search and autocomplete schemas
class TagAutocompleteResponse(BaseModel):
    """Schema for tag autocomplete results"""
    suggestions: List[TagResponse] = Field(max_items=10, description="Up to 10 tag suggestions")
    query: str = Field(description="The search query that was used")


class TagSearchRequest(BaseModel):
    """Schema for tag search requests"""
    query: str = Field(..., min_length=2, description="Search query (minimum 2 characters)")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of results")


# Bulk operations schemas
class BulkTagRequest(BaseModel):
    """Schema for bulk tag operations"""
    tag_names: List[str] = Field(..., min_items=1, max_items=50, description="List of tag names")


class BulkTagResponse(BaseModel):
    """Schema for bulk tag operation results"""
    created_tags: List[TagResponse]
    existing_tags: List[TagResponse]
    failed_tags: List[str] = Field(default_factory=list, description="Tag names that failed to create")


# Pagination schemas
class TagListResponse(BaseModel):
    """Schema for paginated tag listings"""
    items: List[TagResponse]
    total: int
    page: int
    per_page: int
    pages: int


# Popular tags for tag cloud
class PopularTagResponse(TagResponse):
    """Extended tag response with popularity score"""
    popularity_score: float = Field(description="Calculated popularity score (0.0 to 1.0)")
    relative_size: str = Field(description="CSS size class for tag cloud (xs, sm, md, lg, xl)")


class TagCloudResponse(BaseModel):
    """Schema for tag cloud data"""
    tags: List[PopularTagResponse]
    max_usage_count: int
    min_usage_count: int