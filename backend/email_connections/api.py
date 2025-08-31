"""
API endpoints for email connection management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from users.deps import get_current_active_user
from users.models import User

from email_connections.deps import get_email_connection_service
from email_connections.exceptions import (
    ConnectionNotFoundException,
    ConnectionAlreadyExistsException,
    OAuthStateException,
    OAuthTokenException,
    ConnectionExpiredException,
    TokenRefreshException,
    EmailServiceException,
    ValidationException,
    format_exception_response
)
from email_connections.gmail_client import GmailClient
from email_connections.oauth import google_oauth_handler, oauth_state_manager
from email_connections.schemas import (
    BulkConnectionStatus,
    ConnectionDeleteResponse,
    ConnectionHealthCheck,
    ConnectionListResponse,
    EmailConnectionCreate,
    EmailConnectionResponse,
    EmailConnectionUpdate,
    OAuthInitiateRequest,
    OAuthInitiateResponse,
    TokenRefreshResponse,
)
from email_connections.services import EmailConnectionService
from email_connections.utils import GMAIL_DEFAULT_SCOPES
from email_connections.harvesting_service import EmailHarvestingService

router = APIRouter()


@router.get(
    "",
    response_model=ConnectionListResponse,
    summary="List Email Connections",
    description="Retrieve all email account connections for the authenticated user",
    responses={
        200: {
            "description": "List of email connections with summary statistics",
            "content": {
                "application/json": {
                    "example": {
                        "connections": [
                            {
                                "id": 1,
                                "user_id": 123,
                                "email_address": "user@gmail.com",
                                "provider": "google",
                                "provider_account_id": "google_user_id_123",
                                "connection_name": "Work Gmail Account",
                                "connection_status": "active",
                                "last_sync_at": "2024-01-15T10:30:00Z",
                                "error_message": None,
                                "created_at": "2024-01-01T10:00:00Z",
                                "updated_at": "2024-01-15T10:30:00Z",
                                "scopes_granted": [
                                    "https://www.googleapis.com/auth/gmail.readonly",
                                    "https://www.googleapis.com/auth/userinfo.email",
                                    "https://www.googleapis.com/auth/userinfo.profile"
                                ]
                            }
                        ],
                        "total": 1,
                        "active": 1,
                        "expired": 0,
                        "error": 0
                    }
                }
            }
        },
        401: {"description": "Authentication required"}
    }
)
def list_connections(
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """
    Get all email connections for the current user.
    
    Returns a list of all email account connections belonging to the authenticated user,
    along with summary statistics showing the count of connections by status.
    
    **Connection Statuses:**
    - `active`: Connection is working and can be used for email harvesting
    - `expired`: Access token has expired and needs to be refreshed
    - `error`: Connection has an error and requires user attention
    - `revoked`: User has revoked access and connection must be re-authorized
    """
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
        error=error,
    )


@router.get("/{connection_id}", response_model=EmailConnectionResponse)
def get_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Get a specific email connection."""
    connection = service.get_connection(connection_id, current_user.id)

    if not connection:
        raise ConnectionNotFoundException(connection_id, current_user.id)

    return connection


@router.put("/{connection_id}", response_model=EmailConnectionResponse)
def update_connection(
    connection_id: int,
    update_data: EmailConnectionUpdate,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Update an email connection."""
    connection = service.update_connection(connection_id, current_user.id, update_data)

    if not connection:
        raise ConnectionNotFoundException(connection_id, current_user.id)

    return connection


@router.delete("/{connection_id}", response_model=ConnectionDeleteResponse)
def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Delete an email connection."""
    # Get connection details before deletion
    connection = service.get_connection(connection_id, current_user.id)

    if not connection:
        raise ConnectionNotFoundException(connection_id, current_user.id)

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
        if "not found" in delete_result["error"].lower():
            raise ConnectionNotFoundException(connection_id, current_user.id)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=delete_result["error"]
            )

    # Success - either archived or deleted
    message = delete_result.get("message", "Connection processed successfully")

    return ConnectionDeleteResponse(
        message=message,
        connection_id=connection_id,
        email_address=delete_result["email_address"],
    )


