from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from users.deps import get_current_admin_user, get_current_user
from users.models import User

from . import schemas as gallery_schemas
from .services import GalleryService

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
AdminDep = Annotated[object, Depends(get_current_admin_user)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[gallery_schemas.GalleryResponse])
async def list_galleries(
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
    tags: str | None = Query(None, description="Filter by tags (comma-separated)"),
    user_profile_id: int | None = Query(None, description="Filter by user profile ID"),
    is_public: bool | None = Query(None, description="Filter by public status"),
):
    service = GalleryService(db)
    tag_list = None
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    return await service.list_galleries(
        skip=skip, limit=limit, tags=tag_list, user_profile_id=user_profile_id, is_public=is_public
    )


@router.post("", response_model=gallery_schemas.GalleryResponse)
async def create_gallery(
    payload: gallery_schemas.GalleryCreate,
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
    
    service = GalleryService(db)
    return await service.create_gallery(payload, user.profile.id)


@router.get("/{gallery_id}", response_model=gallery_schemas.GalleryWithImages)
async def get_gallery(
    gallery_id: int,
    db: DbSession,
    include_images: bool = Query(True, description="Include images in response"),
):
    service = GalleryService(db)
    gallery = await service.get_gallery(gallery_id, include_images=include_images)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    return gallery


@router.get("/slug/{slug}", response_model=gallery_schemas.GalleryWithImages)
async def get_gallery_by_slug(
    slug: str,
    db: DbSession,
    include_images: bool = Query(True, description="Include images in response"),
):
    service = GalleryService(db)
    gallery = await service.get_gallery_by_slug(slug, include_images=include_images)
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    return gallery


@router.put("/{gallery_id}", response_model=gallery_schemas.GalleryResponse)
async def update_gallery(
    gallery_id: int,
    payload: gallery_schemas.GalleryUpdate,
    db: DbSession,
    user: UserDep,
):
    service = GalleryService(db)
    # TODO: Add ownership check - user can only update their own galleries
    return await service.update_gallery(gallery_id, payload)


@router.delete("/{gallery_id}")
async def delete_gallery(
    gallery_id: int,
    db: DbSession,
    user: UserDep,
):
    service = GalleryService(db)
    # TODO: Add ownership check - user can only delete their own galleries
    await service.delete_gallery(gallery_id)
    return {"status": "deleted"}


@router.post("/{gallery_id}/images")
async def add_images_to_gallery(
    gallery_id: int,
    payload: gallery_schemas.BulkGalleryImageOperation,
    db: DbSession,
    user: UserDep,
):
    """Add multiple images to a gallery"""
    service = GalleryService(db)
    # TODO: Add ownership check - user can only modify their own galleries
    return await service.add_images_to_gallery(gallery_id, payload)


@router.delete("/{gallery_id}/images")
async def remove_images_from_gallery(
    gallery_id: int,
    image_ids: list[int],
    db: DbSession,
    user: UserDep,
):
    """Remove multiple images from a gallery"""
    service = GalleryService(db)
    # TODO: Add ownership check - user can only modify their own galleries
    return await service.remove_images_from_gallery(gallery_id, image_ids)


@router.put("/{gallery_id}/images/reorder")
async def reorder_gallery_images(
    gallery_id: int,
    payload: gallery_schemas.GalleryReorderRequest,
    db: DbSession,
    user: UserDep,
):
    """Reorder images in a gallery"""
    service = GalleryService(db)
    # TODO: Add ownership check - user can only modify their own galleries
    return await service.reorder_gallery_images(gallery_id, payload)


@router.get("/{gallery_id}/images", response_model=list[gallery_schemas.GalleryImageResponse])
async def get_gallery_images(
    gallery_id: int,
    db: DbSession,
):
    """Get all images in a gallery with metadata"""
    from .models import GalleryImage

    gallery_images = (
        db.query(GalleryImage)
        .filter(GalleryImage.gallery_id == gallery_id)
        .order_by(GalleryImage.sort_order)
        .all()
    )

    from .services import GalleryService

    service = GalleryService(db)

    return [
        gallery_schemas.GalleryImageResponse(
            id=gi.id,
            gallery_id=gi.gallery_id,
            image_id=gi.image_id,
            sort_order=gi.sort_order,
            caption=gi.caption,
            created_at=gi.created_at,
            image=service.image_service._build_image_response(gi.image) if gi.image else None,
        )
        for gi in gallery_images
    ]


@router.get("/admin/stats")
async def get_gallery_stats(
    db: DbSession,
    _admin: AdminDep,
):
    service = GalleryService(db)
    return await service.get_stats()
