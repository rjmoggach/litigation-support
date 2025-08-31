"""
Custom exceptions for email connections with detailed error information.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status


class EmailConnectionException(HTTPException):
    """Base exception for email connection operations."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        user_message: str,
        recovery_action: str = "retry",
        technical_details: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code
        self.user_message = user_message
        self.recovery_action = recovery_action
        self.technical_details = technical_details


class ConnectionNotFoundException(EmailConnectionException):
    """Connection not found."""
    
    def __init__(self, connection_id: int, user_id: Optional[int] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email connection {connection_id} not found",
            error_code="CONNECTION_NOT_FOUND",
            user_message="The email connection could not be found.",
            recovery_action="refresh",
            technical_details=f"Connection ID {connection_id} for user {user_id}"
        )
        self.connection_id = connection_id
        self.user_id = user_id


class ConnectionAlreadyExistsException(EmailConnectionException):
    """Connection already exists for this email address."""
    
    def __init__(self, email: str, existing_id: int):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Connection already exists for {email}",
            error_code="CONNECTION_ALREADY_EXISTS",
            user_message="This email account is already connected.",
            recovery_action="none",
            technical_details=f"Existing connection ID: {existing_id}"
        )
        self.email = email
        self.existing_id = existing_id


class OAuthStateException(EmailConnectionException):
    """OAuth state validation failed."""
    
    def __init__(self, state: str, reason: str = "Invalid or expired"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth state validation failed: {reason}",
            error_code="OAUTH_INVALID_STATE",
            user_message="Security validation failed during account connection.",
            recovery_action="retry",
            technical_details=f"State: {state}, Reason: {reason}"
        )
        self.state = state
        self.reason = reason


class OAuthTokenException(EmailConnectionException):
    """OAuth token exchange failed."""
    
    def __init__(self, reason: str, provider_error: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth token exchange failed: {reason}",
            error_code="OAUTH_TOKEN_FAILED",
            user_message="Failed to complete account connection.",
            recovery_action="retry",
            technical_details=f"Reason: {reason}, Provider Error: {provider_error}"
        )
        self.reason = reason
        self.provider_error = provider_error


class ConnectionExpiredException(EmailConnectionException):
    """Connection access token has expired."""
    
    def __init__(self, connection_id: int, email: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Connection {connection_id} has expired",
            error_code="CONNECTION_EXPIRED",
            user_message="Your email account connection has expired.",
            recovery_action="re_authorize",
            technical_details=f"Connection {connection_id} ({email}) requires token refresh"
        )
        self.connection_id = connection_id
        self.email = email


class ConnectionRevokedException(EmailConnectionException):
    """Connection has been revoked by the user."""
    
    def __init__(self, connection_id: int, email: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Connection {connection_id} has been revoked",
            error_code="CONNECTION_REVOKED",
            user_message="Access to your email account has been revoked.",
            recovery_action="re_authorize",
            technical_details=f"Connection {connection_id} ({email}) was revoked by user"
        )
        self.connection_id = connection_id
        self.email = email


class EmailServiceException(EmailConnectionException):
    """Gmail/Email service is unavailable."""
    
    def __init__(self, service: str = "Gmail", reason: str = "Service unavailable"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{service} service error: {reason}",
            error_code="EMAIL_SERVICE_UNAVAILABLE",
            user_message=f"{service} service is temporarily unavailable.",
            recovery_action="retry",
            technical_details=f"Service: {service}, Reason: {reason}"
        )
        self.service = service
        self.reason = reason


class EmailQuotaExceededException(EmailConnectionException):
    """Email API quota has been exceeded."""
    
    def __init__(self, quota_type: str = "daily", limit: Optional[int] = None):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Email API {quota_type} quota exceeded",
            error_code="EMAIL_QUOTA_EXCEEDED",
            user_message=f"{quota_type.title()} email API limit reached.",
            recovery_action="retry",
            technical_details=f"Quota type: {quota_type}, Limit: {limit}",
            headers={"Retry-After": "3600"}  # 1 hour
        )
        self.quota_type = quota_type
        self.limit = limit


class TokenRefreshException(EmailConnectionException):
    """Failed to refresh access token."""
    
    def __init__(self, connection_id: int, reason: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed for connection {connection_id}: {reason}",
            error_code="TOKEN_REFRESH_FAILED",
            user_message="Unable to refresh your email account connection.",
            recovery_action="re_authorize",
            technical_details=f"Connection {connection_id}, Reason: {reason}"
        )
        self.connection_id = connection_id
        self.reason = reason


class ConnectionHealthException(EmailConnectionException):
    """Connection health check failed."""
    
    def __init__(self, connection_id: int, health_error: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed for connection {connection_id}",
            error_code="CONNECTION_HEALTH_FAILED",
            user_message="Email connection health check failed.",
            recovery_action="retry",
            technical_details=f"Connection {connection_id}, Error: {health_error}"
        )
        self.connection_id = connection_id
        self.health_error = health_error


class ValidationException(EmailConnectionException):
    """Input validation failed."""
    
    def __init__(self, field: str, message: str, value: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation failed for {field}: {message}",
            error_code="VALIDATION_FAILED",
            user_message=f"Invalid {field}: {message}",
            recovery_action="none",
            technical_details=f"Field: {field}, Value: {value}, Message: {message}"
        )
        self.field = field
        self.message = message
        self.value = value


# Helper function to format exception response
def format_exception_response(exc: EmailConnectionException) -> dict:
    """Format an exception into a consistent API response."""
    return {
        "error": {
            "code": exc.error_code,
            "message": exc.detail,
            "user_message": exc.user_message,
            "recovery_action": exc.recovery_action,
            "technical_details": exc.technical_details,
            "timestamp": "timestamp_would_be_added_by_middleware"
        }
    }