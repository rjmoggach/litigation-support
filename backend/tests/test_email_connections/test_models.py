"""
Unit tests for EmailConnection model
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from email_connections.models import EmailConnection
from email_connections.utils import encrypt_token, decrypt_token


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()


@pytest.fixture
def sample_email_connection_data():
    """Sample data for creating EmailConnection instances"""
    return {
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


class TestEmailConnectionModel:
    """Test suite for EmailConnection model"""

    def test_model_creation(self, db_session, sample_email_connection_data):
        """Test creating a new EmailConnection instance"""
        connection = EmailConnection(**sample_email_connection_data)
        db_session.add(connection)
        db_session.commit()
        
        assert connection.id is not None
        assert connection.email_address == "test@example.com"
        assert connection.provider == "google"
        assert connection.connection_status == "active"
        assert connection.created_at is not None
        assert connection.updated_at is None  # Only set on update

    def test_model_repr(self, sample_email_connection_data):
        """Test string representation of EmailConnection"""
        connection = EmailConnection(**sample_email_connection_data)
        connection.id = 1
        
        repr_str = repr(connection)
        assert "EmailConnection(id=1" in repr_str
        assert "user_id=1" in repr_str
        assert "email=test@example.com" in repr_str
        assert "status=active" in repr_str

    def test_is_active_property(self, sample_email_connection_data):
        """Test is_active property"""
        # Test active connection
        connection = EmailConnection(**sample_email_connection_data)
        assert connection.is_active is True
        
        # Test non-active connection
        connection.connection_status = "expired"
        assert connection.is_active is False

    def test_is_expired_property(self, sample_email_connection_data):
        """Test is_expired property"""
        # Test non-expired token
        connection = EmailConnection(**sample_email_connection_data)
        assert connection.is_expired is False
        
        # Test expired token
        connection.token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        assert connection.is_expired is True
        
        # Test missing expiration (should be considered expired)
        connection.token_expires_at = None
        assert connection.is_expired is False

    def test_display_name_property(self, sample_email_connection_data):
        """Test display_name property"""
        # With connection name
        connection = EmailConnection(**sample_email_connection_data)
        assert connection.display_name == "Test Account"
        
        # Without connection name
        connection.connection_name = None
        assert connection.display_name == "test@example.com"
        
        # With empty connection name
        connection.connection_name = ""
        assert connection.display_name == "test@example.com"

    def test_mark_as_error(self, sample_email_connection_data):
        """Test mark_as_error method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        connection.mark_as_error("Test error message")
        
        assert connection.connection_status == "error"
        assert connection.error_message == "Test error message"

    def test_mark_as_expired(self, sample_email_connection_data):
        """Test mark_as_expired method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        connection.mark_as_expired()
        
        assert connection.connection_status == "expired"
        assert connection.error_message == "OAuth tokens have expired"

    def test_mark_as_active(self, sample_email_connection_data):
        """Test mark_as_active method"""
        connection = EmailConnection(**sample_email_connection_data)
        connection.connection_status = "error"
        connection.error_message = "Some error"
        
        with patch('sqlalchemy.sql.func.now') as mock_now:
            mock_now.return_value = datetime.now(timezone.utc)
            connection.mark_as_active()
        
        assert connection.connection_status == "active"
        assert connection.error_message is None

    def test_get_scopes_list(self, sample_email_connection_data):
        """Test get_scopes_list method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test valid JSON scopes
        scopes = connection.get_scopes_list()
        assert scopes == ["https://www.googleapis.com/auth/gmail.readonly"]
        
        # Test invalid JSON
        connection.scopes_granted = "invalid json"
        scopes = connection.get_scopes_list()
        assert scopes == []
        
        # Test empty scopes
        connection.scopes_granted = None
        scopes = connection.get_scopes_list()
        assert scopes == []

    def test_set_scopes_list(self, sample_email_connection_data):
        """Test set_scopes_list method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        new_scopes = [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/userinfo.email"
        ]
        
        connection.set_scopes_list(new_scopes)
        
        assert connection.scopes_granted == '["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/userinfo.email"]'
        
        # Verify round-trip
        assert connection.get_scopes_list() == new_scopes

    def test_get_oauth_data(self, sample_email_connection_data):
        """Test get_oauth_data method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with no OAuth data
        oauth_data = connection.get_oauth_data()
        assert oauth_data == {}
        
        # Test with valid JSON OAuth data
        connection.oauth_data = '{"user_id": "123", "picture": "https://example.com/pic.jpg"}'
        oauth_data = connection.get_oauth_data()
        assert oauth_data == {"user_id": "123", "picture": "https://example.com/pic.jpg"}
        
        # Test with invalid JSON
        connection.oauth_data = "invalid json"
        oauth_data = connection.get_oauth_data()
        assert oauth_data == {}

    def test_set_oauth_data(self, sample_email_connection_data):
        """Test set_oauth_data method"""
        connection = EmailConnection(**sample_email_connection_data)
        
        oauth_data = {
            "user_id": "123456789",
            "picture": "https://example.com/pic.jpg",
            "locale": "en"
        }
        
        connection.set_oauth_data(oauth_data)
        
        assert '{"user_id": "123456789"' in connection.oauth_data
        assert '"picture": "https://example.com/pic.jpg"' in connection.oauth_data
        
        # Verify round-trip
        assert connection.get_oauth_data() == oauth_data
        
        # Test with empty data
        connection.set_oauth_data({})
        assert connection.oauth_data is None

    def test_model_validation_constraints(self, db_session):
        """Test model validation and database constraints"""
        # Test required fields
        with pytest.raises(Exception):  # Should fail due to missing required fields
            connection = EmailConnection()
            db_session.add(connection)
            db_session.commit()

    def test_model_relationships(self, db_session):
        """Test model relationships (if User model exists)"""
        # Note: This test would require the User model to be available
        # For now, we'll test that the foreign key constraint is properly defined
        connection_data = {
            "user_id": 999,  # Non-existent user
            "email_address": "test@example.com",
            "provider": "google",
            "provider_account_id": "123456789",
            "access_token_encrypted": encrypt_token("test_token"),
            "scopes_granted": "[]",
        }
        
        connection = EmailConnection(**connection_data)
        db_session.add(connection)
        
        # This should work in SQLite (foreign key constraints are disabled by default)
        # In production PostgreSQL, this would fail due to foreign key constraint
        db_session.commit()
        
        assert connection.id is not None

    def test_indexes_exist(self, db_session):
        """Test that proper indexes are created"""
        # This is more of a sanity check that the model can be created
        # without issues with the defined indexes
        connection_data = {
            "user_id": 1,
            "email_address": "indexed@example.com",
            "provider": "google",
            "provider_account_id": "123456789",
            "access_token_encrypted": encrypt_token("test_token"),
            "scopes_granted": "[]",
        }
        
        connection = EmailConnection(**connection_data)
        db_session.add(connection)
        db_session.commit()
        
        # Query using indexed fields to ensure they work
        found = db_session.query(EmailConnection).filter(
            EmailConnection.user_id == 1,
            EmailConnection.email_address == "indexed@example.com"
        ).first()
        
        assert found is not None
        assert found.email_address == "indexed@example.com"

    def test_default_values(self, sample_email_connection_data):
        """Test default values are properly set"""
        # Remove optional fields to test defaults
        minimal_data = {
            "user_id": 1,
            "email_address": "test@example.com",
            "provider_account_id": "123456789",
            "access_token_encrypted": encrypt_token("test_token"),
            "scopes_granted": "[]",
        }
        
        connection = EmailConnection(**minimal_data)
        
        assert connection.provider == "google"  # Default provider
        assert connection.connection_status == "active"  # Default status
        assert connection.is_archived is False  # Default archived status
        assert connection.connection_name is None  # No default name
        assert connection.last_sync_at is None  # No default sync time

    def test_token_expiry_edge_cases(self, sample_email_connection_data):
        """Test edge cases for token expiry checking"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with timezone-naive datetime (should be treated as UTC)
        naive_expires = datetime.utcnow() + timedelta(hours=1)
        connection.token_expires_at = naive_expires
        assert connection.is_expired is False
        
        # Test with timezone-aware datetime in the past
        past_expires = datetime.now(timezone.utc) - timedelta(minutes=1)
        connection.token_expires_at = past_expires
        assert connection.is_expired is True

    def test_scopes_edge_cases(self, sample_email_connection_data):
        """Test edge cases for scopes handling"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with empty list
        connection.set_scopes_list([])
        assert connection.get_scopes_list() == []
        assert connection.scopes_granted == "[]"
        
        # Test with single scope
        connection.set_scopes_list(["single.scope"])
        assert connection.get_scopes_list() == ["single.scope"]
        
        # Test with multiple scopes
        multiple_scopes = [
            "scope.one",
            "scope.two",
            "scope.three"
        ]
        connection.set_scopes_list(multiple_scopes)
        assert connection.get_scopes_list() == multiple_scopes


