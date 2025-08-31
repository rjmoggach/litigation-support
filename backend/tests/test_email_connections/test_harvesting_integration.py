"""
Integration tests for email harvesting with the case management system.

These tests verify that the email connections system properly integrates
with the existing case management and document storage systems.
"""

import pytest
from datetime import datetime, date
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session

from cases.models import Case, CaseDocument, DocumentType, PartyType, CaseStatus, CaseType
from email_connections.models import EmailConnection
from email_connections.harvesting_service import EmailHarvestingService
from email_connections.exceptions import (
    ConnectionNotFoundException,
    ConnectionExpiredException,
    EmailServiceException
)


class TestEmailHarvestingService:
    """Test email harvesting service integration."""

    @pytest.fixture
    def mock_case(self, db_session: Session, test_user):
        """Create a test case."""
        case = Case(
            user_id=test_user.id,
            case_name="Test Case",
            case_number="TC-001",
            case_type=CaseType.custody,
            case_status=CaseStatus.active,
            court_level="Superior Court",
            court_location="Toronto",
            opposing_party="John Doe"
        )
        db_session.add(case)
        db_session.commit()
        return case

    @pytest.fixture
    def mock_email_connection(self, db_session: Session, test_user):
        """Create a mock email connection."""
        connection = EmailConnection(
            user_id=test_user.id,
            email_address="test@example.com",
            provider="google",
            provider_account_id="test_account_123",
            connection_name="Test Connection",
            connection_status="active",
            encrypted_access_token=b"encrypted_token",
            encrypted_refresh_token=b"encrypted_refresh",
            scopes_granted=["https://www.googleapis.com/auth/gmail.readonly"]
        )
        db_session.add(connection)
        db_session.commit()
        return connection

    @pytest.fixture
    def harvesting_service(self, db_session: Session):
        """Create harvesting service instance."""
        return EmailHarvestingService(db_session)

    @pytest.fixture
    def mock_gmail_message(self):
        """Mock Gmail message data."""
        return {
            "id": "test_message_123",
            "thread_id": "thread_456",
            "from": "sender@example.com",
            "to": "recipient@example.com", 
            "subject": "Test Email Subject",
            "date": "2024-01-15 10:30:00 UTC",
            "date_raw": "Mon, 15 Jan 2024 10:30:00 +0000",
            "snippet": "This is a test email message..."
        }

    @pytest.mark.asyncio
    async def test_harvest_emails_for_case_success(
        self,
        harvesting_service,
        mock_case,
        mock_email_connection,
        mock_gmail_message,
        test_user
    ):
        """Test successful email harvesting for a case."""
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks
            mock_tokens.return_value = {"access_token": "test_token", "refresh_token": "refresh_token"}
            mock_client_instance = Mock()
            mock_gmail_client.return_value = mock_client_instance
            mock_client_instance.get_latest_message.return_value = mock_gmail_message
            
            # Test harvesting
            results = await harvesting_service.harvest_emails_for_case(
                case_id=mock_case.id,
                user_id=test_user.id,
                connection_ids=[mock_email_connection.id],
                max_messages_per_connection=5
            )
            
            # Verify results
            assert results["success"] is True
            assert results["harvested_count"] == 1
            assert results["connections_used"] == 1
            assert len(results["connection_results"]) == 1
            assert len(results["errors"]) == 0
            
            connection_result = results["connection_results"][0]
            assert connection_result["connection_id"] == mock_email_connection.id
            assert connection_result["email_address"] == "test@example.com"
            assert connection_result["messages_harvested"] == 1

    @pytest.mark.asyncio
    async def test_harvest_emails_creates_case_documents(
        self,
        harvesting_service,
        mock_case,
        mock_email_connection,
        mock_gmail_message,
        test_user,
        db_session
    ):
        """Test that harvesting creates proper CaseDocument records."""
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks
            mock_tokens.return_value = {"access_token": "test_token", "refresh_token": "refresh_token"}
            mock_client_instance = Mock()
            mock_gmail_client.return_value = mock_client_instance
            mock_client_instance.get_latest_message.return_value = mock_gmail_message
            
            # Verify no documents exist initially
            initial_count = db_session.query(CaseDocument).filter(
                CaseDocument.case_id == mock_case.id,
                CaseDocument.document_type == DocumentType.email
            ).count()
            assert initial_count == 0
            
            # Harvest emails
            await harvesting_service.harvest_emails_for_case(
                case_id=mock_case.id,
                user_id=test_user.id,
                connection_ids=[mock_email_connection.id]
            )
            
            # Verify document was created
            email_docs = db_session.query(CaseDocument).filter(
                CaseDocument.case_id == mock_case.id,
                CaseDocument.document_type == DocumentType.email
            ).all()
            
            assert len(email_docs) == 1
            doc = email_docs[0]
            
            assert doc.case_id == mock_case.id
            assert doc.document_type == DocumentType.email
            assert doc.original_filename == "email_test_message_123.json"
            assert doc.mime_type == "application/json"
            assert doc.party_type == PartyType.respondent

    @pytest.mark.asyncio
    async def test_harvest_emails_handles_connection_errors(
        self,
        harvesting_service,
        mock_case,
        mock_email_connection,
        test_user
    ):
        """Test error handling when connections fail."""
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch.object(harvesting_service.connection_service, 'mark_connection_error') as mock_mark_error:
            
            # Setup mock to simulate expired token
            mock_tokens.return_value = None
            
            # Test harvesting
            results = await harvesting_service.harvest_emails_for_case(
                case_id=mock_case.id,
                user_id=test_user.id,
                connection_ids=[mock_email_connection.id]
            )
            
            # Verify error handling
            assert results["success"] is False
            assert results["harvested_count"] == 0
            assert len(results["errors"]) == 1
            
            error = results["errors"][0]
            assert error["connection_id"] == mock_email_connection.id
            assert error["email"] == "test@example.com"
            assert "expired" in error["error"].lower()
            
            # Verify connection was marked as error
            mock_mark_error.assert_called_once()

    @pytest.mark.asyncio
    async def test_harvest_emails_case_not_found(
        self,
        harvesting_service,
        test_user
    ):
        """Test harvesting for non-existent case."""
        
        with pytest.raises(ValueError, match=\"Case 999 not found\"):
            await harvesting_service.harvest_emails_for_case(
                case_id=999,
                user_id=test_user.id
            )

    @pytest.mark.asyncio
    async def test_harvest_emails_no_active_connections(
        self,
        harvesting_service,
        mock_case,
        test_user,
        db_session
    ):
        """Test harvesting when no active connections exist."""
        
        # Create inactive connection
        connection = EmailConnection(
            user_id=test_user.id,
            email_address="inactive@example.com",
            provider="google",
            provider_account_id="inactive_123",
            connection_status="error",  # Not active
            encrypted_access_token=b"encrypted_token",
            scopes_granted=[]
        )
        db_session.add(connection)
        db_session.commit()
        
        # Test harvesting
        results = await harvesting_service.harvest_emails_for_case(
            case_id=mock_case.id,
            user_id=test_user.id
        )
        
        # Verify no harvesting occurred
        assert results["success"] is True
        assert results["harvested_count"] == 0
        assert results["connections_used"] == 0
        assert results["message"] == "No active email connections found"

    @pytest.mark.asyncio
    async def test_harvest_emails_duplicate_prevention(
        self,
        harvesting_service,
        mock_case,
        mock_email_connection,
        mock_gmail_message,
        test_user,
        db_session
    ):
        """Test that duplicate emails are not created."""
        
        # Create existing document for same message
        existing_doc = CaseDocument(
            case_id=mock_case.id,
            original_filename="email_test_message_123.json",
            stored_filename="2024-01-15_email_test_message_123.json",
            party_type=PartyType.respondent,
            document_type=DocumentType.email,
            file_path="/case_documents/1/emails/",
            file_size=100,
            mime_type="application/json",
            document_date=date.today()
        )
        db_session.add(existing_doc)
        db_session.commit()
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks
            mock_tokens.return_value = {"access_token": "test_token"}
            mock_client_instance = Mock()
            mock_gmail_client.return_value = mock_client_instance
            mock_client_instance.get_latest_message.return_value = mock_gmail_message
            
            # Harvest emails
            results = await harvesting_service.harvest_emails_for_case(
                case_id=mock_case.id,
                user_id=test_user.id,
                connection_ids=[mock_email_connection.id]
            )
            
            # Verify only one document exists (no duplicates created)
            email_docs = db_session.query(CaseDocument).filter(
                CaseDocument.case_id == mock_case.id,
                CaseDocument.document_type == DocumentType.email,
                CaseDocument.original_filename == "email_test_message_123.json"
            ).count()
            
            assert email_docs == 1
            assert results["harvested_count"] == 1  # Still counts as harvested

    def test_get_harvesting_stats(
        self,
        harvesting_service,
        mock_case,
        test_user,
        db_session
    ):
        """Test harvesting statistics calculation."""
        
        # Create some email documents
        for i in range(3):
            doc = CaseDocument(
                case_id=mock_case.id,
                original_filename=f"email_test_{i}.json",
                stored_filename=f"2024-01-1{i}_email_test_{i}.json",
                party_type=PartyType.respondent,
                document_type=DocumentType.email,
                file_path="/case_documents/1/emails/",
                file_size=100 + i,
                mime_type="application/json",
                document_date=date(2024, 1, 10 + i)
            )
            db_session.add(doc)
        
        # Add a non-email document (should not be counted)
        non_email_doc = CaseDocument(
            case_id=mock_case.id,
            original_filename="affidavit.pdf",
            stored_filename="2024-01-15_affidavit.pdf",
            party_type=PartyType.applicant,
            document_type=DocumentType.affidavit,
            file_path="/case_documents/1/documents/",
            file_size=1000,
            mime_type="application/pdf",
            document_date=date(2024, 1, 15)
        )
        db_session.add(non_email_doc)
        db_session.commit()
        
        # Get stats
        stats = harvesting_service.get_harvesting_stats(test_user.id)
        
        # Verify stats
        assert stats["total_emails_harvested"] == 3
        assert stats["cases_with_emails"] == 1
        assert len(stats["emails_by_date"]) == 3
        assert "2024-01-10" in stats["emails_by_date"]
        assert "2024-01-11" in stats["emails_by_date"]
        assert "2024-01-12" in stats["emails_by_date"]
        assert stats["latest_harvest_date"] is not None

    def test_get_harvesting_stats_for_specific_case(
        self,
        harvesting_service,
        mock_case,
        test_user,
        db_session
    ):
        """Test harvesting statistics for specific case."""
        
        # Create another case
        case2 = Case(
            user_id=test_user.id,
            case_name="Test Case 2",
            case_number="TC-002",
            case_type=CaseType.support,
            case_status=CaseStatus.active,
            court_level="Family Court",
            court_location="Ottawa",
            opposing_party="Jane Smith"
        )
        db_session.add(case2)
        
        # Add email to first case
        doc1 = CaseDocument(
            case_id=mock_case.id,
            original_filename="email_case1.json",
            stored_filename="2024-01-10_email_case1.json",
            party_type=PartyType.respondent,
            document_type=DocumentType.email,
            file_path="/case_documents/1/emails/",
            file_size=100,
            mime_type="application/json",
            document_date=date(2024, 1, 10)
        )
        
        # Add email to second case
        doc2 = CaseDocument(
            case_id=case2.id,
            original_filename="email_case2.json",
            stored_filename="2024-01-11_email_case2.json",
            party_type=PartyType.respondent,
            document_type=DocumentType.email,
            file_path="/case_documents/2/emails/",
            file_size=100,
            mime_type="application/json",
            document_date=date(2024, 1, 11)
        )
        
        db_session.add_all([doc1, doc2])
        db_session.commit()
        
        # Get stats for specific case
        stats = harvesting_service.get_harvesting_stats(test_user.id, mock_case.id)
        
        # Should only include first case
        assert stats["total_emails_harvested"] == 1
        assert stats["cases_with_emails"] == 1
        assert "2024-01-10" in stats["emails_by_date"]
        assert "2024-01-11" not in stats["emails_by_date"]

    @pytest.mark.asyncio
    async def test_test_harvesting_capability(
        self,
        harvesting_service,
        mock_email_connection,
        test_user
    ):
        """Test the harvesting capability test function."""
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks
            mock_tokens.return_value = {"access_token": "test_token"}
            mock_client_instance = Mock()
            mock_gmail_client.return_value = mock_client_instance
            mock_client_instance.get_profile.return_value = {"emailAddress": "test@example.com"}
            mock_client_instance.get_latest_message.return_value = {"id": "test_message"}
            
            # Test capability
            results = await harvesting_service.test_harvesting_capability(test_user.id)
            
            # Verify results
            assert results["total_connections"] == 1
            assert results["active_connections"] == 1
            assert results["working_connections"] == 1
            assert results["harvesting_ready"] is True
            
            assert len(results["connection_tests"]) == 1
            test_result = results["connection_tests"][0]
            assert test_result["connection_id"] == mock_email_connection.id
            assert test_result["email"] == "test@example.com"
            assert test_result["status"] == "working"
            assert test_result["has_messages"] is True

    @pytest.mark.asyncio
    async def test_test_harvesting_capability_with_errors(
        self,
        harvesting_service,
        mock_email_connection,
        test_user
    ):
        """Test harvesting capability test with connection errors."""
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens:
            
            # Setup mock to simulate no tokens (expired connection)
            mock_tokens.return_value = None
            
            # Test capability
            results = await harvesting_service.test_harvesting_capability(test_user.id)
            
            # Verify results show the error
            assert results["total_connections"] == 1
            assert results["active_connections"] == 1
            assert results["working_connections"] == 0
            assert results["harvesting_ready"] is False
            
            assert len(results["connection_tests"]) == 1
            test_result = results["connection_tests"][0]
            assert test_result["status"] == "error"
            assert "expired" in test_result["error"].lower()


@pytest.mark.asyncio
class TestEmailHarvestingIntegration:
    """End-to-end integration tests for email harvesting."""

    @pytest.fixture
    def setup_integration_test(self, db_session, test_user):
        """Setup comprehensive test environment."""
        # Create case
        case = Case(
            user_id=test_user.id,
            case_name="Integration Test Case",
            case_number="ITC-001",
            case_type=CaseType.custody,
            case_status=CaseStatus.active,
            court_level="Superior Court",
            court_location="Toronto",
            opposing_party="Integration Test Opponent"
        )
        db_session.add(case)
        
        # Create multiple email connections
        connections = []
        for i in range(3):
            conn = EmailConnection(
                user_id=test_user.id,
                email_address=f"test{i}@example.com",
                provider="google",
                provider_account_id=f"test_account_{i}",
                connection_name=f"Test Connection {i}",
                connection_status="active" if i < 2 else "error",  # Make one inactive
                encrypted_access_token=f"encrypted_token_{i}".encode(),
                encrypted_refresh_token=f"encrypted_refresh_{i}".encode(),
                scopes_granted=["https://www.googleapis.com/auth/gmail.readonly"]
            )
            connections.append(conn)
            db_session.add(conn)
        
        db_session.commit()
        return case, connections

    async def test_multi_connection_harvesting(
        self,
        db_session,
        test_user,
        setup_integration_test
    ):
        """Test harvesting from multiple connections simultaneously."""
        case, connections = setup_integration_test
        harvesting_service = EmailHarvestingService(db_session)
        
        # Mock messages for different connections
        mock_messages = [
            {
                "id": f"message_{i}",
                "thread_id": f"thread_{i}",
                "from": f"sender{i}@example.com",
                "to": f"test{i}@example.com",
                "subject": f"Test Email {i}",
                "date": f"2024-01-{10+i} 10:30:00 UTC",
                "snippet": f"Test message {i} content"
            }
            for i in range(2)  # Only for active connections
        ]
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks - different behavior per connection
            def get_tokens_side_effect(conn_id, user_id):
                # Return tokens for active connections only
                active_conn_ids = [conn.id for conn in connections[:2]]
                if conn_id in active_conn_ids:
                    return {"access_token": f"token_{conn_id}"}
                return None
            
            mock_tokens.side_effect = get_tokens_side_effect
            
            # Mock Gmail client to return different messages per connection
            def create_gmail_client_side_effect(access_token):
                mock_client = Mock()
                # Extract connection index from token
                conn_idx = int(access_token.split('_')[1]) - connections[0].id
                mock_client.get_latest_message.return_value = mock_messages[conn_idx]
                return mock_client
            
            mock_gmail_client.side_effect = create_gmail_client_side_effect
            
            # Harvest from all connections (including inactive one)
            results = await harvesting_service.harvest_emails_for_case(
                case_id=case.id,
                user_id=test_user.id,
                max_messages_per_connection=1
            )
            
            # Verify results
            assert results["success"] is True  # Partial success
            assert results["harvested_count"] == 2  # From 2 active connections
            assert results["connections_used"] == 2  # Only active connections used
            assert len(results["connection_results"]) == 2
            assert len(results["errors"]) == 0  # Inactive connections filtered out
            
            # Verify documents were created
            email_docs = db_session.query(CaseDocument).filter(
                CaseDocument.case_id == case.id,
                CaseDocument.document_type == DocumentType.email
            ).all()
            
            assert len(email_docs) == 2
            filenames = [doc.original_filename for doc in email_docs]
            assert "email_message_0.json" in filenames
            assert "email_message_1.json" in filenames

    async def test_harvesting_with_case_management_workflow(
        self,
        db_session,
        test_user,
        setup_integration_test
    ):
        """Test full workflow: harvest emails → verify in case → get stats."""
        case, connections = setup_integration_test
        harvesting_service = EmailHarvestingService(db_session)
        
        mock_message = {
            "id": "workflow_test_message",
            "thread_id": "workflow_thread",
            "from": "opposing@example.com",
            "to": "test0@example.com",
            "subject": "Important Case Communication",
            "date": "2024-01-15 14:30:00 UTC",
            "snippet": "This is important evidence for the case"
        }
        
        with patch.object(harvesting_service.connection_service, 'get_connection_tokens') as mock_tokens, \
             patch('email_connections.harvesting_service.GmailClient') as mock_gmail_client:
            
            # Setup mocks
            mock_tokens.return_value = {"access_token": "workflow_token"}
            mock_client = Mock()
            mock_gmail_client.return_value = mock_client
            mock_client.get_latest_message.return_value = mock_message
            
            # Step 1: Harvest emails
            harvest_results = await harvesting_service.harvest_emails_for_case(
                case_id=case.id,
                user_id=test_user.id,
                connection_ids=[connections[0].id]
            )
            
            assert harvest_results["success"] is True
            assert harvest_results["harvested_count"] == 1
            
            # Step 2: Verify document appears in case
            case_emails = db_session.query(CaseDocument).filter(
                CaseDocument.case_id == case.id,
                CaseDocument.document_type == DocumentType.email
            ).all()
            
            assert len(case_emails) == 1
            email_doc = case_emails[0]
            assert email_doc.original_filename == "email_workflow_test_message.json"
            assert email_doc.case_id == case.id
            
            # Step 3: Get harvesting statistics
            stats = harvesting_service.get_harvesting_stats(test_user.id, case.id)
            
            assert stats["total_emails_harvested"] == 1
            assert stats["cases_with_emails"] == 1
            assert len(stats["emails_by_date"]) == 1
            
            # Step 4: Get overall user stats
            user_stats = harvesting_service.get_harvesting_stats(test_user.id)
            
            assert user_stats["total_emails_harvested"] == 1
            assert user_stats["cases_with_emails"] == 1


if __name__ == "__main__":
    pytest.main([__file__])