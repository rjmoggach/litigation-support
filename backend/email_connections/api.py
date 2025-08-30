"""
API endpoints for email connection management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from users.models import User
from users.deps import get_current_active_user
from email_connections.services import EmailConnectionService
from email_connections.schemas import (
    EmailConnectionCreate,
    EmailConnectionUpdate,
    EmailConnectionResponse,
    ConnectionListResponse,
    ConnectionDeleteResponse,
    OAuthInitiateRequest,
    OAuthInitiateResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    BulkConnectionStatus,
    ConnectionHealthCheck,
    TokenRefreshRequest,
    TokenRefreshResponse
)
from email_connections.deps import (
    get_email_connection_service,
    get_user_connection_or_404
)
from email_connections.oauth import google_oauth_handler, oauth_state_manager
from email_connections.utils import GMAIL_DEFAULT_SCOPES
from email_connections.gmail_client import GmailClient


router = APIRouter()


@router.get("/connections", response_model=ConnectionListResponse)
def list_connections(
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Get all email connections for the current user."""
    connections = service.get_user_connections(current_user.id)
    
    # Calculate summary stats
    total = len(connections)
    active = sum(1 for conn in connections if conn.connection_status == "active")
    expired = sum(1 for conn in connections if conn.connection_status == "expired")
    error = sum(1 for conn in connections if conn.connection_status == "error")
    
    return ConnectionListResponse(
        connections=connections,
        total=total,
        active=active,
        expired=expired,
        error=error
    )


@router.get("/connections/{connection_id}", response_model=EmailConnectionResponse)
def get_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Get a specific email connection."""
    connection = service.get_connection(connection_id, current_user.id)
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email connection not found"
        )
    
    return connection


@router.put("/connections/{connection_id}", response_model=EmailConnectionResponse)
def update_connection(
    connection_id: int,
    update_data: EmailConnectionUpdate,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Update an email connection."""
    connection = service.update_connection(connection_id, current_user.id, update_data)
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email connection not found"
        )
    
    return connection


@router.delete("/connections/{connection_id}", response_model=ConnectionDeleteResponse)
def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Delete an email connection."""
    # Get connection details before deletion
    connection = service.get_connection(connection_id, current_user.id)
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email connection not found"
        )
    
    # Attempt to revoke OAuth tokens
    try:
        tokens = service.get_connection_tokens(connection_id, current_user.id)
        if tokens and tokens.get("access_token"):
            google_oauth_handler.revoke_token(tokens["access_token"])
    except Exception:
        # Continue with deletion even if revocation fails
        pass
    
    # Delete the connection (with protection check - may archive instead)
    delete_result = service.delete_connection(connection_id, current_user.id)
    
    if not delete_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=delete_result["error"]
        )
    
    # Success - either archived or deleted
    message = delete_result.get("message", "Connection processed successfully")
    
    return ConnectionDeleteResponse(
        message=message,
        connection_id=connection_id,
        email_address=delete_result["email_address"]
    )


@router.get("/connections/{connection_id}/health", response_model=ConnectionHealthCheck)
def check_connection_health(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Check the health status of a connection."""
    return service.check_connection_health(connection_id, current_user.id)


@router.get("/status", response_model=BulkConnectionStatus)
def get_connection_status(
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Get bulk connection status for the current user."""
    return service.get_user_connection_status(current_user.id)


# OAuth Flow Endpoints

@router.post("/oauth/initiate", response_model=OAuthInitiateResponse)
def initiate_oauth_flow(
    request_data: OAuthInitiateRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """Initiate OAuth flow for connecting an additional email account."""
    
    # Determine redirect URI
    if request_data.redirect_uri:
        redirect_uri = request_data.redirect_uri
    else:
        # Use default callback URL
        base_url = str(request.base_url).rstrip('/')
        redirect_uri = f"{base_url}/api/v1/email-connections/oauth/callback"
    
    # Generate state and authorization URL
    state = oauth_state_manager.generate_state(current_user.id, redirect_uri)
    
    authorization_url, _ = google_oauth_handler.get_authorization_url(
        redirect_uri=redirect_uri,
        scopes=request_data.scopes,
        state=state
    )
    
    return OAuthInitiateResponse(
        authorization_url=authorization_url,
        state=state,
        provider=request_data.provider
    )


@router.get("/oauth/callback")
def handle_oauth_callback(
    state: str,
    code: str,
    scope: str = None,
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Handle OAuth callback and create email connection."""
    
    # Validate state
    state_data = oauth_state_manager.validate_state_only(state)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state"
        )
    
    # Get user ID from state
    user_id = state_data["user_id"]
    
    redirect_uri = state_data["redirect_uri"]
    
    try:
        # Exchange code for tokens
        token_response = google_oauth_handler.exchange_code_for_tokens(
            code=code,
            redirect_uri=redirect_uri,
            state=state
        )
        
        # Get user info to identify the account
        user_info = google_oauth_handler.get_user_info(token_response["access_token"])
        
        # Parse scopes from query parameter
        scopes_list = scope.split() if scope else GMAIL_DEFAULT_SCOPES
        
        # Create connection
        connection_data = EmailConnectionCreate(
            email_address=user_info["email"],
            provider="google",
            provider_account_id=user_info.get("id", user_info["email"]),
            connection_name=user_info.get("name"),
            access_token=token_response["access_token"],
            refresh_token=token_response.get("refresh_token"),
            token_expires_at=token_response.get("expires_at"),
            scopes_granted=scopes_list,
            oauth_data=user_info
        )
        
        connection = service.create_connection(user_id, connection_data)
        
        # Consume the state
        oauth_state_manager.consume_state(state)
        
        # Instead of returning JSON, redirect to a success page that closes the popup
        from fastapi.responses import HTMLResponse
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>OAuth Success</title>
        </head>
        <body>
            <script>
                // Post success message to parent window
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'OAUTH_SUCCESS',
                        connection: {
                            id: %s,
                            email: '%s',
                            name: '%s',
                            status: '%s'
                        }
                    }, '*');
                }
                // Close popup
                window.close();
            </script>
            <p>Email account connected successfully! This window will close automatically.</p>
        </body>
        </html>
        """ % (
            connection.id,
            connection.email_address,
            connection.connection_name or connection.email_address,
            connection.connection_status
        )
        
        return HTMLResponse(content=html_content)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth callback failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connection: {str(e)}"
        )


@router.post("/connections/{connection_id}/refresh", response_model=TokenRefreshResponse)
def refresh_connection_tokens(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Refresh tokens for a connection."""
    
    # Get current tokens
    tokens = service.get_connection_tokens(connection_id, current_user.id)
    
    if not tokens or not tokens.get("refresh_token"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection has no refresh token available"
        )
    
    try:
        # Refresh tokens
        new_token_response = google_oauth_handler.refresh_access_token(
            tokens["refresh_token"]
        )
        
        # Update connection with new tokens
        success = service.update_tokens(
            connection_id=connection_id,
            user_id=current_user.id,
            access_token=new_token_response["access_token"],
            refresh_token=new_token_response.get("refresh_token", tokens["refresh_token"]),
            expires_at=new_token_response.get("expires_at")
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update connection tokens"
            )
        
        return TokenRefreshResponse(
            connection_id=connection_id,
            success=True,
            new_expires_at=new_token_response.get("expires_at"),
            error_message=None
        )
        
    except ValueError as e:
        # Mark connection as having an error
        service.mark_connection_error(
            connection_id, 
            current_user.id, 
            f"Token refresh failed: {str(e)}"
        )
        
        return TokenRefreshResponse(
            connection_id=connection_id,
            success=False,
            new_expires_at=None,
            error_message=str(e)
        )


