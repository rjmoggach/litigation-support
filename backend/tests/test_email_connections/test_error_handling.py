"""
Test suite for email connections error handling.

This module tests the custom exception handling system to ensure
proper error responses and recovery guidance.
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

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


class TestCustomExceptions:
    """Test custom exception classes."""

    def test_connection_not_found_exception(self):
        """Test ConnectionNotFoundException."""
        exc = ConnectionNotFoundException(123, 456)
        
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert exc.error_code == "CONNECTION_NOT_FOUND"
        assert exc.user_message == "The email connection could not be found."
        assert exc.recovery_action == "refresh"
        assert exc.connection_id == 123
        assert exc.user_id == 456
        assert "Connection ID 123 for user 456" in exc.technical_details

    def test_connection_already_exists_exception(self):
        """Test ConnectionAlreadyExistsException."""
        exc = ConnectionAlreadyExistsException("test@example.com", 789)
        
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert exc.error_code == "CONNECTION_ALREADY_EXISTS"
        assert exc.user_message == "This email account is already connected."
        assert exc.recovery_action == "none"
        assert exc.email == "test@example.com"
        assert exc.existing_id == 789

    def test_oauth_state_exception(self):
        """Test OAuthStateException."""
        exc = OAuthStateException("invalid_state", "expired")
        
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "OAUTH_INVALID_STATE"
        assert exc.user_message == "Security validation failed during account connection."
        assert exc.recovery_action == "retry"
        assert exc.state == "invalid_state"
        assert exc.reason == "expired"

    def test_oauth_token_exception(self):
        """Test OAuthTokenException."""
        exc = OAuthTokenException("Invalid authorization code", "invalid_grant")
        
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "OAUTH_TOKEN_FAILED"
        assert exc.user_message == "Failed to complete account connection."
        assert exc.recovery_action == "retry"
        assert exc.reason == "Invalid authorization code"
        assert exc.provider_error == "invalid_grant"

    def test_connection_expired_exception(self):
        """Test ConnectionExpiredException."""
        exc = ConnectionExpiredException(123, "user@example.com")
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "CONNECTION_EXPIRED"
        assert exc.user_message == "Your email account connection has expired."
        assert exc.recovery_action == "re_authorize"
        assert exc.connection_id == 123
        assert exc.email == "user@example.com"

    def test_token_refresh_exception(self):
        """Test TokenRefreshException."""
        exc = TokenRefreshException(456, "Refresh token revoked")
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "TOKEN_REFRESH_FAILED"
        assert exc.user_message == "Unable to refresh your email account connection."
        assert exc.recovery_action == "re_authorize"
        assert exc.connection_id == 456
        assert exc.reason == "Refresh token revoked"

    def test_email_service_exception(self):
        """Test EmailServiceException."""
        exc = EmailServiceException("Gmail", "API quota exceeded")
        
        assert exc.status_code == status.HTTP_502_BAD_GATEWAY
        assert exc.error_code == "EMAIL_SERVICE_UNAVAILABLE"
        assert exc.user_message == "Gmail service is temporarily unavailable."
        assert exc.recovery_action == "retry"
        assert exc.service == "Gmail"
        assert exc.reason == "API quota exceeded"

    def test_validation_exception(self):
        """Test ValidationException."""
        exc = ValidationException("email", "Invalid format", "not_an_email")
        
        assert exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert exc.error_code == "VALIDATION_FAILED"
        assert exc.user_message == "Invalid email: Invalid format"
        assert exc.recovery_action == "none"
        assert exc.field == "email"
        assert exc.message == "Invalid format"
        assert exc.value == "not_an_email"

    def test_format_exception_response(self):
        """Test exception response formatting."""
        exc = ConnectionNotFoundException(123, 456)
        response = format_exception_response(exc)
        
        assert "error" in response
        error_data = response["error"]
        
        assert error_data["code"] == "CONNECTION_NOT_FOUND"
        assert error_data["message"] == "Email connection 123 not found"
        assert error_data["user_message"] == "The email connection could not be found."
        assert error_data["recovery_action"] == "refresh"
        assert error_data["technical_details"] == "Connection ID 123 for user 456"
        assert "timestamp" in error_data


@pytest.mark.asyncio
class TestErrorHandlingEndpoints:
    """Test error handling in API endpoints."""
    
    @pytest.fixture
    def authenticated_client(self, client: TestClient, test_user):
        """Provide authenticated test client."""
        # Mock authentication - in real tests this would use proper auth
        return client

    def test_debug_health_check(self, authenticated_client):
        """Test debug health check endpoint."""
        response = authenticated_client.get("/api/v1/email-connections/debug/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert data["error_handling"] == "active"
        assert data["custom_exceptions"] == "enabled"

    @pytest.mark.parametrize("error_type,expected_status,expected_code", [
        ("not_found", status.HTTP_404_NOT_FOUND, "CONNECTION_NOT_FOUND"),
        ("already_exists", status.HTTP_409_CONFLICT, "CONNECTION_ALREADY_EXISTS"),
        ("oauth_state", status.HTTP_400_BAD_REQUEST, "OAUTH_INVALID_STATE"),
        ("oauth_token", status.HTTP_400_BAD_REQUEST, "OAUTH_TOKEN_FAILED"),
        ("expired", status.HTTP_401_UNAUTHORIZED, "CONNECTION_EXPIRED"),
        ("refresh_failed", status.HTTP_401_UNAUTHORIZED, "TOKEN_REFRESH_FAILED"),
        ("service_unavailable", status.HTTP_502_BAD_GATEWAY, "EMAIL_SERVICE_UNAVAILABLE"),
        ("validation", status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_FAILED"),
    ])
    def test_error_scenarios(self, authenticated_client, error_type, expected_status, expected_code):
        """Test different error scenarios return proper structured responses."""
        response = authenticated_client.get(f"/api/v1/email-connections/debug/test-error/{error_type}")
        
        assert response.status_code == expected_status
        
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == expected_code
        assert error_data["error"]["user_message"] is not None
        assert error_data["error"]["recovery_action"] is not None

    def test_invalid_error_type(self, authenticated_client):
        """Test invalid error type returns helpful message."""
        response = authenticated_client.get("/api/v1/email-connections/debug/test-error/invalid")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "error" in data
        assert "Try:" in data["error"]


class TestErrorRecoveryGuidance:
    """Test error recovery guidance and user messages."""

    def test_connection_not_found_recovery(self):
        """Test CONNECTION_NOT_FOUND provides refresh guidance."""
        exc = ConnectionNotFoundException(123, 456)
        
        assert exc.recovery_action == "refresh"
        assert "could not be found" in exc.user_message
        # Should provide actionable guidance
        assert exc.user_message != exc.detail  # User message should be different from technical detail

    def test_oauth_errors_provide_retry_guidance(self):
        """Test OAuth errors provide retry guidance."""
        state_exc = OAuthStateException("invalid")
        token_exc = OAuthTokenException("failed")
        
        assert state_exc.recovery_action == "retry"
        assert token_exc.recovery_action == "retry"
        
        # Both should have user-friendly messages
        assert "Security validation failed" in state_exc.user_message
        assert "Failed to complete" in token_exc.user_message

    def test_expired_connections_require_reauth(self):
        """Test expired connections require re-authorization."""
        expired_exc = ConnectionExpiredException(123, "test@example.com")
        refresh_exc = TokenRefreshException(456, "failed")
        
        assert expired_exc.recovery_action == "re_authorize"
        assert refresh_exc.recovery_action == "re_authorize"
        
        # Should clearly communicate need for re-auth
        assert "expired" in expired_exc.user_message.lower()
        assert "refresh" in refresh_exc.user_message.lower()

    def test_service_errors_suggest_retry(self):
        """Test service errors suggest retry with delay."""
        exc = EmailServiceException("Gmail", "temporarily unavailable")
        
        assert exc.recovery_action == "retry"
        assert "temporarily unavailable" in exc.user_message
        # Should not expose technical details to user
        assert "temporarily unavailable" not in exc.technical_details

    def test_validation_errors_require_no_action(self):
        """Test validation errors indicate user input problem."""
        exc = ValidationException("email", "Invalid format", "bad_email")
        
        assert exc.recovery_action == "none"
        assert "Invalid email" in exc.user_message
        # Should be specific about what's wrong
        assert "Invalid format" in exc.user_message


class TestErrorHandlingIntegration:
    """Integration tests for error handling across the system."""

    def test_error_boundary_integration(self):
        """Test that errors work with React error boundary."""
        # This would be tested in frontend E2E tests
        # Here we ensure backend provides necessary error structure
        
        exc = ConnectionNotFoundException(123, 456)
        response = format_exception_response(exc)
        
        # Error boundary expects these fields
        assert "error" in response
        error_data = response["error"]
        assert all(key in error_data for key in [
            "code", "message", "user_message", "recovery_action", "technical_details"
        ])

    def test_consistent_error_format(self):
        """Test all custom exceptions produce consistent format."""
        exceptions = [
            ConnectionNotFoundException(1, 1),
            ConnectionAlreadyExistsException("test@example.com", 1),
            OAuthStateException("state"),
            OAuthTokenException("reason"),
            ConnectionExpiredException(1, "email"),
            TokenRefreshException(1, "reason"),
            EmailServiceException("Gmail"),
            ValidationException("field", "message")
        ]
        
        for exc in exceptions:
            response = format_exception_response(exc)
            
            # All should have consistent structure
            assert "error" in response
            error_data = response["error"]
            
            # Required fields
            assert error_data["code"]
            assert error_data["message"]
            assert error_data["user_message"]
            assert error_data["recovery_action"]
            
            # User message should be different from technical message
            assert error_data["user_message"] != error_data["message"]
            
            # Recovery action should be valid
            assert error_data["recovery_action"] in [
                "refresh", "retry", "re_authorize", "none"
            ]


if __name__ == "__main__":
    pytest.main([__file__])