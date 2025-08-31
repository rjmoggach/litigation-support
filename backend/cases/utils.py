import os
import re
from datetime import date, timedelta
from typing import List, Tuple
from pathlib import Path

from .models import ServiceType, PartyType


class CaseFileUtils:
    """Utility functions for case file organization and management."""
    
    @staticmethod
    def validate_court_file_number(court_file_number: str) -> bool:
        """Validate Ontario court file number format."""
        pattern = r'^FS-\d{2}-\d{5}-\d{4}$'
        return bool(re.match(pattern, court_file_number))
    
    @staticmethod
    def generate_case_directory_structure(court_file_number: str) -> List[str]:
        """Generate list of directories to create for a case."""
        base_path = f"cases/{court_file_number}"
        return [
            base_path,
            f"{base_path}/documents",
            f"{base_path}/documents/court",
            f"{base_path}/documents/respondent",
            f"{base_path}/documents/applicant",
            f"{base_path}/events"
        ]
    
    @staticmethod
    def generate_event_directory_structure(court_file_number: str, event_id: int) -> List[str]:
        """Generate list of directories to create for a court event."""
        base_path = f"cases/{court_file_number}/events/{event_id}"
        return [
            base_path,
            f"{base_path}/documents",
            f"{base_path}/documents/court",
            f"{base_path}/documents/respondent",
            f"{base_path}/documents/applicant"
        ]
    
    @staticmethod
    def generate_stored_filename(
        original_filename: str,
        document_date: date,
        existing_filenames: List[str] = None
    ) -> str:
        """Generate date-prefixed filename with conflict resolution."""
        if existing_filenames is None:
            existing_filenames = []
        
        # Clean original filename
        name, ext = os.path.splitext(original_filename)
        # Remove any existing date prefixes
        name = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', name)
        
        date_prefix = document_date.strftime("%Y-%m-%d")
        base_filename = f"{date_prefix}-{name}{ext}"
        
        # Check for conflicts and add sequence number if needed
        if base_filename not in existing_filenames:
            return base_filename
        
        counter = 1
        while True:
            name_part, ext_part = os.path.splitext(base_filename)
            sequenced_filename = f"{name_part}-{counter:02d}{ext_part}"
            if sequenced_filename not in existing_filenames:
                return sequenced_filename
            counter += 1
    
    @staticmethod
    def get_document_path(
        court_file_number: str,
        party_type: PartyType,
        event_id: int = None,
        filename: str = ""
    ) -> str:
        """Generate document storage path."""
        if event_id:
            base_path = f"cases/{court_file_number}/events/{event_id}/documents/{party_type.value}"
        else:
            base_path = f"cases/{court_file_number}/documents/{party_type.value}"
        
        if filename:
            return f"{base_path}/{filename}"
        return base_path
    
    @staticmethod
    def extract_date_from_filename(filename: str) -> date:
        """Extract date from date-prefixed filename."""
        match = re.match(r'^(\d{4}-\d{2}-\d{2})-.*', filename)
        if match:
            from datetime import datetime
            return datetime.strptime(match.group(1), "%Y-%m-%d").date()
        return None


class ServiceUtils:
    """Utility functions for document service tracking and Ontario Family Court Rules compliance."""
    
    # Ontario Family Court Rules service deadlines (in days)
    SERVICE_DEADLINES = {
        ServiceType.personal: 30,
        ServiceType.mail: 30,
        ServiceType.email: 30,
        ServiceType.courier: 30,
        ServiceType.substituted: 30,
        ServiceType.deemed: 30,
    }
    
    # Urgent matter reductions
    URGENT_REDUCTION_FACTOR = 0.5
    URGENT_MINIMUM_DAYS = 5
    
    @staticmethod
    def calculate_service_deadline(
        service_type: ServiceType,
        service_date: date,
        is_urgent: bool = False
    ) -> Tuple[int, date]:
        """Calculate response deadline based on Ontario Family Court Rules."""
        base_days = ServiceUtils.SERVICE_DEADLINES.get(service_type, 30)
        
        # Adjust for urgent matters
        if is_urgent:
            adjusted_days = max(
                ServiceUtils.URGENT_MINIMUM_DAYS,
                int(base_days * ServiceUtils.URGENT_REDUCTION_FACTOR)
            )
        else:
            adjusted_days = base_days
        
        # Calculate deadline excluding weekends and common holidays
        deadline_date = ServiceUtils._add_business_days(service_date, adjusted_days)
        
        return adjusted_days, deadline_date
    
    @staticmethod
    def _add_business_days(start_date: date, business_days: int) -> date:
        """Add business days to a date, excluding weekends."""
        current_date = start_date
        days_added = 0
        
        while days_added < business_days:
            current_date += timedelta(days=1)
            # Skip weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() < 5:
                days_added += 1
        
        return current_date
    
    @staticmethod
    def get_service_urgency_level(service_type: ServiceType, days_until_deadline: int) -> str:
        """Determine urgency level based on remaining days until deadline."""
        if days_until_deadline < 0:
            return "overdue"
        elif days_until_deadline <= 3:
            return "critical"
        elif days_until_deadline <= 7:
            return "urgent"
        elif days_until_deadline <= 14:
            return "attention"
        else:
            return "normal"
    
    @staticmethod
    def validate_service_dates(service_date: date, received_date: date = None) -> List[str]:
        """Validate service date logic."""
        errors = []
        
        if service_date > date.today():
            errors.append("Service date cannot be in the future")
        
        if received_date:
            if received_date < service_date:
                errors.append("Received date cannot be before service date")
            if received_date > date.today():
                errors.append("Received date cannot be in the future")
        
        return errors
    
    @staticmethod
    def generate_affidavit_of_service_data(
        document_name: str,
        service_date: date,
        served_on: str,
        service_type: ServiceType,
        service_address: dict = None
    ) -> dict:
        """Generate data structure for affidavit of service preparation."""
        return {
            "document_served": document_name,
            "service_date": service_date.strftime("%B %d, %Y"),
            "served_on": served_on,
            "service_method": service_type.value.replace("_", " ").title(),
            "service_address": service_address or {},
            "affidavit_date": date.today().strftime("%B %d, %Y"),
            "jurisdiction": "Ontario Superior Court of Justice (Family Court)"
        }


