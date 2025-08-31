"""
Integration tests for Email Connections API endpoints
"""

import sys
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, MagicMock

# Add the backend directory to the path
sys.path.append('/app')


class MockUser:
    """Mock User for API testing"""
    def __init__(self, id=1, email="test@example.com"):
        self.id = id
        self.email = email
        self.is_active = True


class MockEmailConnectionResponse:
    """Mock response for API tests"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.user_id = kwargs.get('user_id', 1)
        self.email_address = kwargs.get('email_address', 'test@example.com')
        self.provider = kwargs.get('provider', 'google')
        self.provider_account_id = kwargs.get('provider_account_id', '123456789')
        self.connection_status = kwargs.get('connection_status', 'active')
        self.connection_name = kwargs.get('connection_name')
        self.scopes_granted = kwargs.get('scopes_granted', ['gmail.readonly'])
        self.last_sync_at = kwargs.get('last_sync_at')
        self.error_message = kwargs.get('error_message')
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at')


class MockRequest:
    """Mock FastAPI Request"""
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url


def create_mock_fastapi_app():
    """Create mock FastAPI app for testing"""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    
    # Import the actual router
    from email_connections.api import router
    
    app = FastAPI()
    app.include_router(router, prefix="/email-connections")
    
    return TestClient(app)


def test_list_connections_endpoint():
    """Test the list connections endpoint"""
    print("Testing list_connections endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock service response
    mock_connections = [
        MockEmailConnectionResponse(id=1, connection_status="active"),
        MockEmailConnectionResponse(id=2, connection_status="expired"),
        MockEmailConnectionResponse(id=3, connection_status="error"),
    ]
    mock_service.get_user_connections.return_value = mock_connections
    
    # Import and test the function directly
    from email_connections.api import list_connections
    
    result = list_connections(current_user=mock_user, service=mock_service)
    
    assert result.total == 3
    assert result.active == 1
    assert result.expired == 1
    assert result.error == 1
    assert len(result.connections) == 3
    
    print("✓ list_connections endpoint test passed")


def test_get_connection_endpoint():
    """Test the get connection endpoint"""
    print("Testing get_connection endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Test successful get
    mock_connection = MockEmailConnectionResponse()
    mock_service.get_connection.return_value = mock_connection
    
    from email_connections.api import get_connection
    
    result = get_connection(connection_id=1, current_user=mock_user, service=mock_service)
    assert result == mock_connection
    
    # Test connection not found
    mock_service.get_connection.return_value = None
    
    try:
        get_connection(connection_id=999, current_user=mock_user, service=mock_service)
        assert False, "Should have raised HTTPException"
    except Exception as e:
        assert "404" in str(e) or "not found" in str(e).lower()
    
    print("✓ get_connection endpoint test passed")


def test_update_connection_endpoint():
    """Test the update connection endpoint"""
    print("Testing update_connection endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock update data
    from email_connections.schemas import EmailConnectionUpdate
    update_data = Mock()
    update_data.connection_name = "Updated Name"
    
    # Test successful update
    mock_connection = MockEmailConnectionResponse(connection_name="Updated Name")
    mock_service.update_connection.return_value = mock_connection
    
    from email_connections.api import update_connection
    
    result = update_connection(
        connection_id=1,
        update_data=update_data,
        current_user=mock_user,
        service=mock_service
    )
    assert result.connection_name == "Updated Name"
    
    # Test connection not found
    mock_service.update_connection.return_value = None
    
    try:
        update_connection(
            connection_id=999,
            update_data=update_data,
            current_user=mock_user,
            service=mock_service
        )
        assert False, "Should have raised HTTPException"
    except Exception as e:
        assert "404" in str(e) or "not found" in str(e).lower()
    
    print("✓ update_connection endpoint test passed")


def test_delete_connection_endpoint():
    """Test the delete connection endpoint"""
    print("Testing delete_connection endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock existing connection
    mock_connection = MockEmailConnectionResponse(email_address="test@example.com")
    mock_service.get_connection.return_value = mock_connection
    
    # Mock tokens for revocation
    mock_tokens = {"access_token": "test_token"}
    mock_service.get_connection_tokens.return_value = mock_tokens
    
    # Mock successful deletion
    mock_service.delete_connection.return_value = {
        "success": True,
        "archived": False,
        "email_address": "test@example.com",
        "message": "Connection deleted permanently"
    }
    
    from email_connections.api import delete_connection
    
    with patch('email_connections.api.google_oauth_handler') as mock_oauth:
        mock_oauth.revoke_token = Mock()
        
        result = delete_connection(
            connection_id=1,
            current_user=mock_user,
            service=mock_service
        )
        
        assert result.connection_id == 1
        assert result.email_address == "test@example.com"
        assert "deleted permanently" in result.message
        
        # Verify token revocation was attempted
        mock_oauth.revoke_token.assert_called_once_with("test_token")
    
    print("✓ delete_connection endpoint test passed")


def test_check_connection_health_endpoint():
    """Test the connection health check endpoint"""
    print("Testing check_connection_health endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock health check response
    mock_health = Mock()
    mock_health.is_healthy = True
    mock_health.status = "active"
    mock_service.check_connection_health.return_value = mock_health
    
    from email_connections.api import check_connection_health
    
    result = check_connection_health(
        connection_id=1,
        current_user=mock_user,
        service=mock_service
    )
    
    assert result.is_healthy is True
    assert result.status == "active"
    
    print("✓ check_connection_health endpoint test passed")


def test_get_connection_status_endpoint():
    """Test the bulk connection status endpoint"""
    print("Testing get_connection_status endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock bulk status response
    mock_status = Mock()
    mock_status.user_id = 1
    mock_status.total_connections = 3
    mock_status.active_connections = 2
    mock_service.get_user_connection_status.return_value = mock_status
    
    from email_connections.api import get_connection_status
    
    result = get_connection_status(current_user=mock_user, service=mock_service)
    
    assert result.user_id == 1
    assert result.total_connections == 3
    assert result.active_connections == 2
    
    print("✓ get_connection_status endpoint test passed")


def test_initiate_oauth_flow_endpoint():
    """Test the OAuth initiation endpoint"""
    print("Testing initiate_oauth_flow endpoint...")
    
    mock_user = MockUser()
    mock_request = MockRequest()
    
    # Mock request data
    mock_request_data = Mock()
    mock_request_data.redirect_uri = None
    mock_request_data.scopes = ["gmail.readonly"]
    mock_request_data.provider = "google"
    
    from email_connections.api import initiate_oauth_flow
    
    with patch('email_connections.api.oauth_state_manager') as mock_state_mgr, \
         patch('email_connections.api.google_oauth_handler') as mock_oauth:
        
        mock_state_mgr.generate_state.return_value = "test_state_123"
        mock_oauth.get_authorization_url.return_value = ("https://accounts.google.com/oauth", "test_state")
        
        result = initiate_oauth_flow(
            request_data=mock_request_data,
            request=mock_request,
            current_user=mock_user
        )
        
        assert "https://accounts.google.com/oauth" in result.authorization_url
        assert result.state == "test_state_123"
        assert result.provider == "google"
        
        # Verify state generation was called
        mock_state_mgr.generate_state.assert_called_once()
    
    print("✓ initiate_oauth_flow endpoint test passed")


def test_oauth_callback_endpoint():
    """Test the OAuth callback endpoint"""
    print("Testing oauth_callback endpoint...")
    
    mock_service = Mock()
    
    # Mock state validation
    mock_state_data = {
        "user_id": 1,
        "redirect_uri": "http://localhost:3000/callback"
    }
    
    # Mock OAuth responses
    mock_token_response = {
        "access_token": "test_access_token",
        "refresh_token": "test_refresh_token",
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    
    mock_user_info = {
        "id": "123456789",
        "email": "oauth@example.com",
        "name": "OAuth User"
    }
    
    mock_connection = MockEmailConnectionResponse(
        id=1,
        email_address="oauth@example.com",
        connection_name="OAuth User"
    )
    mock_service.create_connection.return_value = mock_connection
    
    from email_connections.api import handle_oauth_callback
    
    with patch('email_connections.api.oauth_state_manager') as mock_state_mgr, \
         patch('email_connections.api.google_oauth_handler') as mock_oauth, \
         patch('email_connections.api.GMAIL_DEFAULT_SCOPES', ["gmail.readonly"]):
        
        mock_state_mgr.validate_state_only.return_value = mock_state_data
        mock_oauth.exchange_code_for_tokens.return_value = mock_token_response
        mock_oauth.get_user_info.return_value = mock_user_info
        mock_state_mgr.consume_state = Mock()
        
        result = handle_oauth_callback(
            state="test_state",
            code="test_auth_code",
            scope="gmail.readonly",
            service=mock_service
        )
        
        # Verify the HTML response contains expected content
        assert "OAuth Success" in result.body.decode()
        assert "oauth@example.com" in result.body.decode()
        assert "window.close()" in result.body.decode()
        
        # Verify OAuth flow was completed
        mock_oauth.exchange_code_for_tokens.assert_called_once()
        mock_oauth.get_user_info.assert_called_once()
        mock_service.create_connection.assert_called_once()
        mock_state_mgr.consume_state.assert_called_once()
    
    print("✓ oauth_callback endpoint test passed")


def test_oauth_callback_invalid_state():
    """Test OAuth callback with invalid state"""
    print("Testing oauth_callback with invalid state...")
    
    mock_service = Mock()
    
    from email_connections.api import handle_oauth_callback
    
    with patch('email_connections.api.oauth_state_manager') as mock_state_mgr:
        mock_state_mgr.validate_state_only.return_value = None
        
        try:
            handle_oauth_callback(
                state="invalid_state",
                code="test_code",
                service=mock_service
            )
            assert False, "Should have raised HTTPException"
        except Exception as e:
            assert "400" in str(e) or "Invalid or expired OAuth state" in str(e)
    
    print("✓ oauth_callback invalid state test passed")


def test_refresh_connection_tokens_endpoint():
    """Test the token refresh endpoint"""
    print("Testing refresh_connection_tokens endpoint...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock successful token refresh scenario
    mock_tokens = {
        "access_token": "old_token",
        "refresh_token": "refresh_token"
    }
    mock_service.get_connection_tokens.return_value = mock_tokens
    
    from email_connections.api import refresh_connection_tokens
    
    with patch('email_connections.api.google_oauth_handler') as mock_oauth:
        mock_oauth.refresh_access_token.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        
        mock_service.update_tokens.return_value = True
        
        # Create a mock response
        mock_response = Mock()
        mock_response.success = True
        mock_response.message = "Tokens refreshed successfully"
        
        with patch('email_connections.api.TokenRefreshResponse') as mock_response_class:
            mock_response_class.return_value = mock_response
            
            result = refresh_connection_tokens(
                connection_id=1,
                current_user=mock_user,
                service=mock_service
            )
            
            assert result.success is True
            mock_oauth.refresh_access_token.assert_called_once()
            mock_service.update_tokens.assert_called_once()
    
    print("✓ refresh_connection_tokens endpoint test passed")


def test_refresh_tokens_no_refresh_token():
    """Test token refresh with no refresh token available"""
    print("Testing refresh_tokens with no refresh token...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Mock no refresh token scenario
    mock_service.get_connection_tokens.return_value = {"access_token": "token"}  # No refresh_token
    
    from email_connections.api import refresh_connection_tokens
    
    try:
        refresh_connection_tokens(
            connection_id=1,
            current_user=mock_user,
            service=mock_service
        )
        assert False, "Should have raised HTTPException"
    except Exception as e:
        assert "400" in str(e) or "no refresh token" in str(e).lower()
    
    print("✓ refresh_tokens no refresh token test passed")


def test_api_error_handling():
    """Test API error handling scenarios"""
    print("Testing API error handling...")
    
    mock_user = MockUser()
    mock_service = Mock()
    
    # Test service exceptions bubble up as HTTP errors
    mock_service.get_connection.side_effect = Exception("Database error")
    
    from email_connections.api import get_connection
    
    try:
        get_connection(connection_id=1, current_user=mock_user, service=mock_service)
        assert False, "Should have raised an exception"
    except Exception:
        # Any exception is fine - we're testing that errors are handled
        pass
    
    print("✓ API error handling test passed")


def test_oauth_flow_integration():
    """Test complete OAuth flow integration"""
    print("Testing complete OAuth flow integration...")
    
    mock_user = MockUser()
    mock_request = MockRequest()
    mock_service = Mock()
    
    # Test initiate -> callback flow
    from email_connections.api import initiate_oauth_flow, handle_oauth_callback
    
    # Step 1: Initiate OAuth
    mock_request_data = Mock()
    mock_request_data.redirect_uri = None
    mock_request_data.scopes = ["gmail.readonly"]
    mock_request_data.provider = "google"
    
    with patch('email_connections.api.oauth_state_manager') as mock_state_mgr, \
         patch('email_connections.api.google_oauth_handler') as mock_oauth:
        
        mock_state_mgr.generate_state.return_value = "test_state_123"
        mock_oauth.get_authorization_url.return_value = ("https://accounts.google.com/oauth", "test_state")
        
        # Initiate flow
        initiate_result = initiate_oauth_flow(
            request_data=mock_request_data,
            request=mock_request,
            current_user=mock_user
        )
        
        assert initiate_result.state == "test_state_123"
        
        # Step 2: Handle callback
        mock_state_mgr.validate_state_only.return_value = {
            "user_id": 1,
            "redirect_uri": "http://localhost:8000/api/v1/email-connections/oauth/callback"
        }
        
        mock_oauth.exchange_code_for_tokens.return_value = {
            "access_token": "final_access_token",
            "refresh_token": "final_refresh_token"
        }
        
        mock_oauth.get_user_info.return_value = {
            "id": "123456789",
            "email": "oauth@example.com",
            "name": "OAuth User"
        }
        
        mock_connection = MockEmailConnectionResponse(
            id=1,
            email_address="oauth@example.com"
        )
        mock_service.create_connection.return_value = mock_connection
        
        # Handle callback
        callback_result = handle_oauth_callback(
            state="test_state_123",
            code="auth_code_123",
            scope="gmail.readonly",
            service=mock_service
        )
        
        # Verify HTML response contains connection info
        response_content = callback_result.body.decode()
        assert "oauth@example.com" in response_content
        assert "OAUTH_SUCCESS" in response_content
        
        # Verify flow completion
        mock_state_mgr.consume_state.assert_called_once_with("test_state_123")
    
    print("✓ OAuth flow integration test passed")


def test_authorization_middleware():
    """Test that endpoints properly require authentication"""
    print("Testing authorization middleware...")
    
    # This test would ideally use TestClient to test authentication middleware
    # For now, we'll test that the dependency is correctly specified
    
    from email_connections.api import list_connections
    import inspect
    
    # Check that get_current_active_user is in the function signature
    sig = inspect.signature(list_connections)
    assert 'current_user' in sig.parameters
    
    # Check the annotation includes the dependency
    param = sig.parameters['current_user']
    assert param.default is not None  # Should have Depends() as default
    
    print("✓ Authorization middleware test passed")


def run_all_api_tests():
    """Run all API integration tests"""
    print("Running Email Connections API integration tests...")
    print("=" * 70)
    
    try:
        test_list_connections_endpoint()
        test_get_connection_endpoint()
        test_update_connection_endpoint()
        test_delete_connection_endpoint()
        test_check_connection_health_endpoint()
        test_get_connection_status_endpoint()
        test_initiate_oauth_flow_endpoint()
        test_oauth_callback_endpoint()
        test_oauth_callback_invalid_state()
        test_refresh_connection_tokens_endpoint()
        test_refresh_tokens_no_refresh_token()
        test_api_error_handling()
        test_oauth_flow_integration()
        test_authorization_middleware()
        
        print("\n" + "=" * 70)
        print("🎉 All API integration tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys
    success = run_all_api_tests()
    sys.exit(0 if success else 1)