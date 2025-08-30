"""
Dependency injection for email connections module.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from users.models import User
from users.deps import get_current_active_user
from email_connections.services import EmailConnectionService
from email_connections.models import EmailConnection
from sqlalchemy import and_


def get_email_connection_service(db: Session = Depends(get_db)) -> EmailConnectionService:
    """
    Get EmailConnectionService instance.
    
    Args:
        db: Database session
        
    Returns:
        EmailConnectionService: Service instance
    """
    return EmailConnectionService(db)


def get_user_connection_or_404(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> EmailConnection:
    """
    Get a user's email connection or raise 404.
    
    Args:
        connection_id: ID of the connection
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        EmailConnection: The connection if found and owned by user
        
    Raises:
        HTTPException: 404 if connection not found or not owned by user
    """
    connection = db.query(EmailConnection).filter(
        and_(
            EmailConnection.id == connection_id,
            EmailConnection.user_id == current_user.id
        )
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email connection not found"
        )
    
    return connection


def require_active_connection(
    connection: EmailConnection = Depends(get_user_connection_or_404)
) -> EmailConnection:
    """
    Require connection to be in active status.
    
    Args:
        connection: Email connection
        
    Returns:
        EmailConnection: The connection if active
        
    Raises:
        HTTPException: 400 if connection is not active
    """
    if connection.connection_status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection is not active (status: {connection.connection_status})"
        )
    
    return connection


def get_connection_with_tokens(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
) -> dict:
    """
    Get connection with decrypted tokens for internal use.
    
    Args:
        connection_id: ID of the connection
        current_user: Current authenticated user
        service: Email connection service
        
    Returns:
        dict: Connection token data
        
    Raises:
        HTTPException: 404 if connection not found, 400 if tokens unavailable
    """
    tokens = service.get_connection_tokens(connection_id, current_user.id)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection tokens are not available or connection is not active"
        )
    
    return tokens