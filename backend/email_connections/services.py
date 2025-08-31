"""
Service layer for email connection management.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from email_connections.models import EmailConnection
from email_connections.schemas import (
    EmailConnectionCreate,
    EmailConnectionUpdate,
    EmailConnectionResponse,
    ConnectionStatus,
    BulkConnectionStatus,
    ConnectionHealthCheck
)
from email_connections.utils import (
    encrypt_token,
    decrypt_token,
    is_token_expired,
    should_refresh_token,
    sanitize_error_message,
    scopes_to_string,
    parse_scopes_string
)
from users.models import User


class EmailConnectionService:
    """Service for managing email connections"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_connection(
        self,
        user_id: int,
        connection_data: EmailConnectionCreate
    ) -> EmailConnectionResponse:
        """
        Create a new email connection for a user.
        
        Args:
            user_id: ID of the user
            connection_data: Connection creation data
            
        Returns:
            EmailConnectionResponse: Created connection
        """
        # Check if connection with same email already exists for this user
        existing = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.user_id == user_id,
                EmailConnection.email_address == connection_data.email_address,
                EmailConnection.provider == connection_data.provider
            )
        ).first()
        
        if existing:
            raise ValueError(f"Connection already exists for {connection_data.email_address}")
        
        # Encrypt tokens
        access_token_encrypted = encrypt_token(connection_data.access_token)
        refresh_token_encrypted = encrypt_token(connection_data.refresh_token) if connection_data.refresh_token else None
        
        # Create connection
        db_connection = EmailConnection(
            user_id=user_id,
            email_address=connection_data.email_address,
            provider=connection_data.provider,
            provider_account_id=connection_data.provider_account_id,
            connection_name=connection_data.connection_name,
            access_token_encrypted=access_token_encrypted,
            refresh_token_encrypted=refresh_token_encrypted,
            token_expires_at=connection_data.token_expires_at,
            scopes_granted=scopes_to_string(connection_data.scopes_granted),
            connection_status="active"
        )
        
        # Set oauth_data using helper method to properly serialize to JSON
        if connection_data.oauth_data:
            db_connection.set_oauth_data(connection_data.oauth_data)
        
        self.db.add(db_connection)
        self.db.commit()
        self.db.refresh(db_connection)
        
        return self._to_response_schema(db_connection)
    
    def get_user_connections(self, user_id: int, include_archived: bool = False) -> List[EmailConnectionResponse]:
        """
        Get all email connections for a user.
        
        Args:
            user_id: ID of the user
            include_archived: Whether to include archived connections
            
        Returns:
            List[EmailConnectionResponse]: User's connections
        """
        query = self.db.query(EmailConnection).filter(
            EmailConnection.user_id == user_id
        )
        
        if not include_archived:
            query = query.filter(EmailConnection.is_archived == False)
        
        connections = query.order_by(EmailConnection.created_at.desc()).all()
        return [self._to_response_schema(conn) for conn in connections]
    
    def get_connection(self, connection_id: int, user_id: int) -> Optional[EmailConnectionResponse]:
        """
        Get a specific connection for a user.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            
        Returns:
            Optional[EmailConnectionResponse]: Connection if found and authorized
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return None
        
        return self._to_response_schema(connection)
    
    def update_connection(
        self,
        connection_id: int,
        user_id: int,
        update_data: EmailConnectionUpdate
    ) -> Optional[EmailConnectionResponse]:
        """
        Update a connection.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            update_data: Update data
            
        Returns:
            Optional[EmailConnectionResponse]: Updated connection
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return None
        
        # Update fields
        if update_data.connection_name is not None:
            connection.connection_name = update_data.connection_name
        
        if update_data.connection_status is not None:
            connection.connection_status = update_data.connection_status
            if update_data.connection_status == "active":
                connection.error_message = None
        
        connection.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(connection)
        
        return self._to_response_schema(connection)
    
    def check_connection_usage(self, connection_id: int, user_id: int) -> Dict[str, Any]:
        """
        Check if a connection has related records that would prevent deletion.
        
        Args:
            connection_id: Connection ID to check
            user_id: User ID for authorization
            
        Returns:
            Dict containing usage information
        """
        connection = self.get_connection(connection_id, user_id)
        if not connection:
            return {"exists": False}
        
        # Check for related records - update these table names as needed
        usage_info = {
            "exists": True,
            "email_address": connection.email_address,
            "can_delete": True,
            "related_records": {},
            "total_related": 0
        }
        
        # TODO: Add checks for related tables when they exist
        # Example for when email storage is implemented:
        # 
        # # Check for stored emails
        # stored_emails_count = self.db.query(StoredEmail).filter(
        #     StoredEmail.connection_id == connection_id
        # ).count()
        # 
        # if stored_emails_count > 0:
        #     usage_info["related_records"]["stored_emails"] = stored_emails_count
        #     usage_info["total_related"] += stored_emails_count
        # 
        # # Check for email attachments
        # attachments_count = self.db.query(EmailAttachment).filter(
        #     EmailAttachment.connection_id == connection_id
        # ).count()
        # 
        # if attachments_count > 0:
        #     usage_info["related_records"]["attachments"] = attachments_count
        #     usage_info["total_related"] += attachments_count
        
        # If there are related records, prevent deletion
        usage_info["can_delete"] = usage_info["total_related"] == 0
        
        return usage_info

    def delete_connection(self, connection_id: int, user_id: int) -> Dict[str, Any]:
        """
        Delete a connection after checking for related records.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            
        Returns:
            Dict: Result of deletion attempt with details
        """
        # Check if connection can be safely deleted
        usage_info = self.check_connection_usage(connection_id, user_id)
        
        if not usage_info["exists"]:
            return {"success": False, "error": "Connection not found"}
        
        # Get the actual connection object for deletion/archiving
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return {"success": False, "error": "Connection not found"}
        
        if not usage_info["can_delete"]:
            # Archive instead of delete when there are related records
            from datetime import datetime, timezone
            
            connection.is_archived = True
            connection.archived_at = datetime.now(timezone.utc)
            connection.connection_status = "archived"
            
            self.db.commit()
            self.db.refresh(connection)
            
            return {
                "success": True,
                "archived": True,
                "email_address": connection.email_address,
                "message": f"Connection archived due to {usage_info['total_related']} related records"
            }
        
        # Safe to permanently delete
        email_address = connection.email_address
        self.db.delete(connection)
        self.db.commit()
        
        return {
            "success": True,
            "archived": False,
            "email_address": email_address,
            "message": "Connection deleted permanently"
        }
    
    def get_connection_tokens(self, connection_id: int, user_id: int, auto_refresh: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get decrypted tokens for a connection with optional automatic refresh.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            auto_refresh: Whether to automatically refresh expired tokens
            
        Returns:
            Optional[Dict]: Token data if authorized
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return None
        
        # Allow getting tokens for error status connections if auto_refresh is enabled
        if connection.connection_status not in ["active", "error"] and not auto_refresh:
            return None
        
        try:
            access_token = decrypt_token(connection.access_token_encrypted)
            refresh_token = decrypt_token(connection.refresh_token_encrypted) if connection.refresh_token_encrypted else None
            
            # Check if token needs refresh and we have a refresh token
            if auto_refresh and refresh_token and should_refresh_token(connection.token_expires_at):
                try:
                    # Import here to avoid circular imports
                    from email_connections.oauth import google_oauth_handler
                    
                    # Attempt to refresh the token
                    token_response = google_oauth_handler.refresh_access_token(refresh_token)
                    
                    # Update the connection with new tokens
                    success = self.update_tokens(
                        connection_id=connection_id,
                        user_id=user_id,
                        access_token=token_response["access_token"],
                        refresh_token=token_response.get("refresh_token", refresh_token),
                        expires_at=token_response.get("expires_at")
                    )
                    
                    if success:
                        # Mark connection as active if refresh was successful
                        connection.connection_status = "active"
                        connection.error_message = None
                        self.db.commit()
                        
                        # Return refreshed tokens
                        return {
                            "access_token": token_response["access_token"],
                            "refresh_token": token_response.get("refresh_token", refresh_token),
                            "expires_at": token_response.get("expires_at"),
                            "scopes": parse_scopes_string(connection.scopes_granted)
                        }
                    
                except Exception as refresh_error:
                    # Auto-refresh failed, mark connection as error but still return old tokens
                    connection.connection_status = "error"
                    connection.error_message = sanitize_error_message(f"Auto-refresh failed: {str(refresh_error)}")
                    self.db.commit()
            
            # Return original tokens (whether refresh succeeded or failed)
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": connection.token_expires_at,
                "scopes": parse_scopes_string(connection.scopes_granted)
            }
        except ValueError as e:
            # Token decryption failed - mark as error
            connection.connection_status = "error"
            connection.error_message = sanitize_error_message(f"Token decryption failed: {str(e)}")
            self.db.commit()
            return None
    
    def update_tokens(
        self,
        connection_id: int,
        user_id: int,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """
        Update tokens for a connection.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            access_token: New access token
            refresh_token: New refresh token (optional)
            expires_at: Token expiration time
            
        Returns:
            bool: True if updated successfully
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return False
        
        try:
            # Encrypt new tokens
            connection.access_token_encrypted = encrypt_token(access_token)
            if refresh_token:
                connection.refresh_token_encrypted = encrypt_token(refresh_token)
            
            connection.token_expires_at = expires_at
            connection.connection_status = "active"
            connection.error_message = None
            connection.last_sync_at = datetime.now(timezone.utc)
            connection.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            return True
        except ValueError as e:
            connection.connection_status = "error"
            connection.error_message = sanitize_error_message(f"Token encryption failed: {str(e)}")
            self.db.commit()
            return False
    
    def check_connection_health(self, connection_id: int, user_id: int) -> ConnectionHealthCheck:
        """
        Check the health status of a connection.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            
        Returns:
            ConnectionHealthCheck: Health check results
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return ConnectionHealthCheck(
                connection_id=connection_id,
                is_healthy=False,
                status="not_found",
                last_checked=datetime.now(timezone.utc),
                error_details="Connection not found",
                needs_reauth=False
            )
        
        is_expired = is_token_expired(connection.token_expires_at)
        needs_refresh = should_refresh_token(connection.token_expires_at)
        
        is_healthy = (
            connection.connection_status == "active" and
            not is_expired
        )
        
        return ConnectionHealthCheck(
            connection_id=connection_id,
            is_healthy=is_healthy,
            status=connection.connection_status,
            last_checked=datetime.now(timezone.utc),
            error_details=connection.error_message,
            token_expires_at=connection.token_expires_at,
            needs_reauth=is_expired or needs_refresh
        )
    
    def get_user_connection_status(self, user_id: int) -> BulkConnectionStatus:
        """
        Get bulk connection status for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            BulkConnectionStatus: Bulk status information
        """
        connections = self.db.query(EmailConnection).filter(
            EmailConnection.user_id == user_id
        ).all()
        
        total = len(connections)
        active = sum(1 for conn in connections if conn.connection_status == "active")
        expired = sum(1 for conn in connections if conn.connection_status == "expired")
        error = sum(1 for conn in connections if conn.connection_status == "error")
        
        connection_statuses = []
        for conn in connections:
            status = ConnectionStatus(
                connection_id=conn.id,
                email_address=conn.email_address,
                status=conn.connection_status,
                is_active=conn.connection_status == "active",
                is_expired=is_token_expired(conn.token_expires_at),
                last_sync_at=conn.last_sync_at,
                error_message=conn.error_message
            )
            connection_statuses.append(status)
        
        return BulkConnectionStatus(
            user_id=user_id,
            total_connections=total,
            active_connections=active,
            expired_connections=expired,
            error_connections=error,
            connections=connection_statuses
        )
    
    def mark_connection_error(
        self,
        connection_id: int,
        user_id: int,
        error_message: str
    ) -> bool:
        """
        Mark a connection as having an error.
        
        Args:
            connection_id: ID of the connection
            user_id: ID of the user (for authorization)
            error_message: Error description
            
        Returns:
            bool: True if updated successfully
        """
        connection = self.db.query(EmailConnection).filter(
            and_(
                EmailConnection.id == connection_id,
                EmailConnection.user_id == user_id
            )
        ).first()
        
        if not connection:
            return False
        
        connection.connection_status = "error"
        connection.error_message = sanitize_error_message(error_message)
        connection.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        return True
    
    def _to_response_schema(self, connection: EmailConnection) -> EmailConnectionResponse:
        """
        Convert database model to response schema.
        
        Args:
            connection: Database connection model
            
        Returns:
            EmailConnectionResponse: Response schema
        """
        return EmailConnectionResponse(
            id=connection.id,
            user_id=connection.user_id,
            email_address=connection.email_address,
            provider=connection.provider,
            provider_account_id=connection.provider_account_id,
            connection_name=connection.connection_name,
            connection_status=connection.connection_status,
            last_sync_at=connection.last_sync_at,
            error_message=connection.error_message,
            created_at=connection.created_at,
            updated_at=connection.updated_at,
            scopes_granted=parse_scopes_string(connection.scopes_granted)
        )