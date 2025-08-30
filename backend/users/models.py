from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    roles = Column(String, nullable=True, default='["user"]')  # JSON array of roles
    verification_token = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    # OAuth provider fields
    oauth_providers = Column(String, nullable=True)  # JSON string of providers like ["google", "github"]
    google_id = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    email_connections = relationship("EmailConnection", back_populates="user", cascade="all, delete-orphan")
    
    def has_role(self, role: str) -> bool:
        """Check if user has a specific role"""
        import json
        try:
            user_roles = json.loads(self.roles) if self.roles else []
            return role in user_roles
        except:
            return False
    
    def add_role(self, role: str):
        """Add a role to the user"""
        import json
        try:
            user_roles = json.loads(self.roles) if self.roles else []
            if role not in user_roles:
                user_roles.append(role)
                self.roles = json.dumps(user_roles)
        except:
            self.roles = json.dumps([role])
    
    def get_role_level(self) -> int:
        """Get the highest role level for the user. Higher number = more privileges."""
        if self.is_superuser:
            return 100  # Superuser is highest
        
        import json
        try:
            user_roles = json.loads(self.roles) if self.roles else []
        except:
            user_roles = []
        
        role_hierarchy = {
            "admin": 30,
            "staff": 20,
            "user": 10
        }
        
        max_level = 0
        for role in user_roles:
            level = role_hierarchy.get(role, 0)
            max_level = max(max_level, level)
        
        return max_level
    
    def has_role_level(self, required_level: str) -> bool:
        """Check if user has at least the required role level"""
        role_hierarchy = {
            "user": 10,
            "staff": 20,
            "admin": 30,
            "superuser": 100
        }
        
        required = role_hierarchy.get(required_level, 0)
        current = self.get_role_level()
        
        return current >= required
    
    @property
    def roles_list(self) -> list[str]:
        """Get roles as a Python list for API serialization"""
        import json
        try:
            return json.loads(self.roles) if self.roles else ["user"]
        except:
            return ["user"]


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Profile information
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)  # URL to profile picture
    profile_picture_file_id = Column(Integer, nullable=True)  # Reference to stored file
    
    # Storage quota (in bytes)
    storage_quota = Column(Integer, default=1073741824)  # 1GB default
    storage_used = Column(Integer, default=0)
    
    # Social links
    website = Column(String, nullable=True)
    twitter = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    
    # Privacy settings
    public_profile = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    # Note: StoredFile is in storage.models, imported separately to avoid circular imports
    stored_files = relationship(
        "StoredFile",
        backref="user_profile",
        cascade="all, delete-orphan",
    )


class RefreshToken(Base):
    """Model for storing refresh tokens with enhanced security"""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)  # Hashed for security
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)  # Null means active

    # Optional fields for tracking
    user_agent = Column(String, nullable=True)  # Track device/browser
    ip_address = Column(String, nullable=True)  # Track IP for security

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