@router.get("/{connection_id}/health", response_model=ConnectionHealthCheck)
def check_connection_health(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Check the health status of a connection."""
    return service.check_connection_health(connection_id, current_user.id)


@router.get("/status", response_model=BulkConnectionStatus)
def get_connection_status(
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Get bulk connection status for the current user."""
    return service.get_user_connection_status(current_user.id)


# OAuth Flow Endpoints


@router.post(
    "/oauth/initiate",
    response_model=OAuthInitiateResponse,
    summary="Initiate OAuth Flow",
    description="Start OAuth2 flow to connect a new Google/Gmail account",
    responses={
        200: {
            "description": "OAuth authorization URL generated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "authorization_url": "https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=...&state=...",
                        "state": "secure_random_state_string_123456",
                        "provider": "google"
                    }
                }
            }
        },
        401: {"description": "Authentication required"},
        400: {"description": "Invalid request parameters"}
    }
)
def initiate_oauth_flow(
    request_data: OAuthInitiateRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """
    Initiate OAuth flow for connecting an additional email account.
    
    This endpoint generates a secure OAuth2 authorization URL that the client
    can use to redirect the user to Google's consent screen. The user will
    grant permission for the application to access their Gmail account.
    
    **Security Features:**
    - Generates a cryptographically secure state parameter for CSRF protection
    - Validates redirect URIs against allowed origins
    - Associates the OAuth state with the authenticated user
    
    **Request Parameters:**
    - `provider`: OAuth provider (currently only "google" is supported)
    - `scopes`: List of OAuth scopes to request (defaults to Gmail read-only)
    - `redirect_uri`: Optional custom callback URL (defaults to backend callback)
    
    **Response:**
    - `authorization_url`: Complete Google OAuth URL for user redirection
    - `state`: Secure state parameter (store this for validation)
    - `provider`: Confirms the OAuth provider being used
    """

    # Determine redirect URI
    if request_data.redirect_uri:
        redirect_uri = request_data.redirect_uri
    else:
        # Use default callback URL
        base_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}/api/v1/email-connections/oauth/callback"

    # Generate state and authorization URL
    state = oauth_state_manager.generate_state(current_user.id, redirect_uri)

    authorization_url, _ = google_oauth_handler.get_authorization_url(
        redirect_uri=redirect_uri, scopes=request_data.scopes, state=state
    )

    return OAuthInitiateResponse(
        authorization_url=authorization_url, state=state, provider=request_data.provider
    )