@router.get("/connections/{connection_id}/debug")
def debug_connection_scopes(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Debug endpoint to check connection scopes."""
    connection = service.get_connection(connection_id, current_user.id)
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    return {
        "connection_id": connection_id,
        "email": connection.email_address,
        "raw_scopes": connection.scopes_granted,
        "scope_type": str(type(connection.scopes_granted)),
        "has_gmail_readonly": "gmail.readonly" in str(connection.scopes_granted).lower() if connection.scopes_granted else False
    }


@router.post("/connections/{connection_id}/test")
def test_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Test a connection by validating its tokens."""
    
    tokens = service.get_connection_tokens(connection_id, current_user.id)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection tokens are not available"
        )
    
    try:
        # Test token by getting user info
        user_info = google_oauth_handler.get_user_info(tokens["access_token"])
        
        # Get connection to check granted scopes
        connection = service.get_connection(connection_id, current_user.id)
        
        # Check if Gmail scope is granted
        granted_scopes = []
        has_gmail_scope = False
        
        if connection and connection.scopes_granted:
            try:
                # Handle both string and list types
                if isinstance(connection.scopes_granted, list):
                    granted_scopes = connection.scopes_granted
                elif isinstance(connection.scopes_granted, str):
                    # Parse the scopes string
                    import json
                    try:
                        # Try to parse as JSON first
                        granted_scopes = json.loads(connection.scopes_granted)
                    except json.JSONDecodeError:
                        # Fallback to manual parsing
                        scopes_str = connection.scopes_granted.strip()
                        if scopes_str.startswith('[') and scopes_str.endswith(']'):
                            # Remove brackets and split
                            scopes_str = scopes_str[1:-1]
                            granted_scopes = [s.strip().strip('"') for s in scopes_str.split(',')]
                        else:
                            # Already a clean string, just split
                            granted_scopes = [s.strip() for s in scopes_str.split(',')]
                
                has_gmail_scope = "https://www.googleapis.com/auth/gmail.readonly" in granted_scopes
                
                # Debug logging
                print(f"Connection {connection_id} scopes debug:")
                print(f"  Raw scopes_granted: {connection.scopes_granted}")
                print(f"  Parsed granted_scopes: {granted_scopes}")
                print(f"  Has Gmail scope: {has_gmail_scope}")
                print(f"  Looking for: 'https://www.googleapis.com/auth/gmail.readonly'")
                
            except Exception as e:
                print(f"Error parsing scopes: {str(e)} (type: {type(connection.scopes_granted)})")
                granted_scopes = []
                has_gmail_scope = False
        
        latest_message = None
        if has_gmail_scope:
            try:
                # Get the latest email using Gmail API
                gmail_client = GmailClient(tokens["access_token"])
                latest_message = gmail_client.get_latest_message()
            except Exception as e:
                # Log the Gmail API error but don't fail the test
                print(f"Gmail API error: {str(e)}")
        
        return {
            "connection_id": connection_id,
            "status": "healthy",
            "email": user_info.get("email"),
            "message": "Connection is working properly",
            "latest_message": latest_message,
            "has_gmail_scope": has_gmail_scope,
            "granted_scopes": granted_scopes
        }
        
    except ValueError as e:
        # Mark connection as having an error
        service.mark_connection_error(
            connection_id,
            current_user.id,
            f"Connection test failed: {str(e)}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection test failed: {str(e)}"
        )