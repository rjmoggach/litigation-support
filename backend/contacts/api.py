import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.database import get_db
from users.deps import get_current_active_superuser

from . import models, schemas

router = APIRouter()


def generate_slug(
    name: str, db: Session, model_class, existing_id: int | None = None, max_attempts: int = 1000
) -> str:
    """Generate a unique slug from a name with collision handling

    Args:
        name: The name to generate a slug from
        db: Database session
        model_class: The SQLAlchemy model class (Company or Person)
        existing_id: ID of existing record to exclude from uniqueness check
        max_attempts: Maximum number of numbered variations to try (prevents infinite loops)

    Returns:
        A unique slug string

    Raises:
        HTTPException: If unable to generate unique slug after max_attempts
    """
    # Convert to lowercase and replace spaces/special chars with hyphens
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    base_slug = base_slug.strip("-")

    if not base_slug:
        base_slug = "untitled"

    # Ensure base slug is not too long for numbered variations
    if len(base_slug) > 90:  # Leave room for "-999" suffix
        base_slug = base_slug[:90]
        base_slug = base_slug.rstrip("-")

    # Check if slug exists
    query = db.query(model_class).filter(model_class.slug == base_slug)
    if existing_id:
        query = query.filter(model_class.id != existing_id)

    if not query.first():
        return base_slug

    # Generate numbered variations with safety limit
    for counter in range(1, max_attempts + 1):
        numbered_slug = f"{base_slug}-{counter}"
        query = db.query(model_class).filter(model_class.slug == numbered_slug)
        if existing_id:
            query = query.filter(model_class.id != existing_id)

        if not query.first():
            return numbered_slug

    # If we reach here, we couldn't generate a unique slug
    raise HTTPException(
        status_code=500,
        detail=f"Unable to generate unique slug for '{name}' after {max_attempts} attempts",
    )


# Company CRUD endpoints (admin only)


@router.post("/companies", response_model=schemas.CompanyResponse)
def create_company(
    company_data: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Create a new company (admin only)"""
    try:
        # Generate unique slug from company name
        slug = generate_slug(company_data.name, db, models.Company)

        # Create company
        db_company = models.Company(
            name=company_data.name,
            slug=slug,
            email=company_data.email,
            phone=company_data.phone,
            website=company_data.website,
            is_active=company_data.is_active,
            is_public=company_data.is_public,
        )
        db.add(db_company)
        db.commit()
        db.refresh(db_company)

        # Create associated profile
        db_profile = models.CompanyProfile(
            company_id=db_company.id,
            is_public=company_data.is_public,
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

        return db_company

    except IntegrityError as e:
        db.rollback()
        # Handle database constraint violations (e.g., slug uniqueness)
        if "slug" in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail="A company with a similar name already exists. Please choose a different name.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="Failed to create company due to data constraint violation"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create company: {str(e)}")


@router.get("/companies", response_model=list[schemas.CompanyResponse])
def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    is_public: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List companies with pagination and filtering (admin only)"""
    query = db.query(models.Company)

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Company.name.ilike(search_filter),
                models.Company.email.ilike(search_filter),
            )
        )

    if is_active is not None:
        query = query.filter(models.Company.is_active == is_active)

    if is_public is not None:
        query = query.filter(models.Company.is_public == is_public)

    # Apply pagination and ordering
    companies = query.order_by(models.Company.name).offset(skip).limit(limit).all()

    return companies


@router.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get company details (admin only)"""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


@router.put("/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(
    company_id: int,
    company_update: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update company (admin only)"""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        # Update fields if provided
        update_data = company_update.model_dump(exclude_unset=True)

        # Handle name change - regenerate slug if needed
        if "name" in update_data and update_data["name"] != company.name:
            # Validate the new name is not empty
            if not update_data["name"].strip():
                raise HTTPException(status_code=400, detail="Company name cannot be empty")
            update_data["slug"] = generate_slug(update_data["name"], db, models.Company, company.id)

        for field, value in update_data.items():
            setattr(company, field, value)

        db.commit()
        db.refresh(company)

        return company

    except IntegrityError as e:
        db.rollback()
        # Handle database constraint violations (e.g., slug uniqueness)
        if "slug" in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail="A company with a similar name already exists. Please choose a different name.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="Failed to update company due to data constraint violation"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update company: {str(e)}")


