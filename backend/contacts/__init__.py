"""
Contacts domain package for managing companies and people.

This package provides models, schemas, and API endpoints for:
- Company and CompanyProfile management
- Person and PersonProfile management  
- Company-Person associations and relationships
- Media storage and file management for profiles
- Public and administrative access patterns
"""

# Models and schemas will be imported after implementation
# from .models import (
#     Company,
#     CompanyProfile,
#     Person,
#     PersonProfile,
#     CompanyPersonAssociation,
# )
# from .schemas import (
#     CompanyBase,
#     CompanyCreate,
#     CompanyUpdate,
#     CompanyResponse,
#     PersonBase,
#     PersonCreate,
#     PersonUpdate,
#     PersonResponse,
#     CompanyPersonAssociationCreate,
#     CompanyPersonAssociationResponse,
# )

__all__ = [
    # Models
    "Company",
    "CompanyProfile",
    "Person",
    "PersonProfile",
    "CompanyPersonAssociation",
    # Company schemas
    "CompanyBase",
    "CompanyCreate",
    "CompanyUpdate",
    "CompanyResponse",
    # Person schemas
    "PersonBase",
    "PersonCreate",
    "PersonUpdate",
    "PersonResponse",
    # Association schemas
    "CompanyPersonAssociationCreate",
    "CompanyPersonAssociationResponse",
]

# Package configuration constants
COMPANY_SLUG_MAX_LENGTH = 100
PERSON_SLUG_MAX_LENGTH = 100
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100

# Media storage paths
COMPANY_MEDIA_PATH = "contacts/companies/{slug}/"
PERSON_MEDIA_PATH = "contacts/people/{slug}/"

# Field size limits
NAME_MAX_LENGTH = 255
EMAIL_MAX_LENGTH = 255
PHONE_MAX_LENGTH = 50
WEBSITE_MAX_LENGTH = 500
DESCRIPTION_MAX_LENGTH = 5000