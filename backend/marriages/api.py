from contacts.models import Person
from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from users.deps import get_current_active_superuser

from . import models, schemas

router = APIRouter()


# Marriage CRUD endpoints (admin only)


@router.post("", response_model=schemas.MarriageResponse)
def create_marriage(
    marriage_data: schemas.MarriageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Create a new marriage record (admin only)"""
    # Verify both people exist
    person = db.query(Person).filter(Person.id == marriage_data.person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    spouse = db.query(Person).filter(Person.id == marriage_data.spouse_id).first()
    if not spouse:
        raise HTTPException(status_code=404, detail="Spouse not found")

    # Prevent self-marriage
    if marriage_data.person_id == marriage_data.spouse_id:
        raise HTTPException(status_code=400, detail="A person cannot marry themselves")

    try:
        # Create marriage
        db_marriage = models.Marriage(
            person_id=marriage_data.person_id,
            spouse_id=marriage_data.spouse_id,
            marriage_date=marriage_data.marriage_date,
            marriage_location=marriage_data.marriage_location,
            separation_date=marriage_data.separation_date,
            divorce_date=marriage_data.divorce_date,
            current_status=marriage_data.current_status,
            marriage_certificate_file_id=marriage_data.marriage_certificate_file_id,
            divorce_decree_file_id=marriage_data.divorce_decree_file_id,
        )

        db.add(db_marriage)
        db.commit()
        db.refresh(db_marriage)

        return db_marriage

    except IntegrityError as e:
        db.rollback()
        if "unique_marriage" in str(e.orig):
            raise HTTPException(
                status_code=400,
                detail="A marriage record already exists for these people on this date",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to create marriage due to data constraint violation",
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to create marriage: {str(e)}"
        )


@router.get("", response_model=list[schemas.MarriageResponse])
def list_marriages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    person_id: int | None = Query(None, description="Filter by person ID"),
    current_status: str | None = Query(None, description="Filter by current status"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List marriages with pagination and filtering (admin only)"""
    query = db.query(models.Marriage)

    # Apply filters
    if person_id:
        query = query.filter(
            or_(
                models.Marriage.person_id == person_id,
                models.Marriage.spouse_id == person_id,
            )
        )

    if current_status:
        query = query.filter(models.Marriage.current_status == current_status)

    # Apply pagination and ordering
    marriages = (
        query.order_by(models.Marriage.marriage_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return marriages


@router.get("/{marriage_id}", response_model=schemas.MarriageResponse)
def get_marriage(
    marriage_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get marriage details (admin only)"""
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    return marriage


@router.put("/{marriage_id}", response_model=schemas.MarriageResponse)
def update_marriage(
    marriage_id: int,
    marriage_update: schemas.MarriageUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update marriage (admin only)"""
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    try:
        # Update fields if provided
        update_data = marriage_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(marriage, field, value)

        db.commit()
        db.refresh(marriage)

        return marriage

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update marriage: {str(e)}"
        )


@router.delete("/{marriage_id}")
def delete_marriage(
    marriage_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Delete marriage (admin only)"""
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    # Delete marriage (children associations will be cascade deleted)
    db.delete(marriage)
    db.commit()

    return {"message": "Marriage record deleted successfully"}


# MarriageChildren CRUD endpoints (admin only)


@router.post("/{marriage_id}/children", response_model=schemas.MarriageChildrenResponse)
def add_child_to_marriage(
    marriage_id: int,
    child_data: schemas.MarriageChildrenCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Add a child to a marriage (admin only)"""
    # Verify marriage exists
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    # Verify child exists
    child = db.query(Person).filter(Person.id == child_data.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Validate marriage_id matches
    if child_data.marriage_id != marriage_id:
        raise HTTPException(status_code=400, detail="Marriage ID mismatch")

    try:
        # Create marriage-child association
        db_association = models.MarriageChildren(
            marriage_id=child_data.marriage_id,
            child_id=child_data.child_id,
            custody_status=child_data.custody_status,
            custody_details=child_data.custody_details,
            current_living_with=child_data.current_living_with,
            custody_arrangement_file_id=child_data.custody_arrangement_file_id,
        )

        db.add(db_association)
        db.commit()
        db.refresh(db_association)

        return db_association

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Child is already associated with this marriage"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to add child to marriage: {str(e)}"
        )


@router.get(
    "/{marriage_id}/children",
    response_model=list[schemas.MarriageChildrenResponse],
)
def list_marriage_children(
    marriage_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """List children for a marriage (admin only)"""
    # Verify marriage exists
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    children = (
        db.query(models.MarriageChildren)
        .filter(models.MarriageChildren.marriage_id == marriage_id)
        .all()
    )

    return children


@router.put(
    "/{marriage_id}/children/{child_id}",
    response_model=schemas.MarriageChildrenResponse,
)
def update_marriage_child(
    marriage_id: int,
    child_id: int,
    child_update: schemas.MarriageChildrenUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Update child information in a marriage (admin only)"""
    # Get association and verify it exists
    association = (
        db.query(models.MarriageChildren)
        .filter(
            models.MarriageChildren.marriage_id == marriage_id,
            models.MarriageChildren.child_id == child_id,
        )
        .first()
    )

    if not association:
        raise HTTPException(status_code=404, detail="Child association not found")

    try:
        # Update fields if provided
        update_data = child_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(association, field, value)

        db.commit()
        db.refresh(association)

        return association

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update child information: {str(e)}"
        )


@router.delete("/{marriage_id}/children/{child_id}")
def remove_child_from_marriage(
    marriage_id: int,
    child_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Remove a child from a marriage (admin only)"""
    # Get association and verify it exists
    association = (
        db.query(models.MarriageChildren)
        .filter(
            models.MarriageChildren.marriage_id == marriage_id,
            models.MarriageChildren.child_id == child_id,
        )
        .first()
    )

    if not association:
        raise HTTPException(status_code=404, detail="Child association not found")

    db.delete(association)
    db.commit()

    return {"message": "Child removed from marriage successfully"}


# Person marriage endpoints (admin only)


@router.get(
    "/people/{person_id}/marriages", response_model=list[schemas.MarriageResponse]
)
def get_person_marriages(
    person_id: int,
    include_all: bool = Query(
        False, description="Include all marriages, not just as primary person"
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get all marriages for a person (admin only)"""
    # Verify person exists
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    if include_all:
        # Get marriages where person is either the primary person or spouse
        query = db.query(models.Marriage).filter(
            or_(
                models.Marriage.person_id == person_id,
                models.Marriage.spouse_id == person_id,
            )
        )
    else:
        # Get marriages where person is the primary person
        query = db.query(models.Marriage).filter(models.Marriage.person_id == person_id)

    marriages = query.order_by(models.Marriage.marriage_date.desc()).all()

    return marriages


@router.get(
    "/{marriage_id}/with-children",
    response_model=schemas.MarriageWithChildrenResponse,
)
def get_marriage_with_children(
    marriage_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_superuser),
):
    """Get marriage with all children information (admin only)"""
    marriage = (
        db.query(models.Marriage).filter(models.Marriage.id == marriage_id).first()
    )
    if not marriage:
        raise HTTPException(status_code=404, detail="Marriage not found")

    return marriage