class CaseSearchUtils:
    """Utility functions for case search and filtering."""
    
    @staticmethod
    def build_search_query_parts(search_term: str) -> List[str]:
        """Break down search term into searchable parts."""
        if not search_term:
            return []
        
        parts = []
        
        # Check if it looks like a court file number
        if re.match(r'FS-\d{2}-\d{5}-\d{4}', search_term):
            parts.append(f"court_file_number:{search_term}")
        elif re.match(r'\d{2}-\d{5}-\d{4}', search_term):
            parts.append(f"court_file_number:FS-{search_term}")
        
        # Split into individual words for text search
        words = re.findall(r'\b\w+\b', search_term.lower())
        parts.extend(words)
        
        return parts
    
    @staticmethod
    def highlight_matches(text: str, search_terms: List[str]) -> str:
        """Highlight matching terms in text for search results."""
        if not search_terms or not text:
            return text
        
        highlighted = text
        for term in search_terms:
            pattern = re.compile(f'({re.escape(term)})', re.IGNORECASE)
            highlighted = pattern.sub(r'<mark>\1</mark>', highlighted)
        
        return highlighted
    
    @staticmethod
    def extract_document_metadata(filename: str) -> dict:
        """Extract metadata from document filename."""
        metadata = {
            "original_name": filename,
            "date_prefix": None,
            "extension": None,
            "type_hint": None
        }
        
        # Extract date prefix
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})-(.+)', filename)
        if date_match:
            metadata["date_prefix"] = date_match.group(1)
            filename_without_date = date_match.group(2)
        else:
            filename_without_date = filename
        
        # Extract extension
        name, ext = os.path.splitext(filename_without_date)
        metadata["extension"] = ext.lower()
        
        # Guess document type from filename
        name_lower = name.lower()
        if any(word in name_lower for word in ["affidavit", "sworn"]):
            metadata["type_hint"] = "affidavit"
        elif any(word in name_lower for word in ["financial", "income", "expense"]):
            metadata["type_hint"] = "financial_statement"
        elif any(word in name_lower for word in ["motion", "notice"]):
            metadata["type_hint"] = "notice_of_motion"
        elif any(word in name_lower for word in ["order", "judgment"]):
            metadata["type_hint"] = "court_order"
        elif any(word in name_lower for word in ["letter", "email", "correspondence"]):
            metadata["type_hint"] = "correspondence"
        
        return metadata


class ValidationUtils:
    """Utility functions for data validation."""
    
    @staticmethod
    def validate_postal_code(postal_code: str) -> bool:
        """Validate Canadian postal code format."""
        if not postal_code:
            return True  # Optional field
        
        # Remove spaces and convert to uppercase
        clean_code = postal_code.replace(" ", "").upper()
        pattern = r'^[A-Z]\d[A-Z]\d[A-Z]\d$'
        return bool(re.match(pattern, clean_code))
    
    @staticmethod
    def format_postal_code(postal_code: str) -> str:
        """Format postal code with proper spacing."""
        if not postal_code:
            return postal_code
        
        clean_code = postal_code.replace(" ", "").upper()
        if len(clean_code) == 6:
            return f"{clean_code[:3]} {clean_code[3:]}"
        return postal_code
    
    @staticmethod
    def validate_court_location(location: str) -> bool:
        """Validate that court location is a recognized Ontario court."""
        ontario_courts = [
            "ontario superior court of justice",
            "superior court of justice",
            "family court",
            "unified family court"
        ]
        
        location_lower = location.lower()
        return any(court in location_lower for court in ontario_courts)
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage."""
        # Remove or replace unsafe characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove multiple consecutive underscores
        sanitized = re.sub(r'_+', '_', sanitized)
        # Trim underscores from ends
        sanitized = sanitized.strip('_')
        # Limit length
        name, ext = os.path.splitext(sanitized)
        if len(name) > 200:
            name = name[:200]
        return name + ext