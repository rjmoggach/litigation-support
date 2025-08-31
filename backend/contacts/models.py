from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, 
    Integer, 
    String, 
    Boolean, 
    DateTime, 
    Text, 
    ForeignKey,
    Date,
    JSON,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    is_public = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    profile = relationship("CompanyProfile", back_populates="company", uselist=False, cascade="all, delete-orphan")
    associations = relationship("CompanyPersonAssociation", back_populates="company", cascade="all, delete-orphan")
    
    @property
    def people(self):
        """Get all people associated with this company"""
        return [assoc.person for assoc in self.associations if assoc.person]


class CompanyProfile(Base):
    __tablename__ = "company_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    logo_file_id = Column(Integer, nullable=True)  # Reference to stored file
    industry = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)  # startup, small, medium, large
    founded_year = Column(Integer, nullable=True)
    address = Column(JSON, nullable=True)  # Flexible address structure
    social_links = Column(JSON, nullable=True)  # {twitter: "", linkedin: "", etc}
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="profile")


class Person(Base):
    __tablename__ = "people"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False, index=True)
    middle_name = Column(String(100), nullable=True, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    full_name = Column(String(255), nullable=False, index=True)  # Computed on save
    slug = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Personal information fields for legal proceedings
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    is_public = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    profile = relationship("PersonProfile", back_populates="person", uselist=False, cascade="all, delete-orphan")
    associations = relationship("CompanyPersonAssociation", back_populates="person", cascade="all, delete-orphan")
    addresses = relationship("PersonAddress", back_populates="person", cascade="all, delete-orphan")
    
    @property
    def companies(self):
        """Get all companies associated with this person"""
        return [assoc.company for assoc in self.associations if assoc.company]
    
    def compute_full_name(self):
        """Compute and set the full_name field"""
        name_parts = [self.first_name, self.middle_name, self.last_name]
        self.full_name = " ".join(part for part in name_parts if part and part.strip()).strip()


class PersonProfile(Base):
    __tablename__ = "person_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_file_id = Column(Integer, nullable=True)  # Reference to stored file
    title = Column(String(255), nullable=True)  # Professional title
    expertise = Column(JSON, nullable=True)  # Array of expertise areas
    location = Column(JSON, nullable=True)  # {city: "", state: "", country: ""}
    social_links = Column(JSON, nullable=True)  # {twitter: "", linkedin: "", github: ""}
    
    # Legal proceeding specific information
    ssn_last_four = Column(String(4), nullable=True)  # Optional, will be encrypted
    preferred_name = Column(String(100), nullable=True)
    emergency_contact = Column(JSON, nullable=True)
    
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    person = relationship("Person", back_populates="profile")


class PersonAddress(Base):
    __tablename__ = "person_addresses"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    
    # Address fields
    street_address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=True, default="United States")
    
    # Temporal fields
    effective_start_date = Column(Date, nullable=False)
    effective_end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)
    
    # Address type
    address_type = Column(String(50), default="residence")  # residence, mailing, work, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    person = relationship("Person", back_populates="addresses")


class CompanyPersonAssociation(Base):
    __tablename__ = "company_person_associations"
    
    # Composite primary key
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    
    # Association metadata
    role = Column(String(255), nullable=True)  # Role/position at company
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)  # Null for current associations
    is_primary = Column(Boolean, default=False)  # Primary company for person
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="associations")
    person = relationship("Person", back_populates="associations")
    
    # Add indexes for performance
    __table_args__ = (
        Index("ix_company_person_associations_company_id", "company_id"),
        Index("ix_company_person_associations_person_id", "person_id"),
    )