@router.get(
    "/oauth/callback",
    summary="OAuth Callback Handler",
    description="Process OAuth2 callback from Google and create email connection",
    responses={
        200: {
            "description": "OAuth callback processed successfully - returns HTML page that closes popup",
            "content": {
                "text/html": {
                    "example": "<!DOCTYPE html><html>...OAuth success page with JavaScript to close popup...</html>"
                }
            }
        },
        400: {
            "description": "Invalid OAuth state or authorization code",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid or expired OAuth state"}
                }
            }
        },
        500: {
            "description": "Failed to create connection or exchange tokens",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to create connection: Token exchange failed"}
                }
            }
        }
    }
)
def handle_oauth_callback(
    state: str,
    code: str,
    scope: str = None,
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """
    Handle OAuth callback and create email connection.
    
    This endpoint processes the OAuth2 callback from Google after the user has
    granted permission. It validates the state parameter, exchanges the authorization
    code for access tokens, retrieves user information, and creates a new email
    connection record.
    
    **Query Parameters:**
    - `code`: Authorization code from Google OAuth (required)
    - `state`: State parameter for CSRF protection (required)
    - `scope`: Space-separated list of granted scopes (optional)
    
    **Security Validation:**
    - Validates the state parameter against stored OAuth state
    - Verifies the state hasn't expired or been used
    - Associates the callback with the correct authenticated user
    
    **Token Exchange Process:**
    1. Exchange authorization code for access/refresh tokens
    2. Use access token to retrieve Google user profile information  
    3. Store encrypted tokens and create email connection record
    4. Return HTML page that notifies parent window and closes popup
    
    **Response:**
    Returns an HTML page containing JavaScript that:
    - Posts a success message to the parent window (for popup flows)
    - Includes the new connection details in the message
    - Automatically closes the popup window
    
    This endpoint is typically called automatically by Google's OAuth redirect
    and not directly by client applications.
    """

    # Validate state
    state_data = oauth_state_manager.validate_state_only(state)
    if not state_data:
        raise OAuthStateException(state)

    # Get user ID from state
    user_id = state_data["user_id"]

    redirect_uri = state_data["redirect_uri"]

    try:
        # Exchange code for tokens
        token_response = google_oauth_handler.exchange_code_for_tokens(
            code=code, redirect_uri=redirect_uri, state=state
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
            oauth_data=user_info,
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
            connection.connection_status,
        )

        return HTMLResponse(content=html_content)

    except ValueError as e:
        raise OAuthTokenException(str(e))
    except Exception as e:
        # Check if it's a connection already exists error
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            raise ConnectionAlreadyExistsException(
                user_info.get("email", "unknown"), 
                0  # Connection ID unknown at this point
            )
        raise OAuthTokenException(f"Failed to create connection: {str(e)}")


@router.post("/{connection_id}/refresh", response_model=TokenRefreshResponse)
def refresh_connection_tokens(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Refresh tokens for a connection."""

    # Get current tokens
    tokens = service.get_connection_tokens(connection_id, current_user.id)

    if not tokens or not tokens.get("refresh_token"):
        raise TokenRefreshException(connection_id, "No refresh token available")

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
            refresh_token=new_token_response.get(
                "refresh_token", tokens["refresh_token"]
            ),
            expires_at=new_token_response.get("expires_at"),
        )

        if not success:
            raise TokenRefreshException(connection_id, "Failed to update connection tokens")

        return TokenRefreshResponse(
            connection_id=connection_id,
            success=True,
            new_expires_at=new_token_response.get("expires_at"),
            error_message=None,
        )

    except ValueError as e:
        # Mark connection as having an error
        service.mark_connection_error(
            connection_id, current_user.id, f"Token refresh failed: {str(e)}"
        )

        return TokenRefreshResponse(
            connection_id=connection_id,
            success=False,
            new_expires_at=None,
            error_message=str(e),
        )


@router.get("/{connection_id}/debug")
def debug_connection_scopes(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Debug endpoint to check connection scopes."""
    connection = service.get_connection(connection_id, current_user.id)

    if not connection:
        raise ConnectionNotFoundException(connection_id, current_user.id)

    return {
        "connection_id": connection_id,
        "email": connection.email_address,
        "raw_scopes": connection.scopes_granted,
        "scope_type": str(type(connection.scopes_granted)),
        "has_gmail_readonly": "gmail.readonly" in str(connection.scopes_granted).lower()
        if connection.scopes_granted
        else False,
    }


@router.post("/{connection_id}/test")
def test_connection(
    connection_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
):
    """Test a connection by validating its tokens."""

    tokens = service.get_connection_tokens(connection_id, current_user.id)

    if not tokens:
        raise ConnectionExpiredException(connection_id, "unknown")

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
                        if scopes_str.startswith("[") and scopes_str.endswith("]"):
                            # Remove brackets and split
                            scopes_str = scopes_str[1:-1]
                            granted_scopes = [
                                s.strip().strip('"') for s in scopes_str.split(",")
                            ]
                        else:
                            # Already a clean string, just split
                            granted_scopes = [s.strip() for s in scopes_str.split(",")]

                has_gmail_scope = (
                    "https://www.googleapis.com/auth/gmail.readonly" in granted_scopes
                )

                # Debug logging
                print(f"Connection {connection_id} scopes debug:")
                print(f"  Raw scopes_granted: {connection.scopes_granted}")
                print(f"  Parsed granted_scopes: {granted_scopes}")
                print(f"  Has Gmail scope: {has_gmail_scope}")
                print("  Looking for: 'https://www.googleapis.com/auth/gmail.readonly'")

            except Exception as e:
                print(
                    f"Error parsing scopes: {str(e)} (type: {type(connection.scopes_granted)})"
                )
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
            "granted_scopes": granted_scopes,
        }

    except ValueError as e:
        # Mark connection as having an error
        service.mark_connection_error(
            connection_id, current_user.id, f"Connection test failed: {str(e)}"
        )

        if "expired" in str(e).lower() or "unauthorized" in str(e).lower():
            raise ConnectionExpiredException(connection_id, connection.email_address if connection else "unknown")
        elif "service" in str(e).lower() or "unavailable" in str(e).lower():
            raise EmailServiceException("Gmail", str(e))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Connection test failed: {str(e)}",
            )


