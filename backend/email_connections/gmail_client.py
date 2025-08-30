"""
Gmail API client for fetching email data.
"""

import requests
import html
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from email_connections.utils import sanitize_error_message


class GmailClient:
    """Client for interacting with Gmail API"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://gmail.googleapis.com/gmail/v1/users/me"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
    
    def get_latest_message(self, max_results: int = 1) -> Optional[Dict[str, Any]]:
        """
        Get the latest message from the user's inbox.
        
        Args:
            max_results: Number of messages to retrieve (default 1)
            
        Returns:
            Dict containing message details or None if no messages
            
        Raises:
            ValueError: If API request fails
        """
        try:
            # First, get list of message IDs
            list_url = f"{self.base_url}/messages"
            list_params = {
                "maxResults": max_results,
                "q": "in:inbox"  # Only inbox messages
            }
            
            response = requests.get(
                list_url,
                headers=self.headers,
                params=list_params,
                timeout=30
            )
            response.raise_for_status()
            
            messages_data = response.json()
            messages = messages_data.get("messages", [])
            
            if not messages:
                return None
            
            # Get details for the first (latest) message
            message_id = messages[0]["id"]
            message_url = f"{self.base_url}/messages/{message_id}"
            message_params = {
                "format": "metadata",
                "metadataHeaders": ["From", "To", "Subject", "Date"]
            }
            
            message_response = requests.get(
                message_url,
                headers=self.headers,
                params=message_params,
                timeout=30
            )
            message_response.raise_for_status()
            
            message_data = message_response.json()
            
            # Extract relevant information
            headers = {h["name"]: h["value"] for h in message_data.get("payload", {}).get("headers", [])}
            
            # Parse date
            date_str = headers.get("Date", "")
            try:
                # Gmail API returns RFC 2822 format
                from email.utils import parsedate_to_datetime
                parsed_date = parsedate_to_datetime(date_str)
                formatted_date = parsed_date.strftime("%Y-%m-%d %H:%M:%S UTC") if parsed_date else date_str
            except:
                formatted_date = date_str
            
            return {
                "id": message_id,
                "thread_id": message_data.get("threadId"),
                "from": html.unescape(headers.get("From", "Unknown")),
                "to": html.unescape(headers.get("To", "Unknown")),
                "subject": html.unescape(headers.get("Subject", "No subject")),
                "date": formatted_date,
                "date_raw": date_str,
                "snippet": html.unescape(message_data.get("snippet", ""))
            }
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to fetch Gmail messages: {sanitize_error_message(str(e))}")
        except Exception as e:
            raise ValueError(f"Gmail API error: {sanitize_error_message(str(e))}")
    
    def get_profile(self) -> Dict[str, Any]:
        """
        Get user's Gmail profile information.
        
        Returns:
            Dict containing profile information
            
        Raises:
            ValueError: If API request fails
        """
        try:
            profile_url = f"{self.base_url}/profile"
            
            response = requests.get(
                profile_url,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to fetch Gmail profile: {sanitize_error_message(str(e))}")
        except Exception as e:
            raise ValueError(f"Gmail profile error: {sanitize_error_message(str(e))}")