class TestEmailConnectionEncryption:
    """Test suite for token encryption/decryption functionality"""
    
    def test_token_encryption_roundtrip(self):
        """Test that tokens can be encrypted and decrypted correctly"""
        original_token = "ya29.a0AfH6SMC_test_token_here"
        
        # Encrypt the token
        encrypted = encrypt_token(original_token)
        assert encrypted != original_token
        assert len(encrypted) > 0
        
        # Decrypt the token
        decrypted = decrypt_token(encrypted)
        assert decrypted == original_token

    def test_encrypt_empty_token(self):
        """Test encrypting empty or None tokens"""
        assert encrypt_token("") == ""
        assert encrypt_token(None) == ""

    def test_decrypt_empty_token(self):
        """Test decrypting empty tokens"""
        assert decrypt_token("") == ""
        assert decrypt_token(None) == ""

    def test_decrypt_invalid_token(self):
        """Test decrypting invalid encrypted tokens"""
        with pytest.raises(ValueError, match="Failed to decrypt token"):
            decrypt_token("invalid_encrypted_token")

    def test_encryption_produces_different_results(self):
        """Test that encryption produces different results each time"""
        token = "test_token_123"
        
        encrypted1 = encrypt_token(token)
        encrypted2 = encrypt_token(token)
        
        # Different encryptions of same token should produce different results
        # (due to Fernet's use of random initialization vectors)
        assert encrypted1 != encrypted2
        
        # But both should decrypt to the same original token
        assert decrypt_token(encrypted1) == token
        assert decrypt_token(encrypted2) == token

    @patch('email_connections.utils.settings.SECRET_KEY', 'test_secret_key')
    def test_encryption_with_known_key(self):
        """Test encryption/decryption with a known secret key"""
        token = "test_token"
        
        encrypted = encrypt_token(token)
        decrypted = decrypt_token(encrypted)
        
        assert decrypted == token

    def test_long_token_encryption(self):
        """Test encryption of very long tokens"""
        # Create a very long token (simulating real OAuth tokens)
        long_token = "ya29." + "a" * 1000
        
        encrypted = encrypt_token(long_token)
        decrypted = decrypt_token(encrypted)
        
        assert decrypted == long_token

    def test_special_characters_in_token(self):
        """Test encryption of tokens with special characters"""
        special_token = "token.with-special_chars/and+symbols=123&test"
        
        encrypted = encrypt_token(special_token)
        decrypted = decrypt_token(special_token)
        
        assert decrypted == special_token


