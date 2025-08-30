"""
Token cleanup utility for maintaining refresh token hygiene.

This module provides functionality to clean up expired refresh tokens
and can be scheduled to run periodically via cron jobs or task schedulers.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from users.models import RefreshToken

# Set up logging
logger = logging.getLogger(__name__)


def cleanup_expired_tokens(
    db: Session, 
    before_date: Optional[datetime] = None,
    batch_size: int = 1000
) -> int:
    """
    Clean up expired refresh tokens from the database.
    
    Args:
        db: Database session
        before_date: Optional cutoff date. If not provided, uses current time
        batch_size: Number of tokens to delete in each batch to avoid long-running transactions
        
    Returns:
        int: Number of tokens cleaned up
    """
    if before_date is None:
        before_date = datetime.utcnow()
    
    logger.info(f"Starting cleanup of refresh tokens expired before {before_date}")
    
    total_deleted = 0
    
    while True:
        # Query for expired tokens in batches
        expired_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.expires_at < before_date)
            .limit(batch_size)
            .all()
        )
        
        if not expired_tokens:
            break
        
        # Log details about what we're deleting
        batch_count = len(expired_tokens)
        oldest_token = min(token.expires_at for token in expired_tokens)
        newest_token = max(token.expires_at for token in expired_tokens)
        
        logger.info(f"Deleting batch of {batch_count} expired tokens (expired between {oldest_token} and {newest_token})")
        
        # Delete the batch
        for token in expired_tokens:
            db.delete(token)
        
        try:
            db.commit()
            total_deleted += batch_count
            logger.info(f"Successfully deleted batch of {batch_count} tokens. Total deleted: {total_deleted}")
        except Exception as e:
            logger.error(f"Error deleting batch of tokens: {str(e)}")
            db.rollback()
            break
    
    logger.info(f"Cleanup completed. Total expired tokens deleted: {total_deleted}")
    return total_deleted


def cleanup_revoked_tokens(
    db: Session,
    before_date: Optional[datetime] = None,
    batch_size: int = 1000
) -> int:
    """
    Clean up revoked refresh tokens that are older than a certain date.
    
    Args:
        db: Database session
        before_date: Optional cutoff date. If not provided, uses 30 days ago
        batch_size: Number of tokens to delete in each batch
        
    Returns:
        int: Number of revoked tokens cleaned up
    """
    if before_date is None:
        # Default to cleaning up revoked tokens older than 30 days
        before_date = datetime.utcnow() - timedelta(days=30)
    
    logger.info(f"Starting cleanup of revoked refresh tokens from before {before_date}")
    
    total_deleted = 0
    
    while True:
        # Query for old revoked tokens in batches
        revoked_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.revoked_at.isnot(None))
            .filter(RefreshToken.revoked_at < before_date)
            .limit(batch_size)
            .all()
        )
        
        if not revoked_tokens:
            break
        
        # Log details about what we're deleting
        batch_count = len(revoked_tokens)
        oldest_revoked = min(token.revoked_at for token in revoked_tokens if token.revoked_at)
        newest_revoked = max(token.revoked_at for token in revoked_tokens if token.revoked_at)
        
        logger.info(f"Deleting batch of {batch_count} old revoked tokens (revoked between {oldest_revoked} and {newest_revoked})")
        
        # Delete the batch
        for token in revoked_tokens:
            db.delete(token)
        
        try:
            db.commit()
            total_deleted += batch_count
            logger.info(f"Successfully deleted batch of {batch_count} revoked tokens. Total deleted: {total_deleted}")
        except Exception as e:
            logger.error(f"Error deleting batch of revoked tokens: {str(e)}")
            db.rollback()
            break
    
    logger.info(f"Revoked token cleanup completed. Total old revoked tokens deleted: {total_deleted}")
    return total_deleted


def get_token_statistics(db: Session) -> dict:
    """
    Get statistics about refresh tokens in the database.
    
    Args:
        db: Database session
        
    Returns:
        dict: Statistics about refresh tokens
    """
    try:
        # Total tokens
        total_tokens = db.query(RefreshToken).count()
        
        # Active tokens (not expired and not revoked)
        current_time = datetime.utcnow()
        active_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.expires_at > current_time)
            .filter(RefreshToken.revoked_at.is_(None))
            .count()
        )
        
        # Expired tokens
        expired_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.expires_at <= current_time)
            .count()
        )
        
        # Revoked tokens
        revoked_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.revoked_at.isnot(None))
            .count()
        )
        
        # Oldest token
        oldest_token = db.query(RefreshToken).order_by(RefreshToken.created_at.asc()).first()
        oldest_date = oldest_token.created_at if oldest_token else None
        
        # Newest token
        newest_token = db.query(RefreshToken).order_by(RefreshToken.created_at.desc()).first()
        newest_date = newest_token.created_at if newest_token else None
        
        stats = {
            "total_tokens": total_tokens,
            "active_tokens": active_tokens,
            "expired_tokens": expired_tokens,
            "revoked_tokens": revoked_tokens,
            "oldest_token_date": oldest_date,
            "newest_token_date": newest_date,
            "cleanup_recommended": expired_tokens > 0 or revoked_tokens > 100
        }
        
        logger.info(f"Token statistics: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting token statistics: {str(e)}")
        return {"error": str(e)}


def full_cleanup(
    db: Session,
    cleanup_expired: bool = True,
    cleanup_old_revoked: bool = True,
    revoked_cutoff_days: int = 30,
    batch_size: int = 1000
) -> dict:
    """
    Perform a full cleanup of refresh tokens.
    
    Args:
        db: Database session
        cleanup_expired: Whether to clean up expired tokens
        cleanup_old_revoked: Whether to clean up old revoked tokens
        revoked_cutoff_days: Number of days after which revoked tokens are cleaned up
        batch_size: Batch size for deletions
        
    Returns:
        dict: Summary of cleanup operations
    """
    logger.info("Starting full refresh token cleanup")
    
    # Get initial statistics
    initial_stats = get_token_statistics(db)
    
    results = {
        "initial_stats": initial_stats,
        "expired_deleted": 0,
        "revoked_deleted": 0,
        "total_deleted": 0,
        "errors": []
    }
    
    try:
        # Cleanup expired tokens
        if cleanup_expired:
            try:
                expired_deleted = cleanup_expired_tokens(db, batch_size=batch_size)
                results["expired_deleted"] = expired_deleted
            except Exception as e:
                error_msg = f"Error cleaning up expired tokens: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
        
        # Cleanup old revoked tokens
        if cleanup_old_revoked:
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=revoked_cutoff_days)
                revoked_deleted = cleanup_revoked_tokens(db, before_date=cutoff_date, batch_size=batch_size)
                results["revoked_deleted"] = revoked_deleted
            except Exception as e:
                error_msg = f"Error cleaning up revoked tokens: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
        
        # Calculate totals
        results["total_deleted"] = results["expired_deleted"] + results["revoked_deleted"]
        
        # Get final statistics
        final_stats = get_token_statistics(db)
        results["final_stats"] = final_stats
        
        logger.info(f"Full cleanup completed. Results: {results}")
        
    except Exception as e:
        error_msg = f"Unexpected error during full cleanup: {str(e)}"
        logger.error(error_msg)
        results["errors"].append(error_msg)
    
    return results


def cleanup_tokens_for_user(db: Session, user_id: int) -> int:
    """
    Clean up all refresh tokens for a specific user.
    Useful when deleting a user account.
    
    Args:
        db: Database session
        user_id: ID of the user whose tokens should be cleaned up
        
    Returns:
        int: Number of tokens deleted
    """
    logger.info(f"Cleaning up all refresh tokens for user {user_id}")
    
    try:
        # Get all tokens for the user
        user_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.user_id == user_id)
            .all()
        )
        
        token_count = len(user_tokens)
        
        if token_count == 0:
            logger.info(f"No refresh tokens found for user {user_id}")
            return 0
        
        # Delete all tokens
        for token in user_tokens:
            db.delete(token)
        
        db.commit()
        
        logger.info(f"Successfully deleted {token_count} refresh tokens for user {user_id}")
        return token_count
        
    except Exception as e:
        logger.error(f"Error cleaning up tokens for user {user_id}: {str(e)}")
        db.rollback()
        raise


# CLI-friendly functions for scheduled execution

def main_cleanup():
    """
    Main cleanup function that can be called from command line or scheduler.
    Uses a new database session and handles all cleanup operations.
    """
    from core.database import SessionLocal
    
    # Set up logging to console for CLI usage
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("Starting scheduled refresh token cleanup")
    
    db = SessionLocal()
    try:
        results = full_cleanup(db)
        
        if results["errors"]:
            logger.error(f"Cleanup completed with errors: {results['errors']}")
            return 1
        else:
            logger.info(f"Cleanup completed successfully. Deleted {results['total_deleted']} tokens.")
            return 0
            
    except Exception as e:
        logger.error(f"Fatal error during cleanup: {str(e)}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    exit_code = main_cleanup()
    sys.exit(exit_code)