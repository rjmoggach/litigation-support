from datetime import datetime
import json
from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    status,
    UploadFile,
)
from sqlalchemy.orm import Session

from core.database import get_db
from core.storage import get_storage_instance
from storage.models import StoredFile
from storage.schemas import (
    FileInfo,
    FileListResponse,
    FileUploadResponse,
    ShareLinkResponse
)
from users.deps import get_current_user
from users.models import User
from users.services import (
    check_storage_quota,
    get_or_create_user_profile,
    update_storage_usage,
)

router = APIRouter()

# Typed aliases for dependencies and file params
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
UploadedFile = Annotated[UploadFile, File(...)]


@router.get("/test-connection")
async def test_storage_connection():
    """Test storage connection"""
    try:
        storage = get_storage_instance()
        account_info = storage.get_account_info()
        return {
            "status": "connected",
            "account": account_info
        }
    except ValueError as e:
        return {
            "status": "not_configured",
            "message": str(e)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/profile")
def get_storage_profile(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get user's storage profile information"""
    user_profile = get_or_create_user_profile(db, current_user)

    # Count files manually to avoid relationship issues
    files_count = db.query(StoredFile).filter(StoredFile.user_profile_id == user_profile.id).count()

    return {
        "user_id": current_user.id,
        "storage_used": user_profile.storage_used,
        "storage_quota": user_profile.storage_quota,
        "storage_available": user_profile.storage_quota - user_profile.storage_used,
        "files_count": files_count
    }


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadedFile,
    current_user: CurrentUser,
    db: DbSession,
    category: str = "general",
    slug: str = None,  # Optional slug for organized paths
):
    """
    Upload a file to Dropbox storage
    
    - **file**: Upload file (multipart/form-data)
    - **category**: File category for organization
    - **slug**: Optional slug for organized paths
    """
    try:
        # Get or create user profile
        user_profile = get_or_create_user_profile(db, current_user)

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Check storage quota
        if not check_storage_quota(user_profile, file_size):
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Storage quota exceeded"
            )

        # Determine path based on category and slug
        if category == "videos" and slug:
            # Keep original filename for videos
            storage_path = f"/videos/{slug}/{file.filename}"
            stored_filename = file.filename
        elif category == "images":
            # Keep original filename for images
            stored_filename = file.filename
            if slug:
                # Gallery image: /images/galleries/<gallery-slug>/<filename>
                storage_path = f"/images/galleries/{slug}/{file.filename}"
            else:
                # Non-gallery image: /images/<year>/<month>/<filename>
                now = datetime.utcnow()
                year = now.year
                month = f"{now.month:02d}"
                storage_path = f"/images/{year}/{month}/{file.filename}"
        elif category == "thumbnails":
            # Thumbnails keep original filename with size suffix
            stored_filename = file.filename
            # Path should be provided in slug parameter for thumbnails
            storage_path = slug if slug else f"/thumbnails/uploads/{current_user.id}/{file.filename}"
        else:
            # Default path with unique filename
            file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
            stored_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
            storage_path = f"/uploads/{current_user.id}/{stored_filename}"

        # Store file in storage backend
        storage = get_storage_instance()
        stored_file_info = await storage.put(
            storage_path,
            file_content
        )

        # Create database record
        db_file = StoredFile(
            filename=stored_filename,
            original_filename=file.filename,
            file_path=storage_path,
            file_size=file_size,
            content_type=file.content_type or "application/octet-stream",
            dropbox_path=storage_path,  # Keep for backward compatibility
            dropbox_id=getattr(stored_file_info, 'id', None),
            user_profile_id=user_profile.id,
            category=category,
            uploaded_at=datetime.utcnow()
        )

        db.add(db_file)
        db.flush()  # Get the StoredFile ID before creating Image record

        # Auto-create Image record for image files using ImageService
        image_record = None
        if category == "images" and file.content_type and file.content_type.startswith('image/'):
            try:
                from images.services import ImageService
                from images.schemas import ImageCreate
                
                # Create Image record using ImageService (includes thumbnail generation)
                image_service = ImageService(db)
                image_data = ImageCreate(
                    stored_file_id=db_file.id,
                    title=file.filename,  # Use filename as default title
                    alt_text=f"Image: {file.filename}",
                    description=None,
                    tags=None,
                )
                
                image_response = await image_service.create_image(image_data, user_profile.id)
                
                # Get the actual Image model from the database for the response
                image_record = image_service._get_image(image_response.id)
                
            except Exception as e:
                print(f"Warning: Failed to auto-create Image record for {file.filename}: {e}")
                # Continue without failing the upload

        # Update storage usage
        update_storage_usage(db, user_profile, file_size)

        db.commit()
        db.refresh(db_file)
        
        if image_record:
            db.refresh(image_record)

        # Create response with image_id if an Image record was created
        response_data = {
            "id": db_file.id,
            "filename": db_file.filename,
            "original_filename": db_file.original_filename,
            "file_path": db_file.file_path,
            "file_size": db_file.file_size,
            "content_type": db_file.content_type,
            "dropbox_path": db_file.dropbox_path,
            "dropbox_id": db_file.dropbox_id,
            "uploaded_at": db_file.uploaded_at,
            "user_profile_id": db_file.user_profile_id,
            "category": db_file.category,
            "image_id": image_record.id if image_record else None,
        }
        
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        ) from e


