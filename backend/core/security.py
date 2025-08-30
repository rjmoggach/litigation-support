from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import hashlib
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_verification_token(email: str) -> str:
    data = {"sub": email, "type": "verification"}
    expires_delta = timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
    return create_access_token(data, expires_delta)


def create_reset_token(email: str) -> str:
    data = {"sub": email, "type": "reset"}
    expires_delta = timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    return create_access_token(data, expires_delta)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_random_token() -> str:
    return secrets.token_urlsafe(32)


# Refresh Token Utilities

def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """
    Create a refresh token for a user.
    
    Returns:
        tuple: (raw_token, token_hash, expires_at)
    """
    # Generate cryptographically secure random token
    raw_token = secrets.token_urlsafe(32)
    
    # Hash the token for secure storage
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    # Calculate expiration using configurable days (timezone-aware)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    return raw_token, token_hash, expires_at


def hash_refresh_token(raw_token: str) -> str:
    """
    Hash a refresh token for secure storage.
    
    Args:
        raw_token: The raw refresh token string
        
    Returns:
        str: SHA256 hash of the token
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def verify_refresh_token_hash(raw_token: str, stored_hash: str) -> bool:
    """
    Verify a raw refresh token against its stored hash.
    
    Args:
        raw_token: The raw refresh token to verify
        stored_hash: The stored hash from the database
        
    Returns:
        bool: True if token matches hash, False otherwise
    """
    token_hash = hash_refresh_token(raw_token)
    return secrets.compare_digest(token_hash, stored_hash)


def is_refresh_token_expired(expires_at: datetime) -> bool:
    """
    Check if a refresh token has expired.
    
    Args:
        expires_at: The expiration datetime of the token
        
    Returns:
        bool: True if token is expired, False otherwise
    """
    # Use timezone-aware datetime for comparison
    current_time = datetime.now(timezone.utc)
    
    # Make both datetimes timezone-aware for comparison
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    return current_time > expires_at


def get_refresh_token_expiry_days() -> int:
    """
    Get the number of days until refresh token expiry.
    Can be configured via settings in the future.
    
    Returns:
        int: Number of days (default: 7)
    """
    # Use settings if available, otherwise default to 7 days
    return getattr(settings, 'REFRESH_TOKEN_EXPIRE_DAYS', 7)