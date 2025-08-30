from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from users.deps import get_current_admin_user, get_current_user
from users.models import User

from . import schemas as image_schemas
from .services import ImageService

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
AdminDep = Annotated[object, Depends(get_current_admin_user)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[image_schemas.ImageResponse])
async def list_images(
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
    tags: str | None = Query(None, description="Filter by tags (comma-separated)"),
    user_profile_id: int | None = Query(None, description="Filter by user profile ID"),
):
    service = ImageService(db)
    tag_list = None
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    return await service.list_images(
        skip=skip, limit=limit, tags=tag_list, user_profile_id=user_profile_id
    )


@router.post("", response_model=image_schemas.ImageResponse)
async def create_image(
    payload: image_schemas.ImageCreate,
    db: DbSession,
    user: UserDep,
):
    # Ensure user has a profile
    if not user.profile:
        from users.models import UserProfile
        user_profile = UserProfile(user_id=user.id)
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)
        db.refresh(user)  # Refresh to get the new profile relationship
    
    service = ImageService(db)
    return await service.create_image(payload, user.profile.id)


@router.get("/{image_id}", response_model=image_schemas.ImageResponse)
async def get_image(
    image_id: int,
    db: DbSession,
):
    service = ImageService(db)
    image = await service.get_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image


@router.put("/{image_id}", response_model=image_schemas.ImageResponse)
async def update_image(
    image_id: int,
    payload: image_schemas.ImageUpdate,
    db: DbSession,
    user: UserDep,
):
    service = ImageService(db)
    # TODO: Add ownership check - user can only update their own images
    return await service.update_image(image_id, payload)


@router.delete("/{image_id}")
async def delete_image(
    image_id: int,
    db: DbSession,
    user: UserDep,
):
    service = ImageService(db)
    # TODO: Add ownership check - user can only delete their own images
    await service.delete_image(image_id)
    return {"status": "deleted"}


@router.post("/bulk-upload")
async def bulk_upload_images(
    image_payloads: list[image_schemas.ImageCreate],
    db: DbSession,
    user: UserDep,
    gallery_id: int | None = None,
    generate_thumbnails: bool = True,
):
    """Bulk upload multiple images"""
    service = ImageService(db)
    return await service.bulk_upload_images(
        image_payloads=image_payloads,
        user_profile_id=user.user_profile.id,
        gallery_id=gallery_id,
        generate_thumbnails=generate_thumbnails
    )


@router.post("/bulk-tag")
async def bulk_tag_images(
    image_ids: list[int],
    tag_names: list[str],
    db: DbSession,
    _admin: AdminDep,
):
    """Bulk tag multiple images - admin only"""
    service = ImageService(db)
    return await service.bulk_tag_images(image_ids, tag_names)


@router.post("/{image_id}/regenerate-thumbnails")
async def regenerate_thumbnails(
    image_id: int,
    db: DbSession,
    user: UserDep,
):
    """Regenerate thumbnails for an image"""
    service = ImageService(db)
    # TODO: Add ownership check - user can only regenerate thumbnails for their own images
    return await service.regenerate_thumbnails(image_id)


@router.get("/{image_id}/metadata")
async def get_image_metadata(
    image_id: int,
    db: DbSession,
):
    """Get comprehensive metadata for an image"""
    service = ImageService(db)
    image = await service.get_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    metadata = await service.extract_image_metadata(image.stored_file_id)
    if not metadata:
        raise HTTPException(status_code=500, detail="Failed to extract metadata")
    
    return metadata


@router.get("/admin/stats")
async def get_image_stats(
    db: DbSession,
    _admin: AdminDep,
):
    service = ImageService(db)
    return await service.get_stats()
