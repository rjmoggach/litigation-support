from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from users.models import User, UserProfile, RefreshToken
from core.security import (
    create_refresh_token,
    hash_refresh_token,
    verify_refresh_token_hash,
    is_refresh_token_expired
)


def get_or_create_user_profile(db: Session, user: User) -> UserProfile:
    """Get or create a UserProfile for the given user"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

    if not profile:
        profile = UserProfile(
            user_id=user.id,
            bio=None,
            storage_quota=1073741824,  # 1GB default
            storage_used=0,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def update_storage_usage(db: Session, user_profile: UserProfile, file_size_delta: int):
    """Update storage usage for a user profile"""
    user_profile.storage_used += file_size_delta
    db.commit()


def check_storage_quota(user_profile: UserProfile, additional_size: int) -> bool:
    """Check if user has enough storage quota for additional file size"""
    return (user_profile.storage_used + additional_size) <= user_profile.storage_quota


# Refresh Token Database Services

def store_refresh_token(
    db: Session, 
    user_id: int, 
    token_hash: str, 
    expires_at: datetime,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> RefreshToken:
    """
    Store a refresh token in the database.
    
    Args:
        db: Database session
        user_id: ID of the user this token belongs to
        token_hash: Hashed token for secure storage
        expires_at: When the token expires
        user_agent: Optional user agent string for tracking
        ip_address: Optional IP address for security tracking
        
    Returns:
        RefreshToken: The created refresh token record
    """
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address
    )
    
    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)
    
    return refresh_token


def get_refresh_token_user(db: Session, token_hash: str) -> Optional[User]:
    """
    Get the user associated with a refresh token hash.
    
    Args:
        db: Database session
        token_hash: Hashed token to look up
        
    Returns:
        Optional[User]: The user if token is valid and not expired/revoked, None otherwise
    """
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked_at.is_(None)  # Not revoked
    ).first()
    
    if not refresh_token:
        return None
    
    # Check if token has expired
    if is_refresh_token_expired(refresh_token.expires_at):
        return None
    
    # Get and return the associated user
    user = db.query(User).filter(User.id == refresh_token.user_id).first()
    return user


def revoke_refresh_token(db: Session, token_hash: str) -> bool:
    """
    Revoke a specific refresh token by setting revoked_at timestamp.
    
    Args:
        db: Database session
        token_hash: Hash of the token to revoke
        
    Returns:
        bool: True if token was found and revoked, False otherwise
    """
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked_at.is_(None)  # Only revoke active tokens
    ).first()
    
    if refresh_token:
        refresh_token.revoked_at = datetime.utcnow()
        db.commit()
        return True
    
    return False


def revoke_user_refresh_tokens(db: Session, user_id: int) -> int:
    """
    Revoke all active refresh tokens for a user.
    
    Args:
        db: Database session
        user_id: ID of the user whose tokens to revoke
        
    Returns:
        int: Number of tokens that were revoked
    """
    active_tokens = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None)
    ).all()
    
    revoked_count = 0
    current_time = datetime.utcnow()
    
    for token in active_tokens:
        token.revoked_at = current_time
        revoked_count += 1
    
    if revoked_count > 0:
        db.commit()
    
    return revoked_count


def cleanup_expired_refresh_tokens(db: Session) -> int:
    """
    Remove expired refresh tokens from the database.
    This is intended to be run as a periodic cleanup job.
    
    Args:
        db: Database session
        
    Returns:
        int: Number of expired tokens that were deleted
    """
    current_time = datetime.utcnow()
    
    # Find all expired tokens
    expired_tokens = db.query(RefreshToken).filter(
        RefreshToken.expires_at < current_time
    )
    
    # Count before deletion
    expired_count = expired_tokens.count()
    
    # Delete expired tokens
    if expired_count > 0:
        expired_tokens.delete()
        db.commit()
    
    return expired_count


def get_user_active_refresh_tokens_count(db: Session, user_id: int) -> int:
    """
    Get the count of active (non-revoked, non-expired) refresh tokens for a user.
    
    Args:
        db: Database session
        user_id: ID of the user
        
    Returns:
        int: Count of active refresh tokens
    """
    current_time = datetime.utcnow()
    
    count = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > current_time
    ).count()
    
    return count
