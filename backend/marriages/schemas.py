from datetime import datetime, date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class MarriageBase(BaseModel):
    person_id: int
    spouse_id: int
    marriage_date: date
    marriage_location: Optional[Dict[str, Any]] = None
    separation_date: Optional[date] = None
    divorce_date: Optional[date] = None
    current_status: str = Field(..., max_length=50)
    marriage_certificate_file_id: Optional[int] = None
    divorce_decree_file_id: Optional[int] = None


class MarriageCreate(MarriageBase):
    pass


class MarriageUpdate(BaseModel):
    marriage_date: Optional[date] = None
    marriage_location: Optional[Dict[str, Any]] = None
    separation_date: Optional[date] = None
    divorce_date: Optional[date] = None
    current_status: Optional[str] = Field(None, max_length=50)
    marriage_certificate_file_id: Optional[int] = None
    divorce_decree_file_id: Optional[int] = None


class MarriageResponse(MarriageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class MarriageChildrenBase(BaseModel):
    marriage_id: int
    child_id: int
    custody_status: str = Field(..., max_length=50)
    custody_details: Optional[str] = None
    current_living_with: str = Field(..., max_length=20)
    custody_arrangement_file_id: Optional[int] = None


class MarriageChildrenCreate(MarriageChildrenBase):
    pass


class MarriageChildrenUpdate(BaseModel):
    custody_status: Optional[str] = Field(None, max_length=50)
    custody_details: Optional[str] = None
    current_living_with: Optional[str] = Field(None, max_length=20)
    custody_arrangement_file_id: Optional[int] = None


class MarriageChildrenResponse(MarriageChildrenBase):
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class MarriageWithChildrenResponse(MarriageResponse):
    children_associations: List[MarriageChildrenResponse] = []


class PersonWithMarriagesResponse(BaseModel):
    person_id: int
    marriages: List[MarriageResponse] = []
    
    model_config = ConfigDict(from_attributes=True)