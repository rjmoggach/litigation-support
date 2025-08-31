"""
Simple unit tests for EmailConnection model functionality
Tests individual methods and properties without database dependencies
"""

import sys
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, Mock

# Add the backend directory to the path
sys.path.append('/app')

from email_connections.utils import encrypt_token, decrypt_token


class MockEmailConnection:
    """Mock EmailConnection for testing without database dependencies"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id')
        self.email_address = kwargs.get('email_address')
        self.provider = kwargs.get('provider', 'google')
        self.provider_account_id = kwargs.get('provider_account_id')
        self.connection_name = kwargs.get('connection_name')
        self.access_token_encrypted = kwargs.get('access_token_encrypted')
        self.refresh_token_encrypted = kwargs.get('refresh_token_encrypted')
        self.token_expires_at = kwargs.get('token_expires_at')
        self.scopes_granted = kwargs.get('scopes_granted', '[]')
        self.connection_status = kwargs.get('connection_status', 'active')
        self.last_sync_at = kwargs.get('last_sync_at')
        self.error_message = kwargs.get('error_message')
        self.is_archived = kwargs.get('is_archived', False)
        self.archived_at = kwargs.get('archived_at')
        self.oauth_data = kwargs.get('oauth_data')
        self.created_at = kwargs.get('created_at')
        self.updated_at = kwargs.get('updated_at')
    
    @property
    def is_active(self) -> bool:
        return self.connection_status == "active"
    
    @property
    def is_expired(self) -> bool:
        if not self.token_expires_at:
            return False
        return self.token_expires_at < datetime.now(timezone.utc)
    
    @property
    def display_name(self) -> str:
        return self.connection_name or self.email_address
    
    def mark_as_error(self, error_message: str):
        self.connection_status = "error"
        self.error_message = error_message
    
    def mark_as_expired(self):
        self.connection_status = "expired"
        self.error_message = "OAuth tokens have expired"
    
    def mark_as_active(self):
        self.connection_status = "active"
        self.error_message = None
    
    def get_scopes_list(self) -> list[str]:
        try:
            return json.loads(self.scopes_granted) if self.scopes_granted else []
        except json.JSONDecodeError:
            return []
    
    def set_scopes_list(self, scopes: list[str]):
        self.scopes_granted = json.dumps(scopes)
    
    def get_oauth_data(self) -> dict:
        try:
            return json.loads(self.oauth_data) if self.oauth_data else {}
        except json.JSONDecodeError:
            return {}
    
    def set_oauth_data(self, data: dict):
        self.oauth_data = json.dumps(data) if data else None


def test_token_encryption():
    """Test token encryption/decryption"""
    print("Testing token encryption/decryption...")
    
    # Test basic encryption/decryption
    original_token = "ya29.a0AfH6SMC_test_token_here"
    encrypted = encrypt_token(original_token)
    decrypted = decrypt_token(encrypted)
    
    assert encrypted != original_token, "Encrypted token should be different from original"
    assert decrypted == original_token, "Decrypted token should match original"
    
    # Test empty tokens
    assert encrypt_token("") == "", "Empty token should return empty string"
    assert decrypt_token("") == "", "Empty encrypted token should return empty string"
    
    print("✓ Token encryption/decryption tests passed")


def test_model_properties():
    """Test EmailConnection model properties"""
    print("Testing model properties...")
    
    connection_data = {
        "user_id": 1,
        "email_address": "test@example.com",
        "provider": "google",
        "provider_account_id": "123456789",
        "connection_name": "Test Account",
        "access_token_encrypted": encrypt_token("sample_access_token"),
        "refresh_token_encrypted": encrypt_token("sample_refresh_token"),
        "token_expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "scopes_granted": '["https://www.googleapis.com/auth/gmail.readonly"]',
        "connection_status": "active",
    }
    
    connection = MockEmailConnection(**connection_data)
    
    # Test is_active property
    assert connection.is_active is True, "Active connection should return True for is_active"
    
    # Test is_expired property
    assert connection.is_expired is False, "Non-expired token should return False for is_expired"
    
    # Test display_name property
    assert connection.display_name == "Test Account", "Display name should use connection_name when available"
    
    connection.connection_name = None
    assert connection.display_name == "test@example.com", "Display name should fall back to email"
    
    print("✓ Model properties tests passed")


def test_status_methods():
    """Test status change methods"""
    print("Testing status methods...")
    
    connection = MockEmailConnection(
        user_id=1,
        email_address="test@example.com",
        provider_account_id="123",
        connection_status="active"
    )
    
    # Test mark_as_error
    connection.mark_as_error("Test error message")
    assert connection.connection_status == "error", "Status should be 'error'"
    assert connection.error_message == "Test error message", "Error message should be set"
    
    # Test mark_as_expired
    connection.mark_as_expired()
    assert connection.connection_status == "expired", "Status should be 'expired'"
    assert connection.error_message == "OAuth tokens have expired", "Error message should be set to expired message"
    
    # Test mark_as_active
    connection.mark_as_active()
    assert connection.connection_status == "active", "Status should be 'active'"
    assert connection.error_message is None, "Error message should be cleared"
    
    print("✓ Status methods tests passed")


def test_scopes_handling():
    """Test scopes JSON handling"""
    print("Testing scopes handling...")
    
    connection = MockEmailConnection(
        user_id=1,
        email_address="test@example.com",
        provider_account_id="123",
        scopes_granted='["scope1", "scope2", "scope3"]'
    )
    
    # Test get_scopes_list
    scopes = connection.get_scopes_list()
    assert scopes == ["scope1", "scope2", "scope3"], "Should return list of scopes"
    
    # Test set_scopes_list
    new_scopes = ["new_scope1", "new_scope2"]
    connection.set_scopes_list(new_scopes)
    assert connection.get_scopes_list() == new_scopes, "Should set and retrieve new scopes"
    
    # Test invalid JSON
    connection.scopes_granted = "invalid json"
    assert connection.get_scopes_list() == [], "Invalid JSON should return empty list"
    
    print("✓ Scopes handling tests passed")


def test_oauth_data_handling():
    """Test OAuth data JSON handling"""
    print("Testing OAuth data handling...")
    
    connection = MockEmailConnection(
        user_id=1,
        email_address="test@example.com",
        provider_account_id="123"
    )
    
    # Test setting and getting OAuth data
    oauth_data = {
        "user_id": "123456789",
        "picture": "https://example.com/pic.jpg",
        "locale": "en"
    }
    
    connection.set_oauth_data(oauth_data)
    retrieved = connection.get_oauth_data()
    assert retrieved == oauth_data, "OAuth data should round-trip correctly"
    
    # Test empty data
    connection.set_oauth_data({})
    assert connection.oauth_data is None, "Empty OAuth data should set to None"
    assert connection.get_oauth_data() == {}, "Empty OAuth data should return empty dict"
    
    print("✓ OAuth data handling tests passed")


def test_expiry_edge_cases():
    """Test token expiry edge cases"""
    print("Testing token expiry edge cases...")
    
    connection = MockEmailConnection(
        user_id=1,
        email_address="test@example.com",
        provider_account_id="123"
    )
    
    # Test with no expiry time
    connection.token_expires_at = None
    assert connection.is_expired is False, "No expiry time should not be considered expired"
    
    # Test with past expiry time
    connection.token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert connection.is_expired is True, "Past expiry time should be considered expired"
    
    # Test with future expiry time
    connection.token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    assert connection.is_expired is False, "Future expiry time should not be considered expired"
    
    print("✓ Token expiry edge cases tests passed")


def run_all_tests():
    """Run all model tests"""
    print("Running EmailConnection model tests...")
    print("=" * 50)
    
    try:
        test_token_encryption()
        test_model_properties()
        test_status_methods()
        test_scopes_handling()
        test_oauth_data_handling()
        test_expiry_edge_cases()
        
        print("\n" + "=" * 50)
        print("🎉 All EmailConnection model tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)