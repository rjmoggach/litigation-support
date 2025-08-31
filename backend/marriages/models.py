from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date, JSON, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class Marriage(Base):
    __tablename__ = "marriages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Marriage participants
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    spouse_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    
    # Marriage timeline
    marriage_date = Column(Date, nullable=False)
    marriage_location = Column(JSON, nullable=True)  # {city, state, country}
    separation_date = Column(Date, nullable=True)
    divorce_date = Column(Date, nullable=True)
    
    # Current status (derived from dates but cached for performance)
    current_status = Column(String(50), nullable=False, default="married")  # married, separated, divorced
    
    # Legal information
    marriage_certificate_file_id = Column(Integer, nullable=True)
    divorce_decree_file_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    person = relationship("Person", foreign_keys=[person_id])
    spouse = relationship("Person", foreign_keys=[spouse_id])
    children_associations = relationship("MarriageChildren", back_populates="marriage", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        # Prevent duplicate marriages between same people
        UniqueConstraint('person_id', 'spouse_id', 'marriage_date', name='unique_marriage'),
        # Add indexes for performance
        Index("ix_marriages_person_id", "person_id"),
        Index("ix_marriages_spouse_id", "spouse_id"),
        Index("ix_marriages_timeline", "marriage_date", "separation_date", "divorce_date"),
    )


class MarriageChildren(Base):
    __tablename__ = "marriage_children"
    
    # Composite primary key
    marriage_id = Column(Integer, ForeignKey("marriages.id", ondelete="CASCADE"), primary_key=True)
    child_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    
    # Custody information
    custody_status = Column(String(50), nullable=False)  # joint, sole_person, sole_spouse, other
    custody_details = Column(Text, nullable=True)
    current_living_with = Column(String(20), nullable=False)  # person, spouse, other, shared
    custody_arrangement_file_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    marriage = relationship("Marriage", back_populates="children_associations")
    child = relationship("Person", foreign_keys=[child_id])
    
    # Indexes for performance
    __table_args__ = (
        Index("ix_marriage_children_marriage_id", "marriage_id"),
        Index("ix_marriage_children_child_id", "child_id"),
    )