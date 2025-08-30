"""
Utilities for email connection management, including token encryption and validation.
"""

import base64
import secrets
from datetime import datetime, timezone
from typing import Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from core.config import settings


def _get_encryption_key() -> bytes:
    """
    Generate a consistent encryption key from the application secret.
    Uses PBKDF2 to derive a Fernet-compatible key from the SECRET_KEY.
    """
    # Use a fixed salt for consistency - in production, consider per-connection salts
    salt = b"email_connection_salt_v1"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # Fernet requires 32-byte keys
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return key


def encrypt_token(token: str) -> str:
    """
    Encrypt an OAuth token for secure storage.
    
    Args:
        token: The plaintext OAuth token
        
    Returns:
        str: Base64-encoded encrypted token
    """
    if not token:
        return ""
    
    try:
        key = _get_encryption_key()
        f = Fernet(key)
        encrypted_token = f.encrypt(token.encode())
        return base64.urlsafe_b64encode(encrypted_token).decode()
    except Exception as e:
        raise ValueError(f"Failed to encrypt token: {str(e)}")


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt an OAuth token for use.
    
    Args:
        encrypted_token: Base64-encoded encrypted token
        
    Returns:
        str: The plaintext OAuth token
    """
    if not encrypted_token:
        return ""
    
    try:
        key = _get_encryption_key()
        f = Fernet(key)
        # Decode the base64 wrapper first
        token_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
        decrypted_token = f.decrypt(token_bytes)
        return decrypted_token.decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt token: {str(e)}")


def is_token_expired(expires_at: Optional[datetime]) -> bool:
    """
    Check if a token is expired.
    
    Args:
        expires_at: Token expiration datetime (timezone-aware)
        
    Returns:
        bool: True if token is expired or expiration is unknown
    """
    if not expires_at:
        return True
    
    # Ensure both datetimes are timezone-aware for comparison
    now = datetime.now(timezone.utc)
    
    # If expires_at is naive, assume it's UTC
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    return expires_at <= now


def get_token_expiry_buffer() -> int:
    """
    Get the buffer time (in seconds) before token expiry to trigger refresh.
    
    Returns:
        int: Buffer time in seconds (default 5 minutes)
    """
    return getattr(settings, 'TOKEN_REFRESH_BUFFER_SECONDS', 300)


def should_refresh_token(expires_at: Optional[datetime]) -> bool:
    """
    Check if a token should be refreshed (within the buffer period).
    
    Args:
        expires_at: Token expiration datetime
        
    Returns:
        bool: True if token should be refreshed
    """
    if not expires_at:
        return True
    
    buffer_seconds = get_token_expiry_buffer()
    now = datetime.now(timezone.utc)
    
    # If expires_at is naive, assume it's UTC
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    # Check if token expires within the buffer period
    buffer_time = expires_at.timestamp() - buffer_seconds
    return now.timestamp() >= buffer_time


def validate_oauth_scopes(required_scopes: list[str], granted_scopes: list[str]) -> bool:
    """
    Validate that all required OAuth scopes are granted.
    
    Args:
        required_scopes: List of scopes required for operation
        granted_scopes: List of scopes granted by user
        
    Returns:
        bool: True if all required scopes are granted
    """
    if not required_scopes:
        return True
    
    if not granted_scopes:
        return False
    
    # Check if all required scopes are in granted scopes
    return all(scope in granted_scopes for scope in required_scopes)


def generate_oauth_state() -> str:
    """
    Generate a cryptographically secure state parameter for OAuth flows.
    
    Returns:
        str: Secure random state string
    """
    return secrets.token_urlsafe(32)


def parse_scopes_string(scopes_str: str) -> list[str]:
    """
    Parse a scopes string (JSON or space-separated) into a list.
    
    Args:
        scopes_str: Scopes as JSON array string or space-separated string
        
    Returns:
        list[str]: List of individual scopes
    """
    if not scopes_str:
        return []
    
    # Try parsing as JSON first
    try:
        import json
        parsed = json.loads(scopes_str)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Fall back to space-separated parsing
    return scopes_str.split()


def scopes_to_string(scopes: list[str]) -> str:
    """
    Convert a list of scopes to a JSON string for storage.
    
    Args:
        scopes: List of OAuth scopes
        
    Returns:
        str: JSON string representation of scopes
    """
    import json
    return json.dumps(scopes) if scopes else "[]"


def get_connection_display_name(email: str, connection_name: Optional[str] = None) -> str:
    """
    Get a user-friendly display name for a connection.
    
    Args:
        email: Email address of the connection
        connection_name: Optional user-provided name
        
    Returns:
        str: Display name for the connection
    """
    if connection_name:
        return f"{connection_name} ({email})"
    return email


def sanitize_error_message(error_msg: str, max_length: int = 500) -> str:
    """
    Sanitize error messages for safe storage and display.
    
    Args:
        error_msg: Raw error message
        max_length: Maximum length for truncation
        
    Returns:
        str: Sanitized error message
    """
    if not error_msg:
        return ""
    
    # Remove sensitive information patterns
    import re
    
    # Remove potential tokens, keys, or credentials
    patterns_to_remove = [
        r'access_token["\s]*[:=]["\s]*[^"\s]+',
        r'refresh_token["\s]*[:=]["\s]*[^"\s]+',
        r'client_secret["\s]*[:=]["\s]*[^"\s]+',
        r'password["\s]*[:=]["\s]*[^"\s]+',
        r'key["\s]*[:=]["\s]*[^"\s]+',
    ]
    
    sanitized = error_msg
    for pattern in patterns_to_remove:
        sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
    
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length - 3] + "..."
    
    return sanitized


# Default OAuth scopes for Gmail access
GMAIL_DEFAULT_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

GMAIL_FULL_ACCESS_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email", 
    "https://www.googleapis.com/auth/userinfo.profile"
]