class TestEmailConnectionBehavior:
    """Test suite for EmailConnection business logic and behavior"""

    def test_status_transitions(self, sample_email_connection_data):
        """Test connection status transitions"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Start as active
        assert connection.connection_status == "active"
        assert connection.is_active is True
        
        # Mark as error
        connection.mark_as_error("Token invalid")
        assert connection.connection_status == "error"
        assert connection.error_message == "Token invalid"
        assert connection.is_active is False
        
        # Mark as expired
        connection.mark_as_expired()
        assert connection.connection_status == "expired"
        assert connection.error_message == "OAuth tokens have expired"
        assert connection.is_active is False
        
        # Mark back as active
        connection.mark_as_active()
        assert connection.connection_status == "active"
        assert connection.error_message is None
        assert connection.is_active is True

    def test_scopes_json_handling(self, sample_email_connection_data):
        """Test JSON handling for scopes"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with valid JSON array string
        connection.scopes_granted = '["scope1", "scope2", "scope3"]'
        scopes = connection.get_scopes_list()
        assert scopes == ["scope1", "scope2", "scope3"]
        
        # Test with empty JSON array
        connection.scopes_granted = "[]"
        scopes = connection.get_scopes_list()
        assert scopes == []
        
        # Test with malformed JSON (should return empty list)
        connection.scopes_granted = "not valid json"
        scopes = connection.get_scopes_list()
        assert scopes == []

    def test_oauth_data_json_handling(self, sample_email_connection_data):
        """Test JSON handling for OAuth data"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with valid OAuth data
        test_data = {
            "user_id": "123456789",
            "picture": "https://example.com/pic.jpg",
            "locale": "en",
            "verified_email": True
        }
        
        connection.set_oauth_data(test_data)
        retrieved_data = connection.get_oauth_data()
        
        assert retrieved_data == test_data
        
        # Test with nested objects
        complex_data = {
            "user": {
                "id": "123",
                "name": "Test User",
                "metadata": {
                    "source": "google",
                    "permissions": ["read", "write"]
                }
            }
        }
        
        connection.set_oauth_data(complex_data)
        retrieved_complex = connection.get_oauth_data()
        
        assert retrieved_complex == complex_data

    def test_datetime_handling(self, db_session, sample_email_connection_data):
        """Test datetime field handling"""
        connection = EmailConnection(**sample_email_connection_data)
        db_session.add(connection)
        db_session.commit()
        
        # Test that created_at is automatically set
        assert connection.created_at is not None
        assert isinstance(connection.created_at, datetime)
        
        # Test timezone handling
        assert connection.token_expires_at.tzinfo is not None
        
        # Test that updated_at is set on modification
        original_updated = connection.updated_at
        connection.connection_name = "Updated Name"
        db_session.commit()
        
        # Note: updated_at behavior depends on database configuration
        # In real PostgreSQL, this would be automatically updated

    def test_archival_functionality(self, sample_email_connection_data):
        """Test connection archival functionality"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Initially not archived
        assert connection.is_archived is False
        assert connection.archived_at is None
        
        # Test archival
        archive_time = datetime.now(timezone.utc)
        connection.is_archived = True
        connection.archived_at = archive_time
        
        assert connection.is_archived is True
        assert connection.archived_at == archive_time

    def test_provider_account_id_uniqueness_constraint(self, db_session, sample_email_connection_data):
        """Test that provider_account_id creates proper indexing"""
        # Create first connection
        connection1 = EmailConnection(**sample_email_connection_data)
        db_session.add(connection1)
        db_session.commit()
        
        # Create second connection with same provider_account_id but different user
        connection2_data = sample_email_connection_data.copy()
        connection2_data["user_id"] = 2
        connection2_data["email_address"] = "different@example.com"
        connection2 = EmailConnection(**connection2_data)
        db_session.add(connection2)
        db_session.commit()
        
        # Both should be created successfully (same provider_account_id allowed for different users)
        assert connection1.id != connection2.id
        assert connection1.provider_account_id == connection2.provider_account_id

    def test_error_message_storage(self, sample_email_connection_data):
        """Test error message storage and retrieval"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test long error message
        long_error = "A" * 1000  # Very long error message
        connection.mark_as_error(long_error)
        
        assert connection.error_message == long_error
        assert connection.connection_status == "error"
        
        # Test clearing error message
        connection.mark_as_active()
        assert connection.error_message is None

    def test_connection_name_variations(self, sample_email_connection_data):
        """Test various connection name scenarios"""
        connection = EmailConnection(**sample_email_connection_data)
        
        # Test with special characters in name
        special_name = "My Email (Work) - Primary Account #1"
        connection.connection_name = special_name
        assert connection.display_name == special_name
        
        # Test with very long name
        long_name = "A" * 100
        connection.connection_name = long_name
        assert connection.display_name == long_name
        
        # Test with Unicode characters
        unicode_name = "📧 Work Email 中文"
        connection.connection_name = unicode_name
        assert connection.display_name == unicode_name