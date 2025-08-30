from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class StoredFile(Base):
    __tablename__ = "stored_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    
    # Dropbox specific fields
    dropbox_path = Column(String, nullable=True)
    dropbox_id = Column(String, nullable=True)
    sharing_info = Column(Text, nullable=True)  # JSON string for sharing links
    
    # Metadata
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    user_profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    
    # File categorization
    category = Column(String, default="general")  # general, avatar, document, image, etc.
    
    # Relationships  
    # Note: UserProfile is in users.models, so we use string reference to avoid circular imports
    # Back-references to models that consume StoredFile
    video_files = relationship("VideoFile", back_populates="stored_file", passive_deletes=True)
    video_resolutions = relationship("VideoResolution", back_populates="stored_file", passive_deletes=True)
    thumbnails = relationship("VideoProfile", back_populates="thumbnail", passive_deletes=True)