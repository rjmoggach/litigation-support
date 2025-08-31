from typing import List, Optional

from core.database import get_db
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from users.deps import get_current_user
from users.models import User

from .models import Case, CaseDocument, CaseNote, DocumentSmartText
from .schemas import (
    # Case schemas
    CaseCreate,
    CaseDashboard,
    CaseDocumentCreate,
    CaseDocumentResponse,
    CaseFullResponse,
    CaseNoteCreate,
    CaseNoteResponse,
    CaseNoteUpdate,
    # Profile schemas
    CaseProfileCreate,
    CaseProfileResponse,
    CaseSearchQuery,
    CaseUpdate,
    CaseWithProfileResponse,
    # Event schemas
    CourtEventCreate,
    CourtEventResponse,
    CourtEventUpdate,
    DocumentSearchQuery,
    # Service schemas
    DocumentServiceCreate,
    DocumentServiceResponse,
    DocumentServiceUpdate,
    # Smart text schemas
    DocumentSmartTextCreate,
    DocumentSmartTextResponse,
    DocumentSmartTextUpdate,
    FileUploadResponse,
    NoteSearchQuery,
)
from .services import CasesService

router = APIRouter()


def get_cases_service(db: Session = Depends(get_db)) -> CasesService:
    """Get cases service instance."""
    return CasesService(db)


# Case endpoints
@router.get("/dashboard", response_model=CaseDashboard)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get dashboard statistics for user's cases."""
    return service.get_case_dashboard(current_user.id)


@router.post(
    "", response_model=CaseWithProfileResponse, status_code=status.HTTP_201_CREATED
)
async def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Create a new case."""
    try:
        case = service.create_case(case_data, current_user.id)
        return case
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CaseWithProfileResponse])
async def get_cases(
    q: Optional[str] = None,
    case_type: Optional[str] = None,
    status: Optional[str] = None,
    court_location: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get cases for the current user with optional filtering."""
    search_params = CaseSearchQuery(
        q=q,
        case_type=case_type,
        status=status,
        court_location=court_location,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )

    return service.get_cases(current_user.id, search_params)


