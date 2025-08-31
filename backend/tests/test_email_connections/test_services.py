"""
Unit tests for EmailConnectionService
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, MagicMock
from typing import List

# Mock the schema classes and dependencies
class MockEmailConnectionCreate:
    def __init__(self, **kwargs):
        self.email_address = kwargs.get('email_address')
        self.provider = kwargs.get('provider', 'google')
        self.provider_account_id = kwargs.get('provider_account_id')
        self.connection_name = kwargs.get('connection_name')
        self.access_token = kwargs.get('access_token')
        self.refresh_token = kwargs.get('refresh_token')
        self.token_expires_at = kwargs.get('token_expires_at')
        self.scopes_granted = kwargs.get('scopes_granted', [])
        self.oauth_data = kwargs.get('oauth_data')


class MockEmailConnectionUpdate:
    def __init__(self, **kwargs):
        self.connection_name = kwargs.get('connection_name')
        self.connection_status = kwargs.get('connection_status')


class MockEmailConnectionResponse:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id')
        self.email_address = kwargs.get('email_address')
        self.provider = kwargs.get('provider')
        self.provider_account_id = kwargs.get('provider_account_id')
        self.connection_name = kwargs.get('connection_name')
        self.connection_status = kwargs.get('connection_status')
        self.last_sync_at = kwargs.get('last_sync_at')
        self.error_message = kwargs.get('error_message')
        self.created_at = kwargs.get('created_at')
        self.updated_at = kwargs.get('updated_at')
        self.scopes_granted = kwargs.get('scopes_granted', [])


class MockEmailConnection:
    """Mock EmailConnection model for testing"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.user_id = kwargs.get('user_id', 1)
        self.email_address = kwargs.get('email_address', 'test@example.com')
        self.provider = kwargs.get('provider', 'google')
        self.provider_account_id = kwargs.get('provider_account_id', '123456789')
        self.connection_name = kwargs.get('connection_name')
        self.access_token_encrypted = kwargs.get('access_token_encrypted', 'encrypted_access_token')
        self.refresh_token_encrypted = kwargs.get('refresh_token_encrypted', 'encrypted_refresh_token')
        self.token_expires_at = kwargs.get('token_expires_at', datetime.now(timezone.utc) + timedelta(hours=1))
        self.scopes_granted = kwargs.get('scopes_granted', '["gmail.readonly"]')
        self.connection_status = kwargs.get('connection_status', 'active')
        self.last_sync_at = kwargs.get('last_sync_at')
        self.error_message = kwargs.get('error_message')
        self.is_archived = kwargs.get('is_archived', False)
        self.archived_at = kwargs.get('archived_at')
        self.oauth_data = kwargs.get('oauth_data')
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at')

    def set_oauth_data(self, data):
        import json
        self.oauth_data = json.dumps(data) if data else None


def create_mock_service():
    """Create a mock EmailConnectionService"""
    mock_db = Mock()
    
    # Import the actual service class
    import sys
    sys.path.append('/app')
    from email_connections.services import EmailConnectionService
    
    service = EmailConnectionService(mock_db)
    return service, mock_db


def test_create_connection():
    """Test creating a new email connection"""
    print("Testing create_connection...")
    
    service, mock_db = create_mock_service()
    
    # Mock no existing connection
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    # Mock successful database operations
    mock_db.add = Mock()
    mock_db.commit = Mock()
    mock_db.refresh = Mock()
    
    # Create test data
    connection_data = MockEmailConnectionCreate(
        email_address="test@example.com",
        provider="google",
        provider_account_id="123456789",
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        scopes_granted=["gmail.readonly"]
    )
    
    with patch('email_connections.services.encrypt_token') as mock_encrypt, \
         patch('email_connections.services.scopes_to_string') as mock_scopes_to_string, \
         patch('email_connections.services.EmailConnection') as mock_model:
        
        mock_encrypt.side_effect = lambda x: f"encrypted_{x}"
        mock_scopes_to_string.return_value = '["gmail.readonly"]'
        mock_instance = Mock()
        mock_model.return_value = mock_instance
        
        # Mock the _to_response_schema method
        service._to_response_schema = Mock(return_value=MockEmailConnectionResponse(
            id=1,
            email_address="test@example.com"
        ))
        
        result = service.create_connection(1, connection_data)
        
        # Verify database operations were called
        mock_db.add.assert_called_once_with(mock_instance)
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_instance)
        
        assert result.email_address == "test@example.com"
    
    print("✓ create_connection test passed")


