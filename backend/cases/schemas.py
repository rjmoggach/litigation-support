import json
from datetime import datetime, date
from typing import Any, Optional, List, Dict, Union

from pydantic import BaseModel, Field, ConfigDict, field_validator
from .models import (
    CaseStatus, CaseType, EventType, EventCategory, EventStatus,
    PartyType, DocumentType, ServiceType, ServiceStatus,
    NoteType, NotePriority
)


# Base schemas
class CaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    case_type: CaseType
    court_location: str = Field(..., min_length=1, max_length=255)
    opposing_party: str = Field(..., min_length=1, max_length=255)
    status: CaseStatus = CaseStatus.active


class CaseCreate(CaseBase):
    court_file_number: str = Field(..., min_length=1, max_length=50)

    @field_validator('court_file_number')
    @classmethod
    def validate_court_file_number(cls, v: str) -> str:
        import re
        if not re.match(r'^FS-\d{2}-\d{5}-\d{4}$', v):
            raise ValueError('Court file number must be in format FS-YY-NNNNN-NNNN')
        return v


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    case_type: Optional[CaseType] = None
    court_location: Optional[str] = Field(None, min_length=1, max_length=255)
    opposing_party: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[CaseStatus] = None


# Case Profile schemas
class CaseProfileBase(BaseModel):
    case_history: Optional[str] = None
    key_issues: Optional[str] = None
    opposing_counsel: Optional[Dict[str, Any]] = None
    case_strategy: Optional[str] = None
    important_dates: Optional[List[Dict[str, Any]]] = None
    settlement_discussions: Optional[str] = None
    is_public: bool = False


class CaseProfileCreate(CaseProfileBase):
    pass


class CaseProfileUpdate(CaseProfileBase):
    pass


class CaseProfileResponse(CaseProfileBase):
    id: int
    case_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Court Event schemas
class CourtEventBase(BaseModel):
    event_type: EventType
    title: str = Field(..., min_length=1, max_length=500)
    scheduled_date: Optional[datetime] = None
    courtroom: Optional[str] = Field(None, max_length=100)
    judge: Optional[str] = Field(None, max_length=255)
    status: EventStatus = EventStatus.scheduled
    outcome: Optional[str] = None
    event_metadata: Optional[Dict[str, Any]] = None


class CourtEventCreate(CourtEventBase):
    case_id: int
    event_category: Optional[EventCategory] = None  # Will be auto-set by validator

    @field_validator('event_category', mode='before')
    @classmethod
    def set_event_category(cls, v, info):
        if 'event_type' in info.data:
            event_type = info.data['event_type']
            # Map event types to categories
            if event_type in [EventType.case_conference, EventType.settlement_conference, EventType.trial_management_conference]:
                return EventCategory.conference
            elif event_type in [EventType.regular_motion, EventType.urgent_motion, EventType.emergency_motion]:
                return EventCategory.motion
            elif event_type in [EventType.trial, EventType.summary_judgment_motion]:
                return EventCategory.trial
            elif event_type in [EventType.show_cause_hearing, EventType.enforcement_hearing, EventType.status_review, EventType.uncontested_hearing]:
                return EventCategory.hearing
            else:
                return EventCategory.administrative
        return v


class CourtEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    scheduled_date: Optional[datetime] = None
    courtroom: Optional[str] = Field(None, max_length=100)
    judge: Optional[str] = Field(None, max_length=255)
    status: Optional[EventStatus] = None
    outcome: Optional[str] = None
    event_metadata: Optional[Dict[str, Any]] = None


class CourtEventResponse(CourtEventBase):
    id: int
    case_id: int
    event_category: EventCategory
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Document schemas
class CaseDocumentBase(BaseModel):
    original_filename: str = Field(..., min_length=1, max_length=500)
    party_type: PartyType
    document_type: DocumentType
    document_date: date
    file_size: int = Field(..., gt=0)
    mime_type: str = Field(..., min_length=1, max_length=100)

    @field_validator('document_date')
    @classmethod
    def validate_document_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Document date cannot be in the future')
        return v