@router.get("/{case_id}", response_model=CaseWithProfileResponse)
async def get_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get a specific case."""
    case = service.get_case(case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("/{case_id}/full", response_model=CaseFullResponse)
async def get_case_full(
    case_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get a case with all related data (events, documents, notes)."""
    case = service.get_case(case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.put("/{case_id}", response_model=CaseWithProfileResponse)
async def update_case(
    case_id: int,
    case_data: CaseUpdate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Update a case."""
    case = service.update_case(case_id, case_data, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Delete a case."""
    success = service.delete_case(case_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Case not found")


# Case Profile endpoints
@router.post(
    "/{case_id}/profile",
    response_model=CaseProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_case_profile(
    case_id: int,
    profile_data: CaseProfileCreate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Create or update case profile."""
    profile = service.create_case_profile(profile_data, case_id, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Case not found")
    return profile


@router.get("/{case_id}/profile", response_model=CaseProfileResponse)
async def get_case_profile(
    case_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get case profile."""
    profile = service.get_case_profile(case_id, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Case or profile not found")
    return profile


# Court Event endpoints
@router.post(
    "/events", response_model=CourtEventResponse, status_code=status.HTTP_201_CREATED
)
async def create_court_event(
    event_data: CourtEventCreate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Create a court event."""
    event = service.create_court_event(event_data, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Case not found")
    return event


@router.get("/{case_id}/events", response_model=List[CourtEventResponse])
async def get_court_events(
    case_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get all court events for a case."""
    return service.get_court_events(case_id, current_user.id)


@router.put("/events/{event_id}", response_model=CourtEventResponse)
async def update_court_event(
    event_id: int,
    event_data: CourtEventUpdate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Update a court event."""
    event = service.update_court_event(event_id, event_data, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


# Document endpoints
@router.post("/{case_id}/documents/upload", response_model=FileUploadResponse)
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    event_id: Optional[int] = Form(None),
    party_type: str = Form(...),
    document_type: str = Form(...),
    document_date: str = Form(...),
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Upload a document to a case."""
    # Verify case exists
    case = service.get_case(case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Parse and validate document date
    try:
        from datetime import datetime

        parsed_date = datetime.strptime(document_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid document date format. Use YYYY-MM-DD"
        )

    # Generate file path
    court_file_number = case.court_file_number
    base_path = f"cases/{court_file_number}"
    if event_id:
        file_path = f"{base_path}/events/{event_id}/documents/{party_type}"
    else:
        file_path = f"{base_path}/documents/{party_type}"

    # Store the file
    try:
        file_content = await file.read()
        from .utils import CaseFileUtils

        stored_filename = CaseFileUtils.generate_stored_filename(
            file.filename, parsed_date
        )
        full_path = f"{file_path}/{stored_filename}"

        # Save file to storage
        from core.storage import get_storage_instance

        storage = get_storage_instance()
        if storage:
            storage_result = await storage.put(full_path, file_content)
        else:
            storage_result = None

        # Create document record
        doc_data = CaseDocumentCreate(
            case_id=case_id,
            event_id=event_id,
            original_filename=file.filename,
            stored_filename=stored_filename,
            party_type=party_type,
            document_type=document_type,
            file_path=full_path,
            file_size=len(file_content),
            mime_type=file.content_type or "application/octet-stream",
            document_date=parsed_date,
        )

        document = service.create_document(doc_data, current_user.id)

        return FileUploadResponse(
            document_id=document.id,
            stored_filename=stored_filename,
            file_path=full_path,
            message="File uploaded successfully",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/{case_id}/documents", response_model=List[CaseDocumentResponse])
async def get_documents(
    case_id: int,
    q: Optional[str] = None,
    party_type: Optional[str] = None,
    document_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    has_service: Optional[bool] = None,
    service_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get documents for a case with optional filtering."""
    search_params = DocumentSearchQuery(
        q=q,
        case_id=case_id,
        party_type=party_type,
        document_type=document_type,
        from_date=from_date,
        to_date=to_date,
        has_service=has_service,
        service_status=service_status,
        limit=limit,
        offset=offset,
    )

    return service.get_documents(case_id, current_user.id, search_params)


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Download a document."""
    # Get document and verify ownership
    document = (
        service.db.query(CaseDocument)
        .join(Case)
        .filter(CaseDocument.id == document_id, Case.user_id == current_user.id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Get file from storage
        from core.storage import get_storage_instance

        storage = get_storage_instance()
        if not storage:
            raise HTTPException(
                status_code=503, detail="Storage service not configured"
            )

        file_content = await storage.get(document.file_path)

        # Return file as response
        from fastapi.responses import Response

        return Response(
            content=file_content,
            media_type=document.mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={document.original_filename}",
                "Content-Length": str(len(file_content)),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to download file: {str(e)}"
        )


# Document Service endpoints
@router.post(
    "/documents/{document_id}/service",
    response_model=DocumentServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_service(
    document_id: int,
    service_data: DocumentServiceCreate,
    current_user: User = Depends(get_current_user),
    cases_service: CasesService = Depends(get_cases_service),
):
    """Create a document service record."""
    service_data.document_id = document_id
    service_record = cases_service.create_document_service(
        service_data, current_user.id
    )
    if not service_record:
        raise HTTPException(status_code=404, detail="Document not found")
    return service_record


@router.get(
    "/documents/{document_id}/service", response_model=List[DocumentServiceResponse]
)
async def get_document_services(
    document_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get service records for a document."""
    # Verify document ownership
    document = (
        service.db.query(CaseDocument)
        .join(Case)
        .filter(CaseDocument.id == document_id, Case.user_id == current_user.id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document.service_records


@router.put("/service/{service_id}", response_model=DocumentServiceResponse)
async def update_document_service(
    service_id: int,
    service_data: DocumentServiceUpdate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Update a document service record."""
    service_record = service.update_document_service(
        service_id, service_data, current_user.id
    )
    if not service_record:
        raise HTTPException(status_code=404, detail="Service record not found")
    return service_record


# Case Notes endpoints
@router.post(
    "/notes", response_model=CaseNoteResponse, status_code=status.HTTP_201_CREATED
)
async def create_case_note(
    note_data: CaseNoteCreate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Create a case note."""
    note = service.create_case_note(note_data, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Case not found")
    return note


@router.get("/{case_id}/notes", response_model=List[CaseNoteResponse])
async def get_case_notes(
    case_id: int,
    q: Optional[str] = None,
    note_type: Optional[str] = None,
    priority: Optional[str] = None,
    is_completed: Optional[bool] = None,
    has_reminder: Optional[bool] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get notes for a case with optional filtering."""
    search_params = NoteSearchQuery(
        q=q,
        case_id=case_id,
        note_type=note_type,
        priority=priority,
        is_completed=is_completed,
        has_reminder=has_reminder,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )

    return service.get_case_notes(case_id, current_user.id, search_params)


@router.put("/notes/{note_id}", response_model=CaseNoteResponse)
async def update_case_note(
    note_id: int,
    note_data: CaseNoteUpdate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Update a case note."""
    note = service.update_case_note(note_id, note_data, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Delete a case note."""
    note = (
        service.db.query(CaseNote)
        .join(Case)
        .filter(CaseNote.id == note_id, Case.user_id == current_user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    service.db.delete(note)
    service.db.commit()


# Smart Text endpoints
@router.post(
    "/documents/{document_id}/smart-text",
    response_model=DocumentSmartTextResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_smart_text(
    document_id: int,
    smart_text_data: DocumentSmartTextCreate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Create smart text for a document."""
    smart_text_data.document_id = document_id
    smart_text = service.create_smart_text(smart_text_data, current_user.id)
    if not smart_text:
        raise HTTPException(status_code=404, detail="Document not found")
    return smart_text


@router.get(
    "/documents/{document_id}/smart-text", response_model=DocumentSmartTextResponse
)
async def get_smart_text(
    document_id: int,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Get smart text for a document."""
    document = (
        service.db.query(CaseDocument)
        .join(Case)
        .filter(CaseDocument.id == document_id, Case.user_id == current_user.id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.smart_text:
        raise HTTPException(status_code=404, detail="Smart text not found")

    return document.smart_text


@router.put("/smart-text/{smart_text_id}", response_model=DocumentSmartTextResponse)
async def update_smart_text(
    smart_text_id: int,
    smart_text_data: DocumentSmartTextUpdate,
    current_user: User = Depends(get_current_user),
    service: CasesService = Depends(get_cases_service),
):
    """Update smart text."""
    smart_text = (
        service.db.query(DocumentSmartText)
        .join(CaseDocument)
        .join(Case)
        .filter(DocumentSmartText.id == smart_text_id, Case.user_id == current_user.id)
        .first()
    )

    if not smart_text:
        raise HTTPException(status_code=404, detail="Smart text not found")

    update_data = smart_text_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(smart_text, field, value)

    service.db.commit()
    service.db.refresh(smart_text)
    return smart_text