@router.delete("/companies/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Delete company (admin only)"""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Delete company (profile and associations will be cascade deleted)
    db.delete(company)
    db.commit()

    return {"message": f"Company '{company.name}' has been deleted successfully"}


# Person CRUD endpoints (admin only)


@router.post("/people", response_model=schemas.PersonResponse)
def create_person(
    person_data: schemas.PersonCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Create a new person (admin only)"""
    try:
        # Create person
        db_person = models.Person(
            first_name=person_data.first_name,
            middle_name=person_data.middle_name,
            last_name=person_data.last_name,
            email=person_data.email,
            phone=person_data.phone,
            date_of_birth=person_data.date_of_birth,
            gender=person_data.gender,
            is_active=person_data.is_active,
            is_public=person_data.is_public,
        )
        
        # Compute full name and slug
        db_person.compute_full_name()
        db_person.slug = generate_slug(db_person.full_name, db, models.Person)
        
        db.add(db_person)
        db.commit()
        db.refresh(db_person)

        # Create associated profile
        db_profile = models.PersonProfile(
            person_id=db_person.id,
            is_public=person_data.is_public,
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

        return db_person

    except IntegrityError as e:
        db.rollback()
        # Handle database constraint violations (e.g., slug uniqueness)
        if "slug" in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail="A person with a similar name already exists. Please choose a different name.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="Failed to create person due to data constraint violation"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create person: {str(e)}")


@router.get("/people", response_model=list[schemas.PersonResponse])
def list_people(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    is_public: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List people with pagination and filtering (admin only)"""
    query = db.query(models.Person)

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Person.full_name.ilike(search_filter),
                models.Person.first_name.ilike(search_filter),
                models.Person.last_name.ilike(search_filter),
                models.Person.email.ilike(search_filter),
            )
        )

    if is_active is not None:
        query = query.filter(models.Person.is_active == is_active)

    if is_public is not None:
        query = query.filter(models.Person.is_public == is_public)

    # Apply pagination and ordering
    people = query.order_by(models.Person.full_name).offset(skip).limit(limit).all()

    return people


@router.get("/people/{person_id}", response_model=schemas.PersonResponse)
def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get person details (admin only)"""
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    return person


@router.put("/people/{person_id}", response_model=schemas.PersonResponse)
def update_person(
    person_id: int,
    person_update: schemas.PersonUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update person (admin only)"""
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    try:
        # Update fields if provided
        update_data = person_update.model_dump(exclude_unset=True)

        # Handle name changes - recompute full_name and slug if needed
        if "first_name" in update_data or "middle_name" in update_data or "last_name" in update_data:
            # Update the person object with new values
            for field, value in update_data.items():
                setattr(person, field, value)
            
            # Compute new full name
            old_full_name = person.full_name
            person.compute_full_name()
            
            # Validate the new full name is not empty
            if not person.full_name.strip():
                raise HTTPException(status_code=400, detail="Person name cannot be empty")

            # Generate new slug if full name changed
            if person.full_name != old_full_name:
                person.slug = generate_slug(person.full_name, db, models.Person, person.id)
        else:
            # If no name changes, just update other fields
            for field, value in update_data.items():
                setattr(person, field, value)

        db.commit()
        db.refresh(person)

        return person

    except IntegrityError as e:
        db.rollback()
        # Handle database constraint violations (e.g., slug uniqueness)
        if "slug" in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail="A person with a similar name already exists. Please choose a different name.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="Failed to update person due to data constraint violation"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update person: {str(e)}")


