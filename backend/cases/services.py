import os
import re
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.exc import IntegrityError

# Storage operations will be handled in the API layer
from users.models import User
from .models import (
    Case, CaseProfile, CourtEvent, CaseDocument, DocumentService,
    CaseNote, DocumentSmartText, ServiceType, ServiceStatus,
    EventCategory, PartyType
)
from .schemas import (
    CaseCreate, CaseUpdate, CaseProfileCreate, CaseProfileUpdate,
    CourtEventCreate, CourtEventUpdate, CaseDocumentCreate, CaseDocumentUpdate,
    DocumentServiceCreate, DocumentServiceUpdate, CaseNoteCreate, CaseNoteUpdate,
    DocumentSmartTextCreate, DocumentSmartTextUpdate,
    CaseSearchQuery, DocumentSearchQuery, NoteSearchQuery
)


class CasesService:
    def __init__(self, db: Session):
        self.db = db

    # Case CRUD operations
    def create_case(self, case_data: CaseCreate, user_id: int) -> Case:
        """Create a new case with directory structure."""
        try:
            # Create case record
            case = Case(
                court_file_number=case_data.court_file_number,
                title=case_data.title,
                case_type=case_data.case_type,
                court_location=case_data.court_location,
                opposing_party=case_data.opposing_party,
                status=case_data.status,
                user_id=user_id
            )
            
            self.db.add(case)
            self.db.flush()  # Get the ID
            
            # Note: Directory structure creation will be handled in API layer
            
            self.db.commit()
            self.db.refresh(case)
            return case
            
        except IntegrityError as e:
            self.db.rollback()
            if "court_file_number" in str(e):
                raise ValueError("Court file number already exists")
            raise e

    def get_case(self, case_id: int, user_id: int) -> Optional[Case]:
        """Get a case by ID for the authenticated user."""
        return self.db.query(Case).filter(
            Case.id == case_id,
            Case.user_id == user_id
        ).first()

    def get_cases(self, user_id: int, search: Optional[CaseSearchQuery] = None) -> List[Case]:
        """Get cases for user with optional search/filtering."""
        query = self.db.query(Case).filter(Case.user_id == user_id)
        
        if search:
            if search.q:
                query = query.filter(
                    or_(
                        Case.title.ilike(f"%{search.q}%"),
                        Case.court_file_number.ilike(f"%{search.q}%"),
                        Case.opposing_party.ilike(f"%{search.q}%")
                    )
                )
            if search.case_type:
                query = query.filter(Case.case_type == search.case_type)
            if search.status:
                query = query.filter(Case.status == search.status)
            if search.court_location:
                query = query.filter(Case.court_location.ilike(f"%{search.court_location}%"))
            if search.from_date:
                query = query.filter(Case.created_at >= search.from_date)
            if search.to_date:
                query = query.filter(Case.created_at <= search.to_date)
            
            query = query.offset(search.offset).limit(search.limit)
        
        return query.order_by(desc(Case.updated_at)).all()

    def update_case(self, case_id: int, case_data: CaseUpdate, user_id: int) -> Optional[Case]:
        """Update a case."""
        case = self.get_case(case_id, user_id)
        if not case:
            return None
        
        update_data = case_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(case, field, value)
        
        self.db.commit()
        self.db.refresh(case)
        return case

    def delete_case(self, case_id: int, user_id: int) -> bool:
        """Delete a case and its directory structure."""
        case = self.get_case(case_id, user_id)
        if not case:
            return False
        
        court_file_number = case.court_file_number
        
        self.db.delete(case)
        self.db.commit()
        
        # Note: Directory cleanup will be handled in API layer
        return True

    # Case Profile operations
    def create_case_profile(self, profile_data: CaseProfileCreate, case_id: int, user_id: int) -> Optional[CaseProfile]:
        """Create or update case profile."""
        case = self.get_case(case_id, user_id)
        if not case:
            return None
        
        # Check if profile already exists
        existing_profile = self.db.query(CaseProfile).filter(CaseProfile.case_id == case_id).first()
        if existing_profile:
            # Update existing profile
            update_data = profile_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(existing_profile, field, value)
            self.db.commit()
            self.db.refresh(existing_profile)
            return existing_profile
        
        # Create new profile
        profile = CaseProfile(case_id=case_id, **profile_data.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_case_profile(self, case_id: int, user_id: int) -> Optional[CaseProfile]:
        """Get case profile."""
        case = self.get_case(case_id, user_id)
        if not case:
            return None
        return case.profile

    # Court Event operations
    def create_court_event(self, event_data: CourtEventCreate, user_id: int) -> Optional[CourtEvent]:
        """Create a court event."""
        case = self.get_case(event_data.case_id, user_id)
        if not case:
            return None
        
        # Auto-set event category based on event type
        event_category = self._get_event_category(event_data.event_type)
        
        event = CourtEvent(
            **event_data.model_dump(exclude={'event_category'}),
            event_category=event_category
        )
        
        self.db.add(event)
        self.db.flush()
        
        # Note: Event directory creation will be handled in API layer
        
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_court_events(self, case_id: int, user_id: int) -> List[CourtEvent]:
        """Get all court events for a case."""
        case = self.get_case(case_id, user_id)
        if not case:
            return []
        
        return self.db.query(CourtEvent).filter(
            CourtEvent.case_id == case_id
        ).order_by(asc(CourtEvent.scheduled_date)).all()

    def update_court_event(self, event_id: int, event_data: CourtEventUpdate, user_id: int) -> Optional[CourtEvent]:
        """Update a court event."""
        event = self.db.query(CourtEvent).join(Case).filter(
            CourtEvent.id == event_id,
            Case.user_id == user_id
        ).first()
        
        if not event:
            return None
        
        update_data = event_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(event, field, value)
        
        # Update event category if event type changed
        if 'event_type' in update_data:
            event.event_category = self._get_event_category(event.event_type)
        
        self.db.commit()
        self.db.refresh(event)
        return event

    # Document operations
    def create_document(self, doc_data: CaseDocumentCreate, user_id: int) -> Optional[CaseDocument]:
        """Create a document record."""
        case = self.get_case(doc_data.case_id, user_id)
        if not case:
            return None
        
        # Use the stored filename from the request (already generated in API layer)
        stored_filename = doc_data.stored_filename
        
        document = CaseDocument(
            **doc_data.model_dump(exclude={'stored_filename'}),
            stored_filename=stored_filename
        )
        
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_documents(self, case_id: int, user_id: int, search: Optional[DocumentSearchQuery] = None) -> List[CaseDocument]:
        """Get documents for a case with optional filtering."""
        case = self.get_case(case_id, user_id)
        if not case:
            return []
        
        query = self.db.query(CaseDocument).filter(CaseDocument.case_id == case_id)
        
        if search:
            if search.q:
                query = query.filter(
                    or_(
                        CaseDocument.original_filename.ilike(f"%{search.q}%"),
                        CaseDocument.stored_filename.ilike(f"%{search.q}%")
                    )
                )
            if search.party_type:
                query = query.filter(CaseDocument.party_type == search.party_type)
            if search.document_type:
                query = query.filter(CaseDocument.document_type == search.document_type)
            if search.from_date:
                query = query.filter(CaseDocument.document_date >= search.from_date)
            if search.to_date:
                query = query.filter(CaseDocument.document_date <= search.to_date)
            if search.has_service is not None:
                if search.has_service:
                    query = query.join(DocumentService)
                else:
                    query = query.outerjoin(DocumentService).filter(DocumentService.id.is_(None))
            if search.service_status:
                query = query.join(DocumentService).filter(DocumentService.service_status == search.service_status)
            
            query = query.offset(search.offset).limit(search.limit)
        
        return query.order_by(desc(CaseDocument.document_date)).all()

    # Document Service operations
    def create_document_service(self, service_data: DocumentServiceCreate, user_id: int) -> Optional[DocumentService]:
        """Create a document service record with deadline calculation."""
        document = self.db.query(CaseDocument).join(Case).filter(
            CaseDocument.id == service_data.document_id,
            Case.user_id == user_id
        ).first()
        
        if not document:
            return None
        
        # Calculate response deadline based on Ontario Family Court Rules
        days_for_response, response_deadline = self._calculate_service_deadline(
            service_data.service_type,
            service_data.service_date,
            service_data.is_urgent
        )
        
        service = DocumentService(
            **service_data.model_dump(),
            days_for_response=days_for_response,
            response_deadline=response_deadline
        )
        
        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        return service

    def update_document_service(self, service_id: int, service_data: DocumentServiceUpdate, user_id: int) -> Optional[DocumentService]:
        """Update a document service record."""
        service = self.db.query(DocumentService).join(CaseDocument).join(Case).filter(
            DocumentService.id == service_id,
            Case.user_id == user_id
        ).first()
        
        if not service:
            return None
        
        update_data = service_data.model_dump(exclude_unset=True)
        
        # Recalculate deadline if service type or date changed
        if 'service_type' in update_data or 'service_date' in update_data:
            service_type = update_data.get('service_type', service.service_type)
            service_date = update_data.get('service_date', service.service_date)
            is_urgent = update_data.get('is_urgent', service.is_urgent)
            
            days_for_response, response_deadline = self._calculate_service_deadline(
                service_type, service_date, is_urgent
            )
            update_data['days_for_response'] = days_for_response
            update_data['response_deadline'] = response_deadline
        
        for field, value in update_data.items():
            setattr(service, field, value)
        
        self.db.commit()
        self.db.refresh(service)
        return service

    # Case Notes operations
    def create_case_note(self, note_data: CaseNoteCreate, user_id: int) -> Optional[CaseNote]:
        """Create a case note."""
        case = self.get_case(note_data.case_id, user_id)
        if not case:
            return None
        
        note = CaseNote(**note_data.model_dump())
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def get_case_notes(self, case_id: int, user_id: int, search: Optional[NoteSearchQuery] = None) -> List[CaseNote]:
        """Get notes for a case with optional filtering."""
        case = self.get_case(case_id, user_id)
        if not case:
            return []
        
        query = self.db.query(CaseNote).filter(CaseNote.case_id == case_id)
        
        if search:
            if search.q:
                query = query.filter(
                    or_(
                        CaseNote.title.ilike(f"%{search.q}%"),
                        CaseNote.content.ilike(f"%{search.q}%")
                    )
                )
            if search.note_type:
                query = query.filter(CaseNote.note_type == search.note_type)
            if search.priority:
                query = query.filter(CaseNote.priority == search.priority)
            if search.is_completed is not None:
                query = query.filter(CaseNote.is_completed == search.is_completed)
            if search.has_reminder is not None:
                if search.has_reminder:
                    query = query.filter(CaseNote.reminder_date.isnot(None))
                else:
                    query = query.filter(CaseNote.reminder_date.is_(None))
            
            query = query.offset(search.offset).limit(search.limit)
        
        return query.order_by(desc(CaseNote.created_at)).all()

    def update_case_note(self, note_id: int, note_data: CaseNoteUpdate, user_id: int) -> Optional[CaseNote]:
        """Update a case note."""
        note = self.db.query(CaseNote).join(Case).filter(
            CaseNote.id == note_id,
            Case.user_id == user_id
        ).first()
        
        if not note:
            return None
        
        update_data = note_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)
        
        self.db.commit()
        self.db.refresh(note)
        return note

    # Smart Text operations
    def create_smart_text(self, smart_text_data: DocumentSmartTextCreate, user_id: int) -> Optional[DocumentSmartText]:
        """Create smart text for a document."""
        document = self.db.query(CaseDocument).join(Case).filter(
            CaseDocument.id == smart_text_data.document_id,
            Case.user_id == user_id
        ).first()
        
        if not document:
            return None
        
        smart_text = DocumentSmartText(**smart_text_data.model_dump())
        self.db.add(smart_text)
        self.db.commit()
        self.db.refresh(smart_text)
        return smart_text

    # Utility methods for business logic

    def _get_event_category(self, event_type) -> EventCategory:
        """Map event type to category."""
        mapping = {
            'case_conference': EventCategory.conference,
            'settlement_conference': EventCategory.conference,
            'trial_management_conference': EventCategory.conference,
            'regular_motion': EventCategory.motion,
            'urgent_motion': EventCategory.motion,
            'emergency_motion': EventCategory.motion,
            'trial': EventCategory.trial,
            'summary_judgment_motion': EventCategory.trial,
            'show_cause_hearing': EventCategory.hearing,
            'enforcement_hearing': EventCategory.hearing,
            'status_review': EventCategory.hearing,
            'uncontested_hearing': EventCategory.hearing,
            'first_appearance': EventCategory.administrative,
            'scheduling_conference': EventCategory.administrative,
        }
        return mapping.get(event_type.value, EventCategory.administrative)

    def _calculate_service_deadline(self, service_type: ServiceType, service_date: date, is_urgent: bool = False) -> Tuple[int, date]:
        """Calculate response deadline based on Ontario Family Court Rules."""
        # Ontario Family Court Rules service deadlines
        deadline_days = {
            ServiceType.personal: 30,
            ServiceType.mail: 30,
            ServiceType.email: 30,
            ServiceType.courier: 30,
            ServiceType.substituted: 30,
            ServiceType.deemed: 30,
        }
        
        base_days = deadline_days.get(service_type, 30)
        
        # Reduce for urgent matters
        if is_urgent:
            base_days = max(5, base_days // 2)
        
        # Calculate deadline excluding weekends and holidays
        deadline_date = service_date
        days_added = 0
        
        while days_added < base_days:
            deadline_date += timedelta(days=1)
            # Skip weekends (Saturday = 5, Sunday = 6)
            if deadline_date.weekday() < 5:
                days_added += 1
        
        return base_days, deadline_date

    # Dashboard and statistics
    def get_case_dashboard(self, user_id: int) -> Dict[str, Any]:
        """Get dashboard statistics for user's cases."""
        total_cases = self.db.query(Case).filter(Case.user_id == user_id).count()
        active_cases = self.db.query(Case).filter(
            Case.user_id == user_id,
            Case.status == "active"
        ).count()
        
        # Upcoming events (next 30 days)
        upcoming_events = self.db.query(CourtEvent).join(Case).filter(
            Case.user_id == user_id,
            CourtEvent.scheduled_date >= date.today(),
            CourtEvent.scheduled_date <= date.today() + timedelta(days=30),
            CourtEvent.status == "scheduled"
        ).count()
        
        # Overdue services
        overdue_services = self.db.query(DocumentService).join(CaseDocument).join(Case).filter(
            Case.user_id == user_id,
            DocumentService.response_deadline < date.today(),
            DocumentService.service_status.in_(["pending", "served"])
        ).count()
        
        # Urgent notes
        urgent_notes = self.db.query(CaseNote).join(Case).filter(
            Case.user_id == user_id,
            CaseNote.priority == "urgent",
            CaseNote.is_completed == False
        ).count()
        
        # Recent cases
        recent_cases = self.db.query(Case).filter(
            Case.user_id == user_id
        ).order_by(desc(Case.updated_at)).limit(5).all()
        
        return {
            "total_cases": total_cases,
            "active_cases": active_cases,
            "upcoming_events": upcoming_events,
            "overdue_services": overdue_services,
            "urgent_notes": urgent_notes,
            "recent_cases": recent_cases
        }