"""
Email Harvesting Service

Service for collecting emails from connected accounts and integrating them
with the case management system.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from cases.models import Case, CaseDocument, DocumentType, PartyType
from email_connections.models import EmailConnection
from email_connections.gmail_client import GmailClient
from email_connections.services import EmailConnectionService
from email_connections.exceptions import (
    ConnectionExpiredException,
    EmailServiceException,
    ConnectionNotFoundException
)

logger = logging.getLogger(__name__)


class EmailHarvestingService:
    """Service for harvesting emails and integrating with case management."""
    
    def __init__(self, db: Session):
        self.db = db
        self.connection_service = EmailConnectionService(db)
    
    async def harvest_emails_for_case(
        self,
        case_id: int,
        user_id: int,
        connection_ids: Optional[List[int]] = None,
        max_messages_per_connection: int = 10,
        search_query: str = None
    ) -> Dict[str, Any]:
        """
        Harvest emails from connected accounts for a specific case.
        
        Args:
            case_id: The case to harvest emails for
            user_id: The user performing the harvest
            connection_ids: Specific connections to use (default: all active)
            max_messages_per_connection: Maximum messages per connection
            search_query: Optional Gmail search query filter
            
        Returns:
            Dict with harvest results and statistics
        """
        # Get case
        case = self.db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")
        
        # Get connections to use
        if connection_ids:
            connections = []
            for conn_id in connection_ids:
                conn = self.connection_service.get_connection(conn_id, user_id)
                if not conn:
                    raise ConnectionNotFoundException(conn_id, user_id)
                connections.append(conn)
        else:
            # Get all active connections
            connections = self.connection_service.get_user_connections(user_id)
            connections = [conn for conn in connections if conn.connection_status == "active"]
        
        if not connections:
            return {
                "success": True,
                "message": "No active email connections found",
                "harvested_count": 0,
                "connections_used": 0,
                "errors": []
            }
        
        results = {
            "success": True,
            "harvested_count": 0,
            "connections_used": len(connections),
            "connection_results": [],
            "errors": []
        }
        
        # Harvest from each connection
        for connection in connections:
            try:
                connection_result = await self._harvest_from_connection(
                    connection, case, max_messages_per_connection, search_query
                )
                results["connection_results"].append(connection_result)
                results["harvested_count"] += connection_result["messages_harvested"]
                
            except Exception as e:
                error_msg = f"Failed to harvest from {connection.email_address}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append({
                    "connection_id": connection.id,
                    "email": connection.email_address,
                    "error": str(e)
                })
                
                # Mark connection as having an error if it's a token/auth issue
                if isinstance(e, (ConnectionExpiredException, EmailServiceException)):
                    self.connection_service.mark_connection_error(
                        connection.id, user_id, str(e)
                    )
        
        # Update overall success based on errors
        if results["errors"] and results["harvested_count"] == 0:
            results["success"] = False
            results["message"] = "All connections failed to harvest"
        elif results["errors"]:
            results["message"] = f"Partial success - {len(results['errors'])} connections had errors"
        else:
            results["message"] = f"Successfully harvested {results['harvested_count']} emails"
        
        return results
    
    async def _harvest_from_connection(
        self,
        connection: EmailConnection,
        case: Case,
        max_messages: int,
        search_query: Optional[str]
    ) -> Dict[str, Any]:
        """Harvest emails from a single connection."""
        
        # Get connection tokens
        tokens = self.connection_service.get_connection_tokens(connection.id, case.user_id)
        if not tokens or not tokens.get("access_token"):
            raise ConnectionExpiredException(connection.id, connection.email_address)
        
        # Create Gmail client
        gmail_client = GmailClient(tokens["access_token"])
        
        # Get messages (for now, just latest messages - would expand this for full search)
        try:
            messages = await self._fetch_messages(gmail_client, max_messages, search_query)
        except Exception as e:
            if "unauthorized" in str(e).lower() or "expired" in str(e).lower():
                raise ConnectionExpiredException(connection.id, connection.email_address)
            elif "quota" in str(e).lower() or "limit" in str(e).lower():
                raise EmailServiceException("Gmail", "API quota exceeded")
            else:
                raise EmailServiceException("Gmail", str(e))
        
        # Convert messages to case documents
        harvested_count = 0
        processed_messages = []
        
        for message in messages:
            try:
                # Create case document record for the email
                document = self._create_email_document(connection, case, message)
                if document:
                    harvested_count += 1
                    processed_messages.append({
                        "message_id": message["id"],
                        "subject": message["subject"],
                        "from": message["from"],
                        "date": message["date"],
                        "document_id": document.id
                    })
            except Exception as e:
                logger.warning(f"Failed to process message {message.get('id', 'unknown')}: {e}")
        
        return {
            "connection_id": connection.id,
            "email_address": connection.email_address,
            "messages_fetched": len(messages),
            "messages_harvested": harvested_count,
            "processed_messages": processed_messages
        }
    
    async def _fetch_messages(
        self,
        gmail_client: GmailClient,
        max_messages: int,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch messages from Gmail API."""
        
        # For now, we'll just use the existing get_latest_message method
        # In a full implementation, this would use Gmail search API with proper pagination
        messages = []
        
        try:
            latest_message = gmail_client.get_latest_message(max_results=max_messages)
            if latest_message:
                messages.append(latest_message)
        except Exception as e:
            logger.error(f"Failed to fetch messages: {e}")
            raise
        
        return messages
    
    def _create_email_document(
        self,
        connection: EmailConnection,
        case: Case,
        message: Dict[str, Any]
    ) -> Optional[CaseDocument]:
        """Create a CaseDocument record for an email message."""
        
        try:
            # Check if we already have this message
            existing_doc = self.db.query(CaseDocument).filter(
                CaseDocument.case_id == case.id,
                CaseDocument.document_type == DocumentType.email,
                CaseDocument.original_filename == f"email_{message['id']}.json"
            ).first()
            
            if existing_doc:
                logger.debug(f"Email {message['id']} already exists as document {existing_doc.id}")
                return existing_doc
            
            # Create document record
            # Note: In a real implementation, you'd store the actual email content
            # and metadata in a file or database, not just the metadata
            
            document_date = datetime.now().date()
            if message.get("date"):
                try:
                    # Parse the formatted date
                    parsed_date = datetime.strptime(message["date"], "%Y-%m-%d %H:%M:%S UTC")
                    document_date = parsed_date.date()
                except:
                    pass  # Use current date if parsing fails
            
            # Create the document record
            document = CaseDocument(
                case_id=case.id,
                original_filename=f"email_{message['id']}.json",
                stored_filename=f"{document_date.isoformat()}_email_{message['id']}.json",
                party_type=PartyType.respondent,  # Default - could be made configurable
                document_type=DocumentType.email,
                file_path=f"/case_documents/{case.id}/emails/",  # Virtual path
                file_size=len(str(message)),  # Approximate size
                mime_type="application/json",
                document_date=document_date
            )
            
            self.db.add(document)
            self.db.commit()
            
            logger.info(f"Created email document {document.id} for message {message['id']}")
            return document
            
        except Exception as e:
            logger.error(f"Failed to create document for message {message.get('id', 'unknown')}: {e}")
            self.db.rollback()
            return None
    
    def get_harvesting_stats(self, user_id: int, case_id: Optional[int] = None) -> Dict[str, Any]:
        """Get statistics about email harvesting for a user or case."""
        
        query = self.db.query(CaseDocument).filter(
            CaseDocument.document_type == DocumentType.email
        )
        
        if case_id:
            query = query.filter(CaseDocument.case_id == case_id)
        else:
            # Filter by user's cases
            query = query.join(Case).filter(Case.user_id == user_id)
        
        email_docs = query.all()
        
        # Calculate stats
        total_emails = len(email_docs)
        cases_with_emails = len(set(doc.case_id for doc in email_docs))
        
        # Group by date
        dates = {}
        for doc in email_docs:
            date_key = doc.document_date.isoformat()
            dates[date_key] = dates.get(date_key, 0) + 1
        
        return {
            "total_emails_harvested": total_emails,
            "cases_with_emails": cases_with_emails,
            "emails_by_date": dates,
            "latest_harvest_date": max([doc.uploaded_at for doc in email_docs], default=None)
        }
    
    async def test_harvesting_capability(self, user_id: int) -> Dict[str, Any]:
        """Test if email harvesting is properly configured and working."""
        
        # Get active connections
        connections = self.connection_service.get_user_connections(user_id)
        active_connections = [conn for conn in connections if conn.connection_status == "active"]
        
        test_results = {
            "total_connections": len(connections),
            "active_connections": len(active_connections),
            "connection_tests": [],
            "harvesting_ready": False
        }
        
        # Test each active connection
        working_connections = 0
        for connection in active_connections:
            try:
                # Get tokens
                tokens = self.connection_service.get_connection_tokens(connection.id, user_id)
                if not tokens or not tokens.get("access_token"):
                    raise ConnectionExpiredException(connection.id, connection.email_address)
                
                # Test Gmail API access
                gmail_client = GmailClient(tokens["access_token"])
                profile = gmail_client.get_profile()
                
                # Try to get a message
                latest_message = gmail_client.get_latest_message(max_results=1)
                
                test_results["connection_tests"].append({
                    "connection_id": connection.id,
                    "email": connection.email_address,
                    "status": "working",
                    "profile_email": profile.get("emailAddress"),
                    "has_messages": latest_message is not None
                })
                working_connections += 1
                
            except Exception as e:
                test_results["connection_tests"].append({
                    "connection_id": connection.id,
                    "email": connection.email_address,
                    "status": "error",
                    "error": str(e)
                })
        
        test_results["working_connections"] = working_connections
        test_results["harvesting_ready"] = working_connections > 0
        
        return test_results