@router.get("/files", response_model=FileListResponse)
def list_files(
    current_user: CurrentUser,
    db: DbSession,
    page: int = 1,
    per_page: int = 20,
    category: str | None = None,
):
    """List user's files"""
    # Get or create user profile
    user_profile = get_or_create_user_profile(db, current_user)

    offset = (page - 1) * per_page

    files_query = db.query(StoredFile).filter(StoredFile.user_profile_id == user_profile.id)

    if category:
        files_query = files_query.filter(StoredFile.category == category)

    total = files_query.count()
    files = files_query.offset(offset).limit(per_page).all()

    file_list = []
    for file in files:
        file_info = FileInfo(
            id=file.id,
            filename=file.filename,
            original_filename=file.original_filename,
            file_size=file.file_size,
            content_type=file.content_type,
            uploaded_at=file.uploaded_at,
            dropbox_path=file.dropbox_path
        )
        file_list.append(file_info)

    return FileListResponse(
        files=file_list,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/files/{file_id}", response_model=FileInfo)
def get_file_info(
    file_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get file information"""
    user_profile = get_or_create_user_profile(db, current_user)

    file = db.query(StoredFile).filter(
        StoredFile.id == file_id,
        StoredFile.user_profile_id == user_profile.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    return FileInfo(
        id=file.id,
        filename=file.filename,
        original_filename=file.original_filename,
        file_size=file.file_size,
        content_type=file.content_type,
        uploaded_at=file.uploaded_at,
        dropbox_path=file.dropbox_path
    )


@router.post("/files/{file_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    file_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a sharing link for a file"""
    user_profile = get_or_create_user_profile(db, current_user)
    file = db.query(StoredFile).filter(
        StoredFile.id == file_id,
        StoredFile.user_profile_id == user_profile.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    try:
        # Create sharing link via storage backend
        storage = get_storage_instance()
        sharing_link = await storage.get_sharing_link(file.dropbox_path)

        # Update file record with sharing info
        sharing_info = {
            "sharing_url": sharing_link,
            "created_at": datetime.utcnow().isoformat()
        }
        file.sharing_info = json.dumps(sharing_info)
        db.commit()

        return ShareLinkResponse(sharing_url=sharing_link)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sharing link: {str(e)}"
        ) from e


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a file"""
    user_profile = get_or_create_user_profile(db, current_user)

    file = db.query(StoredFile).filter(
        StoredFile.id == file_id,
        StoredFile.user_profile_id == user_profile.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    try:
        # Delete from storage backend
        storage = get_storage_instance()
        await storage.delete(file.dropbox_path)

        # Update storage usage (subtract file size)
        update_storage_usage(db, user_profile, -file.file_size)

        # Delete from database
        db.delete(file)
        db.commit()

        return {"message": "File deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        ) from e


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Download a file"""
    # Align with other endpoints: scope to the user's profile
    user_profile = get_or_create_user_profile(db, current_user)
    file = db.query(StoredFile).filter(
        StoredFile.id == file_id,
        StoredFile.user_profile_id == user_profile.id,
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    try:
        # Get download URL from storage backend
        storage = get_storage_instance()
        download_url = await storage.get_url(file.dropbox_path)
        return {"download_url": download_url}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get download URL: {str(e)}"
        ) from e