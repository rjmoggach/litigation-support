from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    func,
    Index,
)
from sqlalchemy.orm import relationship

from core.database import Base
from tags.mixins import Taggable


class Image(Base, Taggable):
    """
    Image model that extends existing patterns with thumbnail references.
    
    Follows video model patterns with Base class inheritance and Taggable mixin.
    References StoredFile for original and three thumbnail sizes.
    Includes user ownership following existing patterns.
    """
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to original image file
    stored_file_id = Column(Integer, ForeignKey("stored_files.id", ondelete="SET NULL"), nullable=False)
    
    # Image metadata
    title = Column(String, nullable=False, index=True)
    alt_text = Column(String, nullable=True)  # For accessibility
    description = Column(Text, nullable=True)
    
    # Image dimensions
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Thumbnail references (three sizes following design spec)
    thumbnail_sm_id = Column(Integer, ForeignKey("stored_files.id", ondelete="SET NULL"), nullable=True)  # 150px
    thumbnail_md_id = Column(Integer, ForeignKey("stored_files.id", ondelete="SET NULL"), nullable=True)  # 300px  
    thumbnail_lg_id = Column(Integer, ForeignKey("stored_files.id", ondelete="SET NULL"), nullable=True)  # 600px
    
    # User ownership following existing patterns
    user_profile_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Standard timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    stored_file = relationship("StoredFile", foreign_keys=[stored_file_id])
    thumbnail_sm = relationship("StoredFile", foreign_keys=[thumbnail_sm_id])
    thumbnail_md = relationship("StoredFile", foreign_keys=[thumbnail_md_id])
    thumbnail_lg = relationship("StoredFile", foreign_keys=[thumbnail_lg_id])
    user_profile = relationship("UserProfile")
    
    # Gallery relationships (will be added when GalleryImage is created)
    gallery_images = relationship("GalleryImage", back_populates="image", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_images_user_profile_id", "user_profile_id"),
        Index("ix_images_created_at", "created_at"),
    )