@router.delete("/people/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Delete person (admin only)"""
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Delete person (profile and associations will be cascade deleted)
    db.delete(person)
    db.commit()

    return {"message": f"Person '{person.full_name}' has been deleted successfully"}


# Profile management endpoints (admin only)


@router.put("/companies/{company_id}/profile", response_model=schemas.CompanyProfileResponse)
def update_company_profile(
    company_id: int,
    profile_update: schemas.CompanyProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update company profile (admin only)"""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get or create profile
    profile = company.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")

    # Update profile fields
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile


@router.put("/people/{person_id}/profile", response_model=schemas.PersonProfileResponse)
def update_person_profile(
    person_id: int,
    profile_update: schemas.PersonProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update person profile (admin only)"""
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Get or create profile
    profile = person.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Person profile not found")

    # Update profile fields
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile


@router.post("/profiles/{profile_type}/{profile_id}/upload")
async def upload_profile_media(
    profile_type: str,
    profile_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Upload media files to company or person profile (admin only)"""
    from core.storage import get_storage_instance
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only image files are allowed."
        )

    # Validate file size (10MB max)
    file_content = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Get profile and entity
    if profile_type == "company":
        entity = db.query(models.Company).filter(models.Company.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        profile = entity.profile
        media_path = f"contacts/companies/{entity.slug}"
    else:  # person
        entity = db.query(models.Person).filter(models.Person.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        profile = entity.profile
        media_path = f"contacts/people/{entity.slug}"

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        # Generate file path
        file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_filename = f"{timestamp}_{file.filename}"
        storage_path = f"/{media_path}/{clean_filename}"

        # Upload to storage
        storage = get_storage_instance()
        stored_file_info = await storage.put(storage_path, file_content)

        # Create database record
        db_file = StoredFile(
            filename=clean_filename,
            original_filename=file.filename,
            file_path=storage_path,
            file_size=len(file_content),
            content_type=file.content_type,
            dropbox_path=storage_path,
            dropbox_id=getattr(stored_file_info, "id", stored_file_info.get("id")),
            category=f"{profile_type}_media",
        )

        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        # Create sharing link
        try:
            sharing_link = await storage.get_sharing_link(storage_path)
        except Exception:
            sharing_link = storage_path

        return {
            "id": db_file.id,
            "filename": db_file.filename,
            "original_filename": db_file.original_filename,
            "file_size": db_file.file_size,
            "content_type": db_file.content_type,
            "url": sharing_link,
            "message": f"Media uploaded successfully to {profile_type} profile",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload media: {str(e)}")


@router.get("/profiles/{profile_type}/{profile_id}/media")
def list_profile_media(
    profile_type: str,
    profile_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List media files for company or person profile (admin only)"""
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get entity and verify it exists
    if profile_type == "company":
        entity = db.query(models.Company).filter(models.Company.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = db.query(models.Person).filter(models.Person.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get media files for this profile
    media_files = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .order_by(StoredFile.created_at.desc())
        .all()
    )

    return {
        "profile_type": profile_type,
        "profile_id": profile_id,
        "media_files": [
            {
                "id": file.id,
                "filename": file.filename,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "content_type": file.content_type,
                "uploaded_at": file.uploaded_at,
                "is_image": file.content_type.startswith("image/") if file.content_type else False,
            }
            for file in media_files
        ],
    }


@router.delete("/profiles/{profile_type}/{profile_id}/media/{file_id}")
async def delete_profile_media(
    profile_type: str,
    profile_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Delete media file from company or person profile (admin only)"""
    from core.storage import get_storage_instance
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get and verify entities exist
    if profile_type == "company":
        entity = db.query(models.Company).filter(models.Company.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = db.query(models.Person).filter(models.Person.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get file record
    file_record = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.id == file_id,
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="Media file not found")

    try:
        # Delete from storage backend
        storage = get_storage_instance()
        await storage.delete(file_record.file_path)

        # Delete database record
        db.delete(file_record)
        db.commit()

        return {"message": f"Media file '{file_record.filename}' has been deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete media file: {str(e)}")


@router.get("/profiles/{profile_type}/{profile_id}/media/{file_id}/download")
async def download_profile_media(
    profile_type: str,
    profile_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get secure download URL for profile media file (admin only)"""
    from core.storage import get_storage_instance
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get and verify entities exist
    if profile_type == "company":
        entity = db.query(models.Company).filter(models.Company.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = db.query(models.Person).filter(models.Person.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get file record with security validation
    file_record = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.id == file_id,
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="Media file not found")

    try:
        # Get secure download URL from storage backend
        storage = get_storage_instance()
        download_url = await storage.get_url(file_record.file_path)

        return {
            "download_url": download_url,
            "filename": file_record.original_filename,
            "content_type": file_record.content_type,
            "file_size": file_record.file_size,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get download URL: {str(e)}")


@router.get("/profiles/{profile_type}/{profile_id}/media/{file_id}/thumbnail")
async def get_profile_media_thumbnail(
    profile_type: str,
    profile_id: int,
    file_id: int,
    size: int = Query(200, ge=50, le=800, description="Thumbnail size in pixels"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get or generate thumbnail for profile media file (admin only)"""
    import io

    from fastapi.responses import StreamingResponse
    from PIL import Image, ImageOps

    from core.storage import get_storage_instance
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get and verify entities exist
    if profile_type == "company":
        entity = db.query(models.Company).filter(models.Company.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = db.query(models.Person).filter(models.Person.id == profile_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get file record with security validation
    file_record = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.id == file_id,
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="Media file not found")

    # Check if file is an image
    if not file_record.content_type or not file_record.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image")

    # Check for existing thumbnail
    thumbnail_path = f"{file_record.file_path}_thumb_{size}x{size}"

    try:
        storage = get_storage_instance()

        # Try to get existing thumbnail
        try:
            thumbnail_data = await storage.get(thumbnail_path)
            return StreamingResponse(
                io.BytesIO(thumbnail_data),
                media_type="image/jpeg",
                headers={"Cache-Control": "public, max-age=86400"},  # Cache for 24 hours
            )
        except:
            # Thumbnail doesn't exist, generate it
            pass

        # Get original image
        original_data = await storage.get(file_record.file_path)

        # Generate thumbnail
        image = Image.open(io.BytesIO(original_data))

        # Convert to RGB if necessary (for PNG with transparency, etc.)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Generate square thumbnail with proper cropping
        thumbnail = ImageOps.fit(image, (size, size), Image.Resampling.LANCZOS)

        # Save thumbnail
        thumbnail_buffer = io.BytesIO()
        thumbnail.save(thumbnail_buffer, format="JPEG", quality=85, optimize=True)
        thumbnail_data = thumbnail_buffer.getvalue()

        # Store thumbnail for future use
        try:
            await storage.put(thumbnail_path, thumbnail_data)
        except Exception:
            # Don't fail if we can't store the thumbnail
            pass

        return StreamingResponse(
            io.BytesIO(thumbnail_data),
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},  # Cache for 24 hours
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate thumbnail: {str(e)}")


@router.get("/public/profiles/{profile_type}/{slug}/media")
def list_public_profile_media(
    profile_type: str,
    slug: str,
    db: Session = Depends(get_db),
):
    """List media files for public company or person profile (no auth required)"""
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get entity and verify it's public
    if profile_type == "company":
        entity = (
            db.query(models.Company)
            .filter(
                and_(
                    models.Company.slug == slug,
                    models.Company.is_public == True,
                    models.Company.is_active == True,
                )
            )
            .first()
        )
        if not entity:
            raise HTTPException(
                status_code=404, detail="Company not found or not publicly available"
            )

        # Check if profile is also public
        if entity.profile and not entity.profile.is_public:
            raise HTTPException(status_code=404, detail="Company profile is not public")

        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = (
            db.query(models.Person)
            .filter(
                and_(
                    models.Person.slug == slug,
                    models.Person.is_public == True,
                    models.Person.is_active == True,
                )
            )
            .first()
        )
        if not entity:
            raise HTTPException(
                status_code=404, detail="Person not found or not publicly available"
            )

        # Check if profile is also public
        if entity.profile and not entity.profile.is_public:
            raise HTTPException(status_code=404, detail="Person profile is not public")

        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get media files for this profile
    media_files = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .order_by(StoredFile.uploaded_at.desc())
        .all()
    )

    return {
        "profile_type": profile_type,
        "slug": slug,
        "media_files": [
            {
                "id": file.id,
                "filename": file.filename,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "content_type": file.content_type,
                "uploaded_at": file.uploaded_at,
                "is_image": file.content_type.startswith("image/") if file.content_type else False,
                "thumbnail_url": f"/api/v1/contacts/public/profiles/{profile_type}/{slug}/media/{file.id}/thumbnail"
                if file.content_type and file.content_type.startswith("image/")
                else None,
            }
            for file in media_files
        ],
    }


@router.get("/public/profiles/{profile_type}/{slug}/media/{file_id}/thumbnail")
async def get_public_profile_media_thumbnail(
    profile_type: str,
    slug: str,
    file_id: int,
    size: int = Query(200, ge=50, le=800, description="Thumbnail size in pixels"),
    db: Session = Depends(get_db),
):
    """Get thumbnail for public profile media file (no auth required)"""
    import io

    from fastapi.responses import StreamingResponse
    from PIL import Image, ImageOps

    from core.storage import get_storage_instance
    from storage.models import StoredFile

    # Validate profile type
    if profile_type not in ["company", "person"]:
        raise HTTPException(
            status_code=400, detail="Invalid profile type. Must be 'company' or 'person'"
        )

    # Get entity and verify it's public
    if profile_type == "company":
        entity = (
            db.query(models.Company)
            .filter(
                and_(
                    models.Company.slug == slug,
                    models.Company.is_public == True,
                    models.Company.is_active == True,
                )
            )
            .first()
        )
        if not entity:
            raise HTTPException(
                status_code=404, detail="Company not found or not publicly available"
            )

        # Check if profile is also public
        if entity.profile and not entity.profile.is_public:
            raise HTTPException(status_code=404, detail="Company profile is not public")

        media_path_prefix = f"/contacts/companies/{entity.slug}/"
    else:  # person
        entity = (
            db.query(models.Person)
            .filter(
                and_(
                    models.Person.slug == slug,
                    models.Person.is_public == True,
                    models.Person.is_active == True,
                )
            )
            .first()
        )
        if not entity:
            raise HTTPException(
                status_code=404, detail="Person not found or not publicly available"
            )

        # Check if profile is also public
        if entity.profile and not entity.profile.is_public:
            raise HTTPException(status_code=404, detail="Person profile is not public")

        media_path_prefix = f"/contacts/people/{entity.slug}/"

    # Get file record with security validation
    file_record = (
        db.query(StoredFile)
        .filter(
            and_(
                StoredFile.id == file_id,
                StoredFile.file_path.like(f"{media_path_prefix}%"),
                StoredFile.category == f"{profile_type}_media",
            )
        )
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="Media file not found")

    # Check if file is an image
    if not file_record.content_type or not file_record.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image")

    # Check for existing thumbnail
    thumbnail_path = f"{file_record.file_path}_thumb_{size}x{size}"

    try:
        storage = get_storage_instance()

        # Try to get existing thumbnail
        try:
            thumbnail_data = await storage.get(thumbnail_path)
            return StreamingResponse(
                io.BytesIO(thumbnail_data),
                media_type="image/jpeg",
                headers={"Cache-Control": "public, max-age=86400"},  # Cache for 24 hours
            )
        except:
            # Thumbnail doesn't exist, generate it
            pass

        # Get original image
        original_data = await storage.get(file_record.file_path)

        # Generate thumbnail
        image = Image.open(io.BytesIO(original_data))

        # Convert to RGB if necessary (for PNG with transparency, etc.)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Generate square thumbnail with proper cropping
        thumbnail = ImageOps.fit(image, (size, size), Image.Resampling.LANCZOS)

        # Save thumbnail
        thumbnail_buffer = io.BytesIO()
        thumbnail.save(thumbnail_buffer, format="JPEG", quality=85, optimize=True)
        thumbnail_data = thumbnail_buffer.getvalue()

        # Store thumbnail for future use
        try:
            await storage.put(thumbnail_path, thumbnail_data)
        except Exception:
            # Don't fail if we can't store the thumbnail
            pass

        return StreamingResponse(
            io.BytesIO(thumbnail_data),
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},  # Cache for 24 hours
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate thumbnail: {str(e)}")


# Public listing endpoints (no auth required)


@router.get("/public/companies", response_model=list[schemas.CompanyResponse])
def list_public_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List public companies with pagination and search (no auth required)"""
    query = db.query(models.Company).filter(
        and_(models.Company.is_public == True, models.Company.is_active == True)
    )

    # Apply search filter if provided
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Company.name.ilike(search_filter),
                models.Company.email.ilike(search_filter),
            )
        )

    # Apply pagination and ordering
    companies = query.order_by(models.Company.name).offset(skip).limit(limit).all()

    return companies


@router.get("/public/companies/{slug}", response_model=schemas.CompanyResponse)
def get_public_company_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get public company profile by slug (no auth required)"""
    company = (
        db.query(models.Company)
        .filter(
            and_(
                models.Company.slug == slug,
                models.Company.is_public == True,
                models.Company.is_active == True,
            )
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found or not publicly available")

    # Ensure the profile is also public if it exists
    if company.profile and not company.profile.is_public:
        # Return company data without profile if profile is private
        company.profile = None

    return company


@router.get("/public/people", response_model=list[schemas.PersonResponse])
def list_public_people(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List public people with pagination and search (no auth required)"""
    query = db.query(models.Person).filter(
        and_(models.Person.is_public == True, models.Person.is_active == True)
    )

    # Apply search filter if provided
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Person.full_name.ilike(search_filter),
                models.Person.first_name.ilike(search_filter),
                models.Person.last_name.ilike(search_filter),
                models.Person.email.ilike(search_filter),
            )
        )

    # Apply pagination and ordering
    people = query.order_by(models.Person.full_name).offset(skip).limit(limit).all()

    return people


@router.get("/public/people/{slug}", response_model=schemas.PersonResponse)
def get_public_person_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get public person profile by slug (no auth required)"""
    person = (
        db.query(models.Person)
        .filter(
            and_(
                models.Person.slug == slug,
                models.Person.is_public == True,
                models.Person.is_active == True,
            )
        )
        .first()
    )

    if not person:
        raise HTTPException(status_code=404, detail="Person not found or not publicly available")

    # Ensure the profile is also public if it exists
    if person.profile and not person.profile.is_public:
        # Return person data without profile if profile is private
        person.profile = None

    return person


# Association management endpoints (admin only)


@router.post("/associations", response_model=schemas.CompanyPersonAssociationResponse)
def create_association(
    association_data: schemas.CompanyPersonAssociationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Link company and person (admin only)"""
    # Validate that both company and person exist
    company = (
        db.query(models.Company).filter(models.Company.id == association_data.company_id).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    person = db.query(models.Person).filter(models.Person.id == association_data.person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Check if association already exists
    existing_association = (
        db.query(models.CompanyPersonAssociation)
        .filter(
            and_(
                models.CompanyPersonAssociation.company_id == association_data.company_id,
                models.CompanyPersonAssociation.person_id == association_data.person_id,
            )
        )
        .first()
    )

    if existing_association:
        raise HTTPException(
            status_code=400, detail="Association between this company and person already exists"
        )

    # Handle primary designation logic
    if association_data.is_primary:
        # Remove primary designation from other associations for this person
        db.query(models.CompanyPersonAssociation).filter(
            and_(
                models.CompanyPersonAssociation.person_id == association_data.person_id,
                models.CompanyPersonAssociation.is_primary == True,
            )
        ).update({"is_primary": False})

    # Create new association
    db_association = models.CompanyPersonAssociation(
        company_id=association_data.company_id,
        person_id=association_data.person_id,
        role=association_data.role,
        start_date=association_data.start_date,
        end_date=association_data.end_date,
        is_primary=association_data.is_primary,
    )

    db.add(db_association)
    db.commit()
    db.refresh(db_association)

    return db_association


@router.put(
    "/associations/{company_id}/{person_id}",
    response_model=schemas.CompanyPersonAssociationResponse,
)
def update_association(
    company_id: int,
    person_id: int,
    association_update: schemas.CompanyPersonAssociationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update association (admin only)"""
    # Get the association
    association = (
        db.query(models.CompanyPersonAssociation)
        .filter(
            and_(
                models.CompanyPersonAssociation.company_id == company_id,
                models.CompanyPersonAssociation.person_id == person_id,
            )
        )
        .first()
    )

    if not association:
        raise HTTPException(status_code=404, detail="Association not found")

    # Update fields if provided
    update_data = association_update.model_dump(exclude_unset=True)

    # Handle primary designation logic
    if "is_primary" in update_data and update_data["is_primary"]:
        # Remove primary designation from other associations for this person
        db.query(models.CompanyPersonAssociation).filter(
            and_(
                models.CompanyPersonAssociation.person_id == person_id,
                models.CompanyPersonAssociation.is_primary == True,
                models.CompanyPersonAssociation.company_id != company_id,
            )
        ).update({"is_primary": False})

    for field, value in update_data.items():
        setattr(association, field, value)

    db.commit()
    db.refresh(association)

    return association


@router.delete("/associations/{company_id}/{person_id}")
def delete_association(
    company_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Unlink company and person (admin only)"""
    # Get the association
    association = (
        db.query(models.CompanyPersonAssociation)
        .filter(
            and_(
                models.CompanyPersonAssociation.company_id == company_id,
                models.CompanyPersonAssociation.person_id == person_id,
            )
        )
        .first()
    )

    if not association:
        raise HTTPException(status_code=404, detail="Association not found")

    # Get company and person names for response message
    company = association.company
    person = association.person

    # Delete the association
    db.delete(association)
    db.commit()

    return {
        "message": f"Association between '{person.full_name}' and '{company.name}' has been deleted successfully"
    }


@router.get(
    "/companies/{company_id}/people", response_model=list[schemas.CompanyPersonAssociationResponse]
)
def get_company_people(
    company_id: int,
    include_inactive: bool = Query(False, description="Include inactive associations"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get people associated with company (admin only)"""
    # Verify company exists
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Build query for associations
    query = db.query(models.CompanyPersonAssociation).filter(
        models.CompanyPersonAssociation.company_id == company_id
    )

    # Filter out ended associations unless specifically requested
    if not include_inactive:
        query = query.filter(
            or_(
                models.CompanyPersonAssociation.end_date.is_(None),
                models.CompanyPersonAssociation.end_date > func.current_date(),
            )
        )

    # Order by primary status, then by start date
    associations = query.order_by(
        models.CompanyPersonAssociation.is_primary.desc(),
        models.CompanyPersonAssociation.start_date.desc().nullslast(),
    ).all()

    return associations


@router.get(
    "/people/{person_id}/companies", response_model=list[schemas.CompanyPersonAssociationResponse]
)
def get_person_companies(
    person_id: int,
    include_inactive: bool = Query(False, description="Include inactive associations"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get companies associated with person (admin only)"""
    # Verify person exists
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Build query for associations
    query = db.query(models.CompanyPersonAssociation).filter(
        models.CompanyPersonAssociation.person_id == person_id
    )

    # Filter out ended associations unless specifically requested
    if not include_inactive:
        query = query.filter(
            or_(
                models.CompanyPersonAssociation.end_date.is_(None),
                models.CompanyPersonAssociation.end_date > func.current_date(),
            )
        )

    # Order by primary status, then by start date
    associations = query.order_by(
        models.CompanyPersonAssociation.is_primary.desc(),
        models.CompanyPersonAssociation.start_date.desc().nullslast(),
    ).all()

    return associations


@router.get("/associations", response_model=list[schemas.CompanyPersonAssociationResponse])
def list_associations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    company_id: int | None = Query(None, description="Filter by company ID"),
    person_id: int | None = Query(None, description="Filter by person ID"),
    role: str | None = Query(None, description="Filter by role"),
    is_primary: bool | None = Query(None, description="Filter by primary status"),
    include_inactive: bool = Query(False, description="Include inactive associations"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List all associations with filtering and pagination (admin only)"""
    query = db.query(models.CompanyPersonAssociation)

    # Apply filters
    if company_id:
        query = query.filter(models.CompanyPersonAssociation.company_id == company_id)

    if person_id:
        query = query.filter(models.CompanyPersonAssociation.person_id == person_id)

    if role:
        query = query.filter(models.CompanyPersonAssociation.role.ilike(f"%{role}%"))

    if is_primary is not None:
        query = query.filter(models.CompanyPersonAssociation.is_primary == is_primary)

    # Filter out ended associations unless specifically requested
    if not include_inactive:
        query = query.filter(
            or_(
                models.CompanyPersonAssociation.end_date.is_(None),
                models.CompanyPersonAssociation.end_date > func.current_date(),
            )
        )

    # Apply pagination and ordering
    associations = (
        query.order_by(
            models.CompanyPersonAssociation.is_primary.desc(),
            models.CompanyPersonAssociation.start_date.desc().nullslast(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return associations


# PersonAddress CRUD endpoints (admin only)


@router.post("/people/{person_id}/addresses", response_model=schemas.PersonAddressResponse)
def create_person_address(
    person_id: int,
    address_data: schemas.PersonAddressCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Create a new address for a person (admin only)"""
    # Verify person exists
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Validate address_data.person_id matches person_id
    if address_data.person_id != person_id:
        raise HTTPException(status_code=400, detail="Person ID mismatch")
    
    # If this is marked as current, unset other current addresses
    if address_data.is_current:
        db.query(models.PersonAddress).filter(
            models.PersonAddress.person_id == person_id,
            models.PersonAddress.is_current == True
        ).update({"is_current": False})
    
    # Create address
    db_address = models.PersonAddress(
        person_id=address_data.person_id,
        street_address=address_data.street_address,
        city=address_data.city,
        state=address_data.state,
        zip_code=address_data.zip_code,
        country=address_data.country,
        effective_start_date=address_data.effective_start_date,
        effective_end_date=address_data.effective_end_date,
        is_current=address_data.is_current,
        address_type=address_data.address_type,
    )
    
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    
    return db_address


@router.get("/people/{person_id}/addresses", response_model=list[schemas.PersonAddressResponse])
def list_person_addresses(
    person_id: int,
    current_only: bool = Query(False, description="Only return current addresses"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List addresses for a person (admin only)"""
    # Verify person exists
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    query = db.query(models.PersonAddress).filter(models.PersonAddress.person_id == person_id)
    
    if current_only:
        query = query.filter(models.PersonAddress.is_current == True)
    
    addresses = query.order_by(models.PersonAddress.effective_start_date.desc()).all()
    return addresses


@router.put("/people/{person_id}/addresses/{address_id}", response_model=schemas.PersonAddressResponse)
def update_person_address(
    person_id: int,
    address_id: int,
    address_update: schemas.PersonAddressUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update a person's address (admin only)"""
    # Get address and verify it belongs to the person
    address = db.query(models.PersonAddress).filter(
        models.PersonAddress.id == address_id,
        models.PersonAddress.person_id == person_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Update fields if provided
    update_data = address_update.model_dump(exclude_unset=True)
    
    # If setting as current, unset other current addresses
    if update_data.get("is_current"):
        db.query(models.PersonAddress).filter(
            models.PersonAddress.person_id == person_id,
            models.PersonAddress.id != address_id,
            models.PersonAddress.is_current == True
        ).update({"is_current": False})
    
    for field, value in update_data.items():
        setattr(address, field, value)
    
    db.commit()
    db.refresh(address)
    
    return address


@router.delete("/people/{person_id}/addresses/{address_id}")
def delete_person_address(
    person_id: int,
    address_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Delete a person's address (admin only)"""
    # Get address and verify it belongs to the person
    address = db.query(models.PersonAddress).filter(
        models.PersonAddress.id == address_id,
        models.PersonAddress.person_id == person_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    db.delete(address)
    db.commit()
    
    return {"message": "Address deleted successfully"}