class CaseDocumentCreate(CaseDocumentBase):
    case_id: int
    event_id: Optional[int] = None
    file_path: str = Field(..., min_length=1, max_length=1000)
    stored_filename: str = Field(..., min_length=1, max_length=500)


class CaseDocumentUpdate(BaseModel):
    original_filename: Optional[str] = Field(None, min_length=1, max_length=500)
    party_type: Optional[PartyType] = None
    document_type: Optional[DocumentType] = None
    document_date: Optional[date] = None

    @field_validator('document_date')
    @classmethod
    def validate_document_date(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError('Document date cannot be in the future')
        return v


class CaseDocumentResponse(CaseDocumentBase):
    id: int
    case_id: int
    event_id: Optional[int] = None
    stored_filename: str
    file_path: str
    smart_text_id: Optional[int] = None
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Document Service schemas
class DocumentServiceBase(BaseModel):
    service_type: ServiceType
    service_date: date
    served_on: str = Field(..., min_length=1, max_length=255)
    service_address: Optional[Dict[str, str]] = None
    received_date: Optional[date] = None
    receipt_method: Optional[str] = Field(None, max_length=255)
    service_status: ServiceStatus = ServiceStatus.pending
    service_notes: Optional[str] = None
    attempts: Optional[List[Dict[str, Any]]] = None
    affidavit_of_service_id: Optional[int] = None
    days_for_response: Optional[int] = Field(None, ge=0)
    response_deadline: Optional[date] = None
    is_urgent: bool = False
    court_ordered_service: bool = False

    @field_validator('service_date')
    @classmethod
    def validate_service_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Service date cannot be in the future')
        return v

    @field_validator('received_date')
    @classmethod
    def validate_received_date(cls, v: Optional[date], info) -> Optional[date]:
        if v and 'service_date' in info.data and v < info.data['service_date']:
            raise ValueError('Received date cannot be before service date')
        return v

    @field_validator('response_deadline')
    @classmethod
    def validate_response_deadline(cls, v: Optional[date], info) -> Optional[date]:
        if v and 'service_date' in info.data and v < info.data['service_date']:
            raise ValueError('Response deadline cannot be before service date')
        return v


class DocumentServiceCreate(DocumentServiceBase):
    document_id: int


class DocumentServiceUpdate(BaseModel):
    service_type: Optional[ServiceType] = None
    service_date: Optional[date] = None
    served_on: Optional[str] = Field(None, min_length=1, max_length=255)
    service_address: Optional[Dict[str, str]] = None
    received_date: Optional[date] = None
    receipt_method: Optional[str] = Field(None, max_length=255)
    service_status: Optional[ServiceStatus] = None
    service_notes: Optional[str] = None
    attempts: Optional[List[Dict[str, Any]]] = None
    affidavit_of_service_id: Optional[int] = None
    days_for_response: Optional[int] = Field(None, ge=0)
    response_deadline: Optional[date] = None
    is_urgent: Optional[bool] = None
    court_ordered_service: Optional[bool] = None


class DocumentServiceResponse(DocumentServiceBase):
    id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Case Note schemas
class CaseNoteBase(BaseModel):
    note_type: NoteType
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    tiptap_content: Optional[Dict[str, Any]] = None
    priority: NotePriority = NotePriority.normal
    is_confidential: bool = False
    event_id: Optional[int] = None
    document_id: Optional[int] = None
    service_id: Optional[int] = None
    tags: Optional[List[str]] = None
    reminder_date: Optional[date] = None
    is_completed: bool = False


class CaseNoteCreate(CaseNoteBase):
    case_id: int


class CaseNoteUpdate(BaseModel):
    note_type: Optional[NoteType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    tiptap_content: Optional[Dict[str, Any]] = None
    priority: Optional[NotePriority] = None
    is_confidential: Optional[bool] = None
    event_id: Optional[int] = None
    document_id: Optional[int] = None
    service_id: Optional[int] = None
    tags: Optional[List[str]] = None
    reminder_date: Optional[date] = None
    is_completed: Optional[bool] = None


class CaseNoteResponse(CaseNoteBase):
    id: int
    case_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Document Smart Text schemas
class DocumentSmartTextBase(BaseModel):
    tiptap_content: Dict[str, Any]
    plain_text: str = Field(..., min_length=1)
    extraction_method: str = Field(..., min_length=1, max_length=50)
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class DocumentSmartTextCreate(DocumentSmartTextBase):
    document_id: int


class DocumentSmartTextUpdate(BaseModel):
    tiptap_content: Optional[Dict[str, Any]] = None
    plain_text: Optional[str] = Field(None, min_length=1)
    extraction_method: Optional[str] = Field(None, min_length=1, max_length=50)
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class DocumentSmartTextResponse(DocumentSmartTextBase):
    id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Comprehensive response schemas with relationships
class CaseWithProfileResponse(CaseBase):
    id: int
    court_file_number: str
    user_id: int
    profile: Optional[CaseProfileResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CaseWithEventsResponse(CaseWithProfileResponse):
    events: List[CourtEventResponse] = []


class CaseWithDocumentsResponse(CaseWithProfileResponse):
    documents: List[CaseDocumentResponse] = []


class CaseWithNotesResponse(CaseWithProfileResponse):
    notes: List[CaseNoteResponse] = []


class CaseFullResponse(CaseWithProfileResponse):
    events: List[CourtEventResponse] = []
    documents: List[CaseDocumentResponse] = []
    notes: List[CaseNoteResponse] = []


class CourtEventWithDocumentsResponse(CourtEventResponse):
    documents: List[CaseDocumentResponse] = []
    notes: List[CaseNoteResponse] = []


class CaseDocumentWithServiceResponse(CaseDocumentResponse):
    service_records: List[DocumentServiceResponse] = []
    smart_text: Optional[DocumentSmartTextResponse] = None
    notes: List[CaseNoteResponse] = []


class DocumentServiceWithNotesResponse(DocumentServiceResponse):
    notes: List[CaseNoteResponse] = []


# Search and filter schemas
class CaseSearchQuery(BaseModel):
    q: Optional[str] = None  # General search query
    case_type: Optional[CaseType] = None
    status: Optional[CaseStatus] = None
    court_location: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


class DocumentSearchQuery(BaseModel):
    q: Optional[str] = None  # Search in filename, content
    case_id: Optional[int] = None
    party_type: Optional[PartyType] = None
    document_type: Optional[DocumentType] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    has_service: Optional[bool] = None
    service_status: Optional[ServiceStatus] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


class NoteSearchQuery(BaseModel):
    q: Optional[str] = None  # Search in title, content
    case_id: Optional[int] = None
    note_type: Optional[NoteType] = None
    priority: Optional[NotePriority] = None
    is_completed: Optional[bool] = None
    has_reminder: Optional[bool] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


# Statistics and dashboard schemas
class CaseSummary(BaseModel):
    id: int
    court_file_number: str
    title: str
    case_type: CaseType
    status: CaseStatus
    upcoming_events: int
    pending_services: int
    urgent_notes: int
    last_activity: Optional[datetime] = None


class CaseDashboard(BaseModel):
    total_cases: int
    active_cases: int
    upcoming_events: int
    overdue_services: int
    urgent_notes: int
    recent_cases: List[CaseSummary]


# File upload schemas
class FileUploadRequest(BaseModel):
    case_id: int
    event_id: Optional[int] = None
    party_type: PartyType
    document_type: DocumentType
    document_date: date
    original_filename: str


class FileUploadResponse(BaseModel):
    document_id: int
    stored_filename: str
    file_path: str
    message: str = "File uploaded successfully"