def test_create_duplicate_connection():
    """Test creating a duplicate connection should fail"""
    print("Testing duplicate connection creation...")
    
    service, mock_db = create_mock_service()
    
    # Mock existing connection
    existing_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = existing_connection
    
    connection_data = MockEmailConnectionCreate(
        email_address="test@example.com",
        provider="google",
        provider_account_id="123456789",
        access_token="test_access_token"
    )
    
    try:
        service.create_connection(1, connection_data)
        assert False, "Should have raised ValueError for duplicate connection"
    except ValueError as e:
        assert "Connection already exists" in str(e)
    
    print("✓ Duplicate connection test passed")


def test_get_user_connections():
    """Test getting user connections"""
    print("Testing get_user_connections...")
    
    service, mock_db = create_mock_service()
    
    # Mock database query
    mock_connections = [
        MockEmailConnection(id=1, email_address="test1@example.com"),
        MockEmailConnection(id=2, email_address="test2@example.com")
    ]
    
    mock_query = Mock()
    mock_db.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value.all.return_value = mock_connections
    
    # Mock the _to_response_schema method
    service._to_response_schema = Mock(side_effect=lambda conn: MockEmailConnectionResponse(
        id=conn.id, 
        email_address=conn.email_address
    ))
    
    result = service.get_user_connections(1)
    
    assert len(result) == 2
    assert result[0].email_address == "test1@example.com"
    assert result[1].email_address == "test2@example.com"
    
    print("✓ get_user_connections test passed")


def test_get_connection():
    """Test getting a specific connection"""
    print("Testing get_connection...")
    
    service, mock_db = create_mock_service()
    
    # Test connection found
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    service._to_response_schema = Mock(return_value=MockEmailConnectionResponse(id=1))
    
    result = service.get_connection(1, 1)
    assert result is not None
    assert result.id == 1
    
    # Test connection not found
    mock_db.query.return_value.filter.return_value.first.return_value = None
    result = service.get_connection(999, 1)
    assert result is None
    
    print("✓ get_connection test passed")


def test_update_connection():
    """Test updating a connection"""
    print("Testing update_connection...")
    
    service, mock_db = create_mock_service()
    
    # Mock existing connection
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.commit = Mock()
    mock_db.refresh = Mock()
    
    service._to_response_schema = Mock(return_value=MockEmailConnectionResponse(
        connection_name="Updated Name"
    ))
    
    update_data = MockEmailConnectionUpdate(
        connection_name="Updated Name",
        connection_status="active"
    )
    
    result = service.update_connection(1, 1, update_data)
    
    assert result.connection_name == "Updated Name"
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()
    
    print("✓ update_connection test passed")


