import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None


class UserInDBBase(UserBase):
    id: int
    is_verified: bool = False
    roles: list[str] | None = ["user"]
    created_at: datetime
    updated_at: datetime | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True

    @field_validator("roles", mode="before")
    @classmethod
    def parse_roles(cls, v: Any) -> list[str]:
        """Convert JSON string to list if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return ["user"]
        elif isinstance(v, list):
            return v
        elif v is None:
            return ["user"]
        else:
            return ["user"]


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None


class TokenRefreshRequest(BaseModel):
    """Request schema for token refresh endpoint"""
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Response schema for token refresh endpoint"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class TokenWithRefresh(BaseModel):
    """Token response that includes refresh token (for login endpoints)"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class RefreshTokenCreate(BaseModel):
    """Schema for creating a refresh token in the database"""
    token_hash: str
    user_id: int
    expires_at: datetime
    user_agent: str | None = None
    ip_address: str | None = None


class RefreshTokenInDB(BaseModel):
    """Schema for refresh token from database"""
    id: int
    token_hash: str
    user_id: int
    expires_at: datetime
    created_at: datetime
    revoked_at: datetime | None = None
    user_agent: str | None = None
    ip_address: str | None = None

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str


class EmailVerification(BaseModel):
    token: str


class Message(BaseModel):
    message: str


class OAuthLogin(BaseModel):
    email: EmailStr
    provider: str
    provider_id: str
    name: str | None = None


class TokenWithUser(BaseModel):
    access_token: str
    refresh_token: str | None = None  # Optional for backward compatibility
    token_type: str
    expires_in: int | None = None  # Optional for backward compatibility
    user: User


class UserProfileBase(BaseModel):
    bio: str | None = None
    website: str | None = None
    twitter: str | None = None
    linkedin: str | None = None
    github: str | None = None
    public_profile: bool = True


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    avatar_url: str | None = None
    profile_picture_file_id: int | None = None
    storage_quota: int
    storage_used: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfilePictureUploadResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    avatar_url: str
    message: str


# Admin-specific schemas
class UserAdminUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    roles: list[str] | None = None


class UserListResponse(BaseModel):
    users: list[User]
    total: int
    page: int
    per_page: int
    total_pages: int


class UserStatsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    verified_users: int
    unverified_users: int
    superusers: int
    recent_registrations: int


class RecentUserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    created_at: datetime

    class Config:
        from_attributes = True