# Error handling and debugging endpoints

@router.get("/debug/health", 
    summary="Debug Health Check",
    description="Debug endpoint to test error handling and system health")
def debug_health_check(
    current_user: User = Depends(get_current_active_user)
):
    """Debug endpoint to verify error handling is working."""
    return {
        "status": "healthy",
        "user_id": current_user.id,
        "error_handling": "active",
        "custom_exceptions": "enabled",
        "timestamp": "2024-01-01T00:00:00Z"
    }


@router.get("/debug/test-error/{error_type}",
    summary="Test Error Handling", 
    description="Debug endpoint to test different error scenarios")
def debug_test_error(
    error_type: str,
    current_user: User = Depends(get_current_active_user)
):
    """Debug endpoint to test error handling scenarios."""
    
    if error_type == "not_found":
        raise ConnectionNotFoundException(999, current_user.id)
    elif error_type == "already_exists":
        raise ConnectionAlreadyExistsException("test@example.com", 123)
    elif error_type == "oauth_state":
        raise OAuthStateException("invalid_state_123")
    elif error_type == "oauth_token":
        raise OAuthTokenException("Token exchange failed")
    elif error_type == "expired":
        raise ConnectionExpiredException(123, "test@example.com")
    elif error_type == "refresh_failed":
        raise TokenRefreshException(123, "Refresh token is invalid")
    elif error_type == "service_unavailable":
        raise EmailServiceException("Gmail", "Service temporarily unavailable")
    elif error_type == "validation":
        raise ValidationException("email", "Invalid email format", "invalid@")
    else:
        return {"error": "Invalid error type. Try: not_found, already_exists, oauth_state, oauth_token, expired, refresh_failed, service_unavailable, validation"}


# Email Harvesting Integration Endpoints

@router.post(
    "/harvest/test",
    summary="Test Harvesting Capability",
    description="Test if email harvesting is properly configured and working"
)
async def test_harvesting_capability(
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Test if email harvesting is ready and working."""
    
    harvesting_service = EmailHarvestingService(service.db)
    
    try:
        results = await harvesting_service.test_harvesting_capability(current_user.id)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test harvesting capability: {str(e)}"
        )


@router.post(
    "/harvest/case/{case_id}",
    summary="Harvest Emails for Case",
    description="Harvest emails from connected accounts for a specific case"
)
async def harvest_emails_for_case(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service),
    connection_ids: Optional[List[int]] = None,
    max_messages_per_connection: int = 10,
    search_query: Optional[str] = None
):
    """Harvest emails from connected accounts for a specific case."""
    
    harvesting_service = EmailHarvestingService(service.db)
    
    try:
        results = await harvesting_service.harvest_emails_for_case(
            case_id=case_id,
            user_id=current_user.id,
            connection_ids=connection_ids,
            max_messages_per_connection=max_messages_per_connection,
            search_query=search_query
        )
        return results
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to harvest emails: {str(e)}"
        )


@router.get(
    "/harvest/stats",
    summary="Get Harvesting Statistics",
    description="Get statistics about email harvesting activity"
)
def get_harvesting_stats(
    case_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    service: EmailConnectionService = Depends(get_email_connection_service)
):
    """Get harvesting statistics for user or specific case."""
    
    harvesting_service = EmailHarvestingService(service.db)
    
    try:
        stats = harvesting_service.get_harvesting_stats(current_user.id, case_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get harvesting stats: {str(e)}"
        )