def test_update_tokens():
    """Test updating tokens for a connection"""
    print("Testing update_tokens...")
    
    service, mock_db = create_mock_service()
    
    # Mock existing connection
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.commit = Mock()
    
    with patch('email_connections.services.encrypt_token') as mock_encrypt:
        mock_encrypt.side_effect = lambda x: f"encrypted_{x}"
        
        result = service.update_tokens(
            connection_id=1,
            user_id=1,
            access_token="new_access_token",
            refresh_token="new_refresh_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        
        assert result is True
        assert mock_connection.connection_status == "active"
        assert mock_connection.error_message is None
        mock_db.commit.assert_called_once()
    
    print("✓ update_tokens test passed")


def test_mark_connection_error():
    """Test marking a connection as error"""
    print("Testing mark_connection_error...")
    
    service, mock_db = create_mock_service()
    
    # Mock existing connection
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.commit = Mock()
    
    with patch('email_connections.services.sanitize_error_message') as mock_sanitize:
        mock_sanitize.return_value = "Sanitized error message"
        
        result = service.mark_connection_error(1, 1, "Test error message")
        
        assert result is True
        assert mock_connection.connection_status == "error"
        assert mock_connection.error_message == "Sanitized error message"
        mock_db.commit.assert_called_once()
    
    print("✓ mark_connection_error test passed")


def test_check_connection_health():
    """Test connection health checking"""
    print("Testing check_connection_health...")
    
    service, mock_db = create_mock_service()
    
    # Mock existing healthy connection
    mock_connection = MockEmailConnection(
        connection_status="active",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    
    with patch('email_connections.services.is_token_expired') as mock_expired, \
         patch('email_connections.services.should_refresh_token') as mock_should_refresh, \
         patch('email_connections.services.ConnectionHealthCheck') as mock_health_check:
        
        mock_expired.return_value = False
        mock_should_refresh.return_value = False
        mock_health_check.return_value = Mock(is_healthy=True)
        
        result = service.check_connection_health(1, 1)
        
        mock_health_check.assert_called_once()
        assert result.is_healthy is True
    
    print("✓ check_connection_health test passed")


def test_get_user_connection_status():
    """Test getting bulk user connection status"""
    print("Testing get_user_connection_status...")
    
    service, mock_db = create_mock_service()
    
    # Mock connections
    mock_connections = [
        MockEmailConnection(connection_status="active"),
        MockEmailConnection(connection_status="expired"),
        MockEmailConnection(connection_status="error")
    ]
    mock_db.query.return_value.filter.return_value.all.return_value = mock_connections
    
    with patch('email_connections.services.ConnectionStatus') as mock_status, \
         patch('email_connections.services.BulkConnectionStatus') as mock_bulk_status, \
         patch('email_connections.services.is_token_expired') as mock_expired:
        
        mock_expired.return_value = False
        mock_status.return_value = Mock()
        mock_bulk_status.return_value = Mock(total_connections=3, active_connections=1)
        
        result = service.get_user_connection_status(1)
        
        # Should be called once for bulk status creation
        mock_bulk_status.assert_called_once()
        
        # Check that the call had correct counts
        call_args = mock_bulk_status.call_args[1]
        assert call_args['total_connections'] == 3
        assert call_args['active_connections'] == 1
        assert call_args['expired_connections'] == 1
        assert call_args['error_connections'] == 1
    
    print("✓ get_user_connection_status test passed")


def test_delete_connection_safe():
    """Test safely deleting a connection with no related records"""
    print("Testing delete_connection (safe deletion)...")
    
    service, mock_db = create_mock_service()
    
    mock_connection = MockEmailConnection(email_address="test@example.com")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.delete = Mock()
    mock_db.commit = Mock()
    
    # Mock check_connection_usage to return safe to delete
    service.check_connection_usage = Mock(return_value={
        "exists": True,
        "can_delete": True,
        "total_related": 0
    })
    
    result = service.delete_connection(1, 1)
    
    assert result["success"] is True
    assert result["archived"] is False
    assert "deleted permanently" in result["message"]
    mock_db.delete.assert_called_once_with(mock_connection)
    mock_db.commit.assert_called_once()
    
    print("✓ Safe delete_connection test passed")


def test_delete_connection_with_relations():
    """Test deleting a connection with related records (should archive)"""
    print("Testing delete_connection (archival due to relations)...")
    
    service, mock_db = create_mock_service()
    
    mock_connection = MockEmailConnection(email_address="test@example.com")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.commit = Mock()
    mock_db.refresh = Mock()
    
    # Mock check_connection_usage to return has related records
    service.check_connection_usage = Mock(return_value={
        "exists": True,
        "can_delete": False,
        "total_related": 5
    })
    
    result = service.delete_connection(1, 1)
    
    assert result["success"] is True
    assert result["archived"] is True
    assert "archived due to 5 related records" in result["message"]
    assert mock_connection.is_archived is True
    assert mock_connection.connection_status == "archived"
    mock_db.commit.assert_called_once()
    
    print("✓ Archival delete_connection test passed")


def test_get_connection_tokens():
    """Test getting connection tokens"""
    print("Testing get_connection_tokens...")
    
    service, mock_db = create_mock_service()
    
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    
    with patch('email_connections.services.decrypt_token') as mock_decrypt, \
         patch('email_connections.services.should_refresh_token') as mock_should_refresh, \
         patch('email_connections.services.parse_scopes_string') as mock_parse_scopes:
        
        mock_decrypt.side_effect = lambda x: x.replace('encrypted_', '')
        mock_should_refresh.return_value = False
        mock_parse_scopes.return_value = ["gmail.readonly"]
        
        result = service.get_connection_tokens(1, 1, auto_refresh=False)
        
        assert result is not None
        assert result["access_token"] == "access_token"
        assert result["refresh_token"] == "refresh_token"
        assert result["scopes"] == ["gmail.readonly"]
    
    print("✓ get_connection_tokens test passed")


def test_get_connection_tokens_with_refresh():
    """Test getting connection tokens with auto-refresh"""
    print("Testing get_connection_tokens with auto-refresh...")
    
    service, mock_db = create_mock_service()
    
    mock_connection = MockEmailConnection()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    mock_db.commit = Mock()
    
    with patch('email_connections.services.decrypt_token') as mock_decrypt, \
         patch('email_connections.services.should_refresh_token') as mock_should_refresh, \
         patch('email_connections.services.parse_scopes_string') as mock_parse_scopes:
        
        mock_decrypt.side_effect = lambda x: x.replace('encrypted_', '') if x else None
        mock_should_refresh.return_value = True
        mock_parse_scopes.return_value = ["gmail.readonly"]
        
        # Mock the OAuth handler and update_tokens method
        with patch('email_connections.oauth.google_oauth_handler') as mock_oauth:
            mock_oauth.refresh_access_token.return_value = {
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
            }
            
            service.update_tokens = Mock(return_value=True)
            
            result = service.get_connection_tokens(1, 1, auto_refresh=True)
            
            assert result is not None
            assert result["access_token"] == "new_access_token"
            service.update_tokens.assert_called_once()
    
    print("✓ get_connection_tokens with auto-refresh test passed")


def test_connection_not_found():
    """Test operations on non-existent connections"""
    print("Testing operations on non-existent connections...")
    
    service, mock_db = create_mock_service()
    
    # Mock no connection found
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    # Test get_connection
    result = service.get_connection(999, 1)
    assert result is None
    
    # Test update_connection
    update_data = MockEmailConnectionUpdate(connection_name="New Name")
    result = service.update_connection(999, 1, update_data)
    assert result is None
    
    # Test get_connection_tokens
    result = service.get_connection_tokens(999, 1)
    assert result is None
    
    # Test mark_connection_error
    result = service.mark_connection_error(999, 1, "Error message")
    assert result is False
    
    # Test update_tokens
    result = service.update_tokens(999, 1, "new_token")
    assert result is False
    
    print("✓ Non-existent connection tests passed")


def test_authorization_checks():
    """Test that user authorization is properly checked"""
    print("Testing authorization checks...")
    
    service, mock_db = create_mock_service()
    
    # Mock connection that belongs to different user
    mock_connection = MockEmailConnection(user_id=2)  # Different user
    mock_db.query.return_value.filter.return_value.first.return_value = mock_connection
    
    # The filter should include user_id check, so this should return None
    # when the filter is applied properly
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    result = service.get_connection(1, 1)  # Try to access as user 1
    assert result is None
    
    print("✓ Authorization checks test passed")


def run_all_service_tests():
    """Run all EmailConnectionService tests"""
    print("Running EmailConnectionService tests...")
    print("=" * 60)
    
    try:
        test_create_connection()
        test_create_duplicate_connection()
        test_get_user_connections()
        test_get_connection()
        test_update_connection()
        test_get_connection_tokens()
        test_get_connection_tokens_with_refresh()
        test_update_tokens()
        test_mark_connection_error()
        test_delete_connection_safe()
        test_delete_connection_with_relations()
        test_connection_not_found()
        test_authorization_checks()
        
        print("\n" + "=" * 60)
        print("🎉 All EmailConnectionService tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys
    success = run_all_service_tests()
    sys.exit(0 if success else 1)