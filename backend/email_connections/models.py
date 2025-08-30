from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class EmailConnection(Base):
    """Model for storing user's additional email account connections"""
    __tablename__ = "email_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email_address = Column(String, nullable=False, index=True)
    provider = Column(String, default="google", nullable=False)
    provider_account_id = Column(String, nullable=False, index=True)  # Google account ID
    connection_name = Column(String, nullable=True)  # User-friendly name
    
    # OAuth token data (encrypted)
    access_token_encrypted = Column(Text, nullable=False)
    refresh_token_encrypted = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Connection metadata
    scopes_granted = Column(String, nullable=False)  # JSON array of granted scopes
    connection_status = Column(String, default="active", nullable=False)  # active, expired, error, revoked, archived
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)  # Soft delete for connections with related data
    archived_at = Column(DateTime(timezone=True), nullable=True)  # When it was archived
    
    # OAuth provider specific data
    oauth_data = Column(Text, nullable=True)  # JSON string for additional provider data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="email_connections")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_email_connections_user_email', 'user_id', 'email_address'),
        Index('ix_email_connections_status', 'user_id', 'connection_status'),
        Index('ix_email_connections_provider', 'user_id', 'provider'),
    )
    
    def __repr__(self):
        return f"<EmailConnection(id={self.id}, user_id={self.user_id}, email={self.email_address}, status={self.connection_status})>"
    
    @property
    def is_active(self) -> bool:
        """Check if the connection is active"""
        return self.connection_status == "active"
    
    @property
    def is_expired(self) -> bool:
        """Check if the connection tokens are expired"""
        if not self.token_expires_at:
            return False
        return self.token_expires_at < datetime.utcnow().replace(tzinfo=self.token_expires_at.tzinfo)
    
    @property
    def display_name(self) -> str:
        """Get display name for the connection"""
        return self.connection_name or self.email_address
    
    def mark_as_error(self, error_message: str):
        """Mark connection as having an error"""
        self.connection_status = "error"
        self.error_message = error_message
    
    def mark_as_expired(self):
        """Mark connection as expired"""
        self.connection_status = "expired"
        self.error_message = "OAuth tokens have expired"
    
    def mark_as_active(self):
        """Mark connection as active"""
        self.connection_status = "active"
        self.error_message = None
        self.last_sync_at = func.now()
    
    def get_scopes_list(self) -> list[str]:
        """Get scopes as a Python list"""
        import json
        try:
            return json.loads(self.scopes_granted) if self.scopes_granted else []
        except json.JSONDecodeError:
            return []
    
    def set_scopes_list(self, scopes: list[str]):
        """Set scopes from a Python list"""
        import json
        self.scopes_granted = json.dumps(scopes)
    
    def get_oauth_data(self) -> dict:
        """Get OAuth data as a Python dict"""
        import json
        try:
            return json.loads(self.oauth_data) if self.oauth_data else {}
        except json.JSONDecodeError:
            return {}
    
    def set_oauth_data(self, data: dict):
        """Set OAuth data from a Python dict"""
        import json
        self.oauth_data = json.dumps(data) if data else None