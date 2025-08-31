from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
    Enum,
    Float,
    CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from core.database import Base


class CaseStatus(str, enum.Enum):
    active = "active"
    closed = "closed"
    on_hold = "on_hold"


class CaseType(str, enum.Enum):
    custody = "custody"
    access = "access"
    support = "support"
    property = "property"
    divorce = "divorce"
    separation = "separation"
    adoption = "adoption"
    child_protection = "child_protection"
    other = "other"


class EventType(str, enum.Enum):
    # Conferences
    case_conference = "case_conference"
    settlement_conference = "settlement_conference"
    trial_management_conference = "trial_management_conference"
    
    # Motion Hearings
    regular_motion = "regular_motion"
    urgent_motion = "urgent_motion"
    emergency_motion = "emergency_motion"
    
    # Trial Events
    trial = "trial"
    summary_judgment_motion = "summary_judgment_motion"
    
    # Specialized Hearings
    show_cause_hearing = "show_cause_hearing"
    enforcement_hearing = "enforcement_hearing"
    status_review = "status_review"
    uncontested_hearing = "uncontested_hearing"
    
    # Administrative
    first_appearance = "first_appearance"
    scheduling_conference = "scheduling_conference"


class EventCategory(str, enum.Enum):
    conference = "conference"
    motion = "motion"
    trial = "trial"
    hearing = "hearing"
    administrative = "administrative"


class EventStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    adjourned = "adjourned"
    cancelled = "cancelled"
    rescheduled = "rescheduled"


class PartyType(str, enum.Enum):
    court = "court"
    respondent = "respondent"
    applicant = "applicant"


class DocumentType(str, enum.Enum):
    affidavit = "affidavit"
    financial_statement = "financial_statement"
    correspondence = "correspondence"
    court_order = "court_order"
    notice_of_motion = "notice_of_motion"
    case_conference_brief = "case_conference_brief"
    settlement_conference_brief = "settlement_conference_brief"
    trial_record = "trial_record"
    evidence = "evidence"
    other = "other"


class ServiceType(str, enum.Enum):
    personal = "personal"
    mail = "mail"
    email = "email"
    courier = "courier"
    substituted = "substituted"
    deemed = "deemed"


class ServiceStatus(str, enum.Enum):
    pending = "pending"
    served = "served"
    acknowledged = "acknowledged"
    disputed = "disputed"
    failed = "failed"


class NoteType(str, enum.Enum):
    general = "general"
    strategy = "strategy"
    event = "event"
    document = "document"
    service = "service"
    settlement = "settlement"


class NotePriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class Case(Base):
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, index=True)
    court_file_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False, index=True)
    case_type = Column(Enum(CaseType), nullable=False, index=True)
    court_location = Column(String(255), nullable=False)
    opposing_party = Column(String(255), nullable=False)
    status = Column(Enum(CaseStatus), default=CaseStatus.active, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    profile = relationship("CaseProfile", back_populates="case", uselist=False, cascade="all, delete-orphan")
    events = relationship("CourtEvent", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("CaseDocument", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "court_file_number ~ '^FS-[0-9]{2}-[0-9]{5}-[0-9]{4}$'",
            name="court_file_number_format"
        ),
        Index("ix_cases_user_status", "user_id", "status"),
        Index("ix_cases_user_type", "user_id", "case_type"),
    )


class CaseProfile(Base):
    __tablename__ = "case_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)
    case_history = Column(Text, nullable=True)
    key_issues = Column(Text, nullable=True)
    opposing_counsel = Column(JSON, nullable=True)  # {name: "", firm: "", contact: ""}
    case_strategy = Column(Text, nullable=True)
    important_dates = Column(JSON, nullable=True)  # Array of {date: "", description: ""}
    settlement_discussions = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    case = relationship("Case", back_populates="profile")


class CourtEvent(Base):
    __tablename__ = "court_events"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    event_category = Column(Enum(EventCategory), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=True, index=True)
    courtroom = Column(String(100), nullable=True)
    judge = Column(String(255), nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.scheduled, index=True)
    outcome = Column(Text, nullable=True)
    event_metadata = Column(JSON, nullable=True)  # Event-specific fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    case = relationship("Case", back_populates="events")
    documents = relationship("CaseDocument", back_populates="event", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="event", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_court_events_case_date", "case_id", "scheduled_date"),
        Index("ix_court_events_case_status", "case_id", "status"),
        Index("ix_court_events_type_status", "event_type", "status"),
    )


class CaseDocument(Base):
    __tablename__ = "case_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("court_events.id", ondelete="SET NULL"), nullable=True, index=True)
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)  # Date-prefixed filename
    party_type = Column(Enum(PartyType), nullable=False, index=True)
    document_type = Column(Enum(DocumentType), nullable=False, index=True)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    document_date = Column(Date, nullable=False, index=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    case = relationship("Case", back_populates="documents")
    event = relationship("CourtEvent", back_populates="documents")
    smart_text = relationship("DocumentSmartText", back_populates="document", uselist=False)
    service_records = relationship("DocumentService", back_populates="document", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="document", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_case_documents_case_party", "case_id", "party_type"),
        Index("ix_case_documents_case_type", "case_id", "document_type"),
        Index("ix_case_documents_case_date", "case_id", "document_date"),
    )


class DocumentService(Base):
    __tablename__ = "document_service"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("case_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    service_type = Column(Enum(ServiceType), nullable=False, index=True)
    service_date = Column(Date, nullable=False, index=True)
    served_on = Column(String(255), nullable=False)
    service_address = Column(JSON, nullable=True)  # {street: "", city: "", province: "", postal: ""}
    received_date = Column(Date, nullable=True)
    receipt_method = Column(String(255), nullable=True)
    service_status = Column(Enum(ServiceStatus), default=ServiceStatus.pending, index=True)
    service_notes = Column(Text, nullable=True)
    attempts = Column(JSON, nullable=True)  # Array of attempt records
    affidavit_of_service_id = Column(Integer, nullable=True)  # Reference to filed affidavit document
    days_for_response = Column(Integer, nullable=True)
    response_deadline = Column(Date, nullable=True, index=True)
    is_urgent = Column(Boolean, default=False)
    court_ordered_service = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("CaseDocument", back_populates="service_records")
    notes = relationship("CaseNote", back_populates="service", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("received_date IS NULL OR received_date >= service_date", name="received_after_served"),
        CheckConstraint("response_deadline IS NULL OR response_deadline >= service_date", name="deadline_after_served"),
        Index("ix_document_service_status_deadline", "service_status", "response_deadline"),
        Index("ix_document_service_document_status", "document_id", "service_status"),
    )


class CaseNote(Base):
    __tablename__ = "case_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    note_type = Column(Enum(NoteType), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    tiptap_content = Column(JSON, nullable=True)  # Tiptap editor format
    priority = Column(Enum(NotePriority), default=NotePriority.normal, index=True)
    is_confidential = Column(Boolean, default=False)
    
    # Linking fields
    event_id = Column(Integer, ForeignKey("court_events.id", ondelete="SET NULL"), nullable=True, index=True)
    document_id = Column(Integer, ForeignKey("case_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    service_id = Column(Integer, ForeignKey("document_service.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Array of tags
    reminder_date = Column(Date, nullable=True, index=True)
    is_completed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    case = relationship("Case", back_populates="notes")
    event = relationship("CourtEvent", back_populates="notes")
    document = relationship("CaseDocument", back_populates="notes")
    service = relationship("DocumentService", back_populates="notes")
    
    # Indexes
    __table_args__ = (
        Index("ix_case_notes_case_type", "case_id", "note_type"),
        Index("ix_case_notes_case_priority", "case_id", "priority"),
        Index("ix_case_notes_reminder", "reminder_date"),
    )


class DocumentSmartText(Base):
    __tablename__ = "document_smart_text"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("case_documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    tiptap_content = Column(JSON, nullable=False)  # Tiptap editor format
    plain_text = Column(Text, nullable=False)  # Searchable plain text
    extraction_method = Column(String(50), nullable=False)  # manual, ocr, pdf_extract
    confidence_score = Column(Float, nullable=True)  # For automated extractions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("CaseDocument", back_populates="smart_text")
    
    # Full-text search index
    __table_args__ = (
        Index("ix_document_smart_text_search", "plain_text", postgresql_using="gin"),
        Index("ix_document_smart_text_method", "extraction_method"),
    )