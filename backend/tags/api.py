from __future__ import annotations

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from users.deps import get_current_admin_user

from . import schemas as tag_schemas
from .services import TagService

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
AdminDep = Annotated[object, Depends(get_current_admin_user)]


# Tag Management Endpoints (Tasks 10-11)

# Static routes first (before parameterized routes)
@router.get("/stats", response_model=tag_schemas.TagStats)
async def get_tag_stats(
    db: DbSession,
):
    """Get tag usage statistics"""
    service = TagService(db)
    return service.get_tag_stats()


@router.get("/cloud", response_model=tag_schemas.TagCloudResponse)
async def get_tag_cloud(
    db: DbSession,
    max_tags: int = Query(30, ge=5, le=100, description="Maximum number of tags to include"),
):
    """Get tag cloud data for visualization"""
    service = TagService(db)
    return service.get_tag_cloud_data(max_tags=max_tags)


@router.get("/autocomplete", response_model=tag_schemas.TagAutocompleteResponse)
async def autocomplete_tags(
    db: DbSession,
    q: str = Query(..., min_length=2, description="Search query (minimum 2 characters)"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
):
    """Get tag suggestions with autocomplete"""
    service = TagService(db)
    
    try:
        tags = service.autocomplete(query=q, limit=limit)
        tag_responses = [service._tag_to_response(tag) for tag in tags]
        
        return tag_schemas.TagAutocompleteResponse(
            suggestions=tag_responses,
            query=q
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/object-tags", response_model=tag_schemas.ObjectTagsResponse)
async def get_object_tags(
    db: DbSession,
    content_type: str = Query(..., description="Content type in format 'app_label.model'"),
    object_id: int = Query(..., gt=0, description="ID of the object"),
):
    """Get all tags for a specific object"""
    service = TagService(db)
    
    try:
        tags = service.get_object_tags(content_type=content_type, object_id=object_id)
        tag_responses = [service._tag_to_response(tag) for tag in tags]
        
        return tag_schemas.ObjectTagsResponse(
            content_type=content_type,
            object_id=object_id,
            tags=tag_responses
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=tag_schemas.TagListResponse)
async def list_tags(
    db: DbSession,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search query for tag names"),
):
    """List all tags with pagination and optional search"""
    service = TagService(db)
    
    tags = service.list_tags(skip=skip, limit=limit, search=search)
    total = service.count_tags(search=search)
    
    # Convert to response objects
    tag_responses = [service._tag_to_response(tag) for tag in tags]
    
    # Calculate pagination info
    pages = (total + limit - 1) // limit
    
    return tag_schemas.TagListResponse(
        items=tag_responses,
        total=total,
        page=(skip // limit) + 1,
        per_page=limit,
        pages=pages
    )


@router.post("", response_model=tag_schemas.TagResponse)
async def create_tag(
    payload: tag_schemas.TagCreate,
    db: DbSession,
    _admin: AdminDep,
):
    """Create a new tag (admin only)"""
    service = TagService(db)
    
    try:
        tag = service.create_tag(name=payload.name, slug=payload.slug)
        return service._tag_to_response(tag)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tag_id}", response_model=tag_schemas.TagResponse)
async def get_tag(
    tag_id: int,
    db: DbSession,
):
    """Get a single tag by ID"""
    service = TagService(db)
    
    tag = service.get_tag_by_id(tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return service._tag_to_response(tag)


@router.put("/{tag_id}", response_model=tag_schemas.TagResponse)
async def update_tag(
    tag_id: int,
    payload: tag_schemas.TagUpdate,
    db: DbSession,
    _admin: AdminDep,
):
    """Update an existing tag (admin only)"""
    service = TagService(db)
    
    try:
        tag = service.update_tag(tag_id=tag_id, name=payload.name, slug=payload.slug)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        return service._tag_to_response(tag)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: int,
    db: DbSession,
    _admin: AdminDep,
):
    """Delete a tag and all its associations (admin only)"""
    service = TagService(db)
    
    success = service.delete_tag(tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return {"message": "Tag deleted successfully"}


# Object Tagging Endpoints (Task 12)

@router.post("/tag-object")
async def tag_object(
    payload: tag_schemas.TagObjectRequest,
    db: DbSession,
):
    """Add tags to an object"""
    service = TagService(db)
    
    try:
        created_items = service.tag_object(
            content_type=payload.content_type,
            object_id=payload.object_id,
            tag_names=payload.tag_names
        )
        
        return {
            "message": f"Added {len(created_items)} tag(s) to {payload.content_type}:{payload.object_id}",
            "tags_added": len(created_items),
            "content_type": payload.content_type,
            "object_id": payload.object_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/untag-object")
async def untag_object(
    payload: tag_schemas.UntagObjectRequest,
    db: DbSession,
):
    """Remove tags from an object"""
    service = TagService(db)
    
    try:
        removed_count = service.untag_object(
            content_type=payload.content_type,
            object_id=payload.object_id,
            tag_names=payload.tag_names
        )
        
        return {
            "message": f"Removed {removed_count} tag(s) from {payload.content_type}:{payload.object_id}",
            "tags_removed": removed_count,
            "content_type": payload.content_type,
            "object_id": payload.object_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/object-tags", response_model=tag_schemas.ObjectTagsResponse)
async def get_object_tags(
    db: DbSession,
    content_type: str = Query(..., description="Content type in format 'app_label.model'"),
    object_id: int = Query(..., gt=0, description="ID of the object"),
):
    """Get all tags for a specific object"""
    service = TagService(db)
    
    try:
        tags = service.get_object_tags(content_type=content_type, object_id=object_id)
        tag_responses = [service._tag_to_response(tag) for tag in tags]
        
        return tag_schemas.ObjectTagsResponse(
            content_type=content_type,
            object_id=object_id,
            tags=tag_responses
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Search and Discovery Endpoints (Task 13)

@router.get("/autocomplete", response_model=tag_schemas.TagAutocompleteResponse)
async def autocomplete_tags(
    db: DbSession,
    q: str = Query(..., min_length=2, description="Search query (minimum 2 characters)"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
):
    """Get tag suggestions with autocomplete"""
    service = TagService(db)
    
    try:
        tags = service.autocomplete(query=q, limit=limit)
        tag_responses = [service._tag_to_response(tag) for tag in tags]
        
        return tag_schemas.TagAutocompleteResponse(
            suggestions=tag_responses,
            query=q
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tag_slug}/objects", response_model=tag_schemas.TaggedObjectsResponse)
async def get_tagged_objects(
    tag_slug: str,
    db: DbSession,
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
):
    """Get all objects tagged with a specific tag"""
    service = TagService(db)
    
    try:
        result = service.get_tagged_objects(
            tag_slug=tag_slug,
            content_type_filter=content_type,
            skip=skip,
            limit=limit
        )
        
        # Convert to proper response format
        objects = []
        for content_type_key, obj_list in result["objects_by_type"].items():
            for obj in obj_list:
                objects.append(tag_schemas.TaggedObjectResponse(
                    content_type=obj["content_type"],
                    object_id=obj["object_id"],
                    object_data={"created_at": obj["created_at"].isoformat()},
                    tags=[result["tag"]]
                ))
        
        return tag_schemas.TaggedObjectsResponse(
            tag=result["tag"],
            objects=objects,
            total_count=result["total_count"],
            page=(skip // limit) + 1,
            limit=limit
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stats", response_model=tag_schemas.TagStats)
async def get_tag_stats(
    db: DbSession,
):
    """Get tag usage statistics"""
    service = TagService(db)
    return service.get_tag_stats()


@router.get("/cloud", response_model=tag_schemas.TagCloudResponse)
async def get_tag_cloud(
    db: DbSession,
    max_tags: int = Query(30, ge=5, le=100, description="Maximum number of tags to include"),
):
    """Get tag cloud data for visualization"""
    service = TagService(db)
    return service.get_tag_cloud_data(max_tags=max_tags)


@router.get("/{tag_slug}/related", response_model=List[tag_schemas.TagResponse])
async def get_related_tags(
    tag_slug: str,
    db: DbSession,
    limit: int = Query(10, ge=1, le=20, description="Maximum number of related tags"),
):
    """Get tags commonly used together with the specified tag"""
    service = TagService(db)
    
    related_tags = service.get_related_tags(tag_slug=tag_slug, limit=limit)
    return [service._tag_to_response(tag) for tag in related_tags]


# Bulk Operations

@router.post("/bulk-create", response_model=tag_schemas.BulkTagResponse)
async def bulk_create_tags(
    payload: tag_schemas.BulkTagRequest,
    db: DbSession,
    _admin: AdminDep,
):
    """Create multiple tags at once (admin only)"""
    service = TagService(db)
    
    created_tags = []
    existing_tags = []
    failed_tags = []
    
    for tag_name in payload.tag_names:
        try:
            # Check if tag already exists
            existing_tag = service.get_tag_by_name(tag_name)
            if existing_tag:
                existing_tags.append(service._tag_to_response(existing_tag))
            else:
                new_tag = service.create_tag(tag_name)
                created_tags.append(service._tag_to_response(new_tag))
        except ValueError:
            failed_tags.append(tag_name)
    
    return tag_schemas.BulkTagResponse(
        created_tags=created_tags,
        existing_tags=existing_tags,
        failed_tags=failed_tags
    )


@router.delete("/bulk-delete")
async def bulk_delete_tags(
    db: DbSession,
    _admin: AdminDep,
    tag_ids: List[int] = Query(..., description="List of tag IDs to delete"),
):
    """Delete multiple tags at once (admin only)"""
    service = TagService(db)
    
    deleted_count = 0
    not_found_ids = []
    
    for tag_id in tag_ids:
        success = service.delete_tag(tag_id)
        if success:
            deleted_count += 1
        else:
            not_found_ids.append(tag_id)
    
    return {
        "message": f"Deleted {deleted_count} tag(s)",
        "deleted_count": deleted_count,
        "not_found_ids": not_found_ids
    }