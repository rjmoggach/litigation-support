"""
Simple test runner for EmailConnection model tests
Run this script to validate the model functionality without pytest
"""

import sys
import traceback
from datetime import datetime, timezone, timedelta

# Add the backend directory to the path
sys.path.append('/app')

from users.models import User  # Import User model first
from email_connections.models import EmailConnection
from email_connections.utils import encrypt_token, decrypt_token


def run_basic_model_tests():
    """Run basic tests for EmailConnection model"""
    print("Running EmailConnection model tests...")
    
    # Test 1: Model creation
    print("\n1. Testing model creation...")
    try:
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
        
        connection = EmailConnection(**connection_data)
        print("✓ Model creation successful")
        
        # Test properties
        assert connection.is_active is True
        assert connection.is_expired is False
        assert connection.display_name == "Test Account"
        print("✓ Properties working correctly")
        
    except Exception as e:
        print(f"✗ Model creation failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 2: Token encryption/decryption
    print("\n2. Testing token encryption/decryption...")
    try:
        original_token = "ya29.a0AfH6SMC_test_token_here"
        encrypted = encrypt_token(original_token)
        decrypted = decrypt_token(encrypted)
        
        assert encrypted != original_token
        assert decrypted == original_token
        print("✓ Token encryption/decryption working")
        
    except Exception as e:
        print(f"✗ Token encryption failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 3: Status methods
    print("\n3. Testing status methods...")
    try:
        connection.mark_as_error("Test error")
        assert connection.connection_status == "error"
        assert connection.error_message == "Test error"
        
        connection.mark_as_expired()
        assert connection.connection_status == "expired"
        assert connection.error_message == "OAuth tokens have expired"
        
        connection.mark_as_active()
        assert connection.connection_status == "active"
        assert connection.error_message is None
        
        print("✓ Status methods working correctly")
        
    except Exception as e:
        print(f"✗ Status methods failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 4: Scopes handling
    print("\n4. Testing scopes handling...")
    try:
        # Test getting scopes
        scopes = connection.get_scopes_list()
        assert scopes == ["https://www.googleapis.com/auth/gmail.readonly"]
        
        # Test setting scopes
        new_scopes = ["scope1", "scope2", "scope3"]
        connection.set_scopes_list(new_scopes)
        assert connection.get_scopes_list() == new_scopes
        
        print("✓ Scopes handling working correctly")
        
    except Exception as e:
        print(f"✗ Scopes handling failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 5: OAuth data handling
    print("\n5. Testing OAuth data handling...")
    try:
        oauth_data = {"user_id": "123", "picture": "https://example.com/pic.jpg"}
        connection.set_oauth_data(oauth_data)
        retrieved = connection.get_oauth_data()
        assert retrieved == oauth_data
        
        print("✓ OAuth data handling working correctly")
        
    except Exception as e:
        print(f"✗ OAuth data handling failed: {e}")
        traceback.print_exc()
        return False
    
    print("\n🎉 All EmailConnection model tests passed!")
    return True


if __name__ == "__main__":
    success = run_basic_model_tests()
    sys.exit(0 if success else 1)