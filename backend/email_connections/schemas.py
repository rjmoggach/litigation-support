from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator


class EmailConnectionBase(BaseModel):
    """Base schema for EmailConnection"""
    email_address: EmailStr = Field(
        ..., 
        description="Email address of the connected account",
        example="user@gmail.com"
    )
    provider: str = Field(
        default="google",
        description="OAuth provider (currently only 'google' is supported)",
        example="google"
    )
    connection_name: Optional[str] = Field(
        None,
        description="User-friendly name for the connection",
        example="Work Gmail Account"
    )


class EmailConnectionCreate(EmailConnectionBase):
    """Schema for creating a new email connection"""
    provider_account_id: str
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    scopes_granted: List[str]
    oauth_data: Optional[dict] = None


class EmailConnectionUpdate(BaseModel):
    """Schema for updating an email connection"""
    connection_name: Optional[str] = None
    connection_status: Optional[str] = None
    
    @validator('connection_status')
    def validate_status(cls, v):
        if v and v not in ['active', 'expired', 'error', 'revoked']:
            raise ValueError('Invalid connection status')
        return v


class EmailConnectionResponse(EmailConnectionBase):
    """Schema for email connection responses"""
    id: int
    user_id: int
    provider_account_id: str
    connection_status: str
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    scopes_granted: List[str]
    
    # Security: Never expose encrypted tokens in responses
    
    class Config:
        from_attributes = True
    
    @validator('scopes_granted', pre=True)
    def parse_scopes(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v or []


class ConnectionStatus(BaseModel):
    """Schema for connection status information"""
    connection_id: int
    email_address: EmailStr
    status: str
    is_active: bool
    is_expired: bool
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None


class OAuthInitiateRequest(BaseModel):
    """Schema for initiating OAuth flow"""
    provider: str = Field(
        default="google",
        description="OAuth provider to use for authentication",
        example="google"
    )
    scopes: List[str] = Field(
        default_factory=lambda: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ],
        description="List of OAuth scopes to request from the provider",
        example=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
    )
    redirect_uri: Optional[str] = Field(
        None,
        description="Custom OAuth callback URL (defaults to backend callback if not provided)",
        example="https://yourapp.com/oauth/callback"
    )


class OAuthInitiateResponse(BaseModel):
    """Schema for OAuth initiation response"""
    authorization_url: str = Field(
        ...,
        description="Complete OAuth authorization URL to redirect user to",
        example="https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=...&state=..."
    )
    state: str = Field(
        ...,
        description="Secure state parameter for CSRF protection (store this for validation)",
        example="secure_random_state_string_123456"
    )
    provider: str = Field(
        ...,
        description="OAuth provider being used",
        example="google"
    )


class OAuthCallbackRequest(BaseModel):
    """Schema for OAuth callback processing"""
    code: str
    state: str
    provider: str = "google"
    redirect_uri: Optional[str] = None


class OAuthCallbackResponse(BaseModel):
    """Schema for OAuth callback response"""
    connection_id: int
    email_address: EmailStr
    connection_name: str
    status: str
    message: str


class ConnectionHealthCheck(BaseModel):
    """Schema for connection health check results"""
    connection_id: int
    is_healthy: bool
    status: str
    last_checked: datetime
    error_details: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    needs_reauth: bool = False


class BulkConnectionStatus(BaseModel):
    """Schema for bulk connection status"""
    user_id: int
    total_connections: int
    active_connections: int
    expired_connections: int
    error_connections: int
    connections: List[ConnectionStatus]


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh requests"""
    connection_id: int


class TokenRefreshResponse(BaseModel):
    """Schema for token refresh responses"""
    connection_id: int
    success: bool
    new_expires_at: Optional[datetime] = None
    error_message: Optional[str] = None


class ConnectionListResponse(BaseModel):
    """Schema for listing user connections"""
    connections: List[EmailConnectionResponse]
    total: int
    active: int
    expired: int
    error: int


class ConnectionDeleteResponse(BaseModel):
    """Schema for connection deletion response"""
    message: str
    connection_id: int
    email_address: EmailStr


# Error schemas
class ConnectionError(BaseModel):
    """Schema for connection-related errors"""
    error_type: str
    error_message: str
    connection_id: Optional[int] = None
    email_address: Optional[EmailStr] = None
    suggested_action: Optional[str] = None


class OAuthError(BaseModel):
    """Schema for OAuth-related errors"""
    error: str
    error_description: Optional[str] = None
    error_uri: Optional[str] = None
    state: Optional[str] = None