import json
from datetime import datetime, date
from typing import Any, Optional, List, Dict

from pydantic import BaseModel, EmailStr, field_validator, Field, ConfigDict


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=500)
    is_active: bool = True
    is_public: bool = True


class CompanyCreate(CompanyBase):
    pass  # Slug will be generated from name


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class CompanyProfileBase(BaseModel):
    description: Optional[str] = None
    industry: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)  # startup, small, medium, large
    founded_year: Optional[int] = Field(None, ge=1800, le=2100)
    address: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, str]] = None
    is_public: bool = True


class CompanyProfileCreate(CompanyProfileBase):
    pass


class CompanyProfileUpdate(CompanyProfileBase):
    is_public: Optional[bool] = None


class CompanyProfileResponse(CompanyProfileBase):
    id: int
    company_id: int
    logo_file_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CompanyResponse(CompanyBase):
    id: int
    slug: str
    profile: Optional[CompanyProfileResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class PersonBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    is_active: bool = True
    is_public: bool = True


class PersonCreate(PersonBase):
    pass  # Slug and full_name will be generated


class PersonUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class PersonProfileBase(BaseModel):
    bio: Optional[str] = None
    title: Optional[str] = Field(None, max_length=255)
    expertise: Optional[List[str]] = None
    location: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, str]] = None
    ssn_last_four: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    preferred_name: Optional[str] = Field(None, max_length=100)
    emergency_contact: Optional[Dict[str, Any]] = None
    is_public: bool = True


class PersonProfileCreate(PersonProfileBase):
    pass


class PersonProfileUpdate(PersonProfileBase):
    is_public: Optional[bool] = None


class PersonProfileResponse(PersonProfileBase):
    id: int
    person_id: int
    avatar_file_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class PersonResponse(PersonBase):
    id: int
    full_name: str
    slug: str
    profile: Optional[PersonProfileResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CompanyPersonAssociationBase(BaseModel):
    role: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_primary: bool = False


class CompanyPersonAssociationCreate(CompanyPersonAssociationBase):
    company_id: int
    person_id: int


class CompanyPersonAssociationUpdate(CompanyPersonAssociationBase):
    pass


class CompanyPersonAssociationResponse(CompanyPersonAssociationBase):
    company_id: int
    person_id: int
    company: Optional["CompanyResponse"] = None
    person: Optional["PersonResponse"] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CompanyWithPeopleResponse(CompanyResponse):
    people: List[PersonResponse] = []
    associations: List[CompanyPersonAssociationResponse] = []


class PersonWithCompaniesResponse(PersonResponse):
    companies: List[CompanyResponse] = []
    associations: List[CompanyPersonAssociationResponse] = []


# TODO: Implement Public schemas (for public-facing endpoints)
# - PublicCompanyResponse: Limited company data for public viewing
# - PublicPersonResponse: Limited person data for public viewing
# - PublicCompanyListResponse: Paginated list of public companies
# - PublicPersonListResponse: Paginated list of public people


# TODO: Implement Media schemas
# - MediaUploadResponse: Response for successful media upload
# - MediaListResponse: List of media files for a profile
# - ProfileMediaUpdate: Schema for updating profile media references


class PersonAddressBase(BaseModel):
    street_address: str = Field(..., min_length=1, max_length=500)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=50)
    zip_code: str = Field(..., min_length=1, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    effective_start_date: date
    effective_end_date: Optional[date] = None
    is_current: bool = True
    address_type: Optional[str] = Field(None, max_length=50)


class PersonAddressCreate(PersonAddressBase):
    person_id: int


class PersonAddressUpdate(BaseModel):
    street_address: Optional[str] = Field(None, min_length=1, max_length=500)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=50)
    zip_code: Optional[str] = Field(None, min_length=1, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None
    is_current: Optional[bool] = None
    address_type: Optional[str] = Field(None, max_length=50)


class PersonAddressResponse(PersonAddressBase):
    id: int
    person_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# TODO: Implement common validators
# - Slug validation and generation
# - Phone number formatting
# - Website URL validation
# - Social links validation
# - Address JSON structure validation