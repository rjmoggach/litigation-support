"""
OAuth flow handler for email connections.
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlencode
import requests

from core.config import settings
from email_connections.utils import (
    generate_oauth_state,
    GMAIL_DEFAULT_SCOPES,
    sanitize_error_message
)


class GoogleOAuthHandler:
    """Handler for Google OAuth flows for email connections"""
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.authorization_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def get_authorization_url(
        self,
        redirect_uri: str,
        scopes: Optional[list] = None,
        state: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Generate authorization URL for OAuth flow.
        
        Args:
            redirect_uri: OAuth redirect URI
            scopes: List of OAuth scopes (optional)
            state: OAuth state parameter (generated if not provided)
            
        Returns:
            Tuple[str, str]: (authorization_url, state)
        """
        if not scopes:
            scopes = GMAIL_DEFAULT_SCOPES
        
        if not state:
            state = generate_oauth_state()
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": " ".join(scopes),
            "redirect_uri": redirect_uri,
            "state": state,
            "access_type": "offline",  # Request refresh token
            "prompt": "consent",  # Force consent screen to ensure refresh token
            "include_granted_scopes": "true"
        }
        
        authorization_url = f"{self.authorization_base_url}?{urlencode(params)}"
        return authorization_url, state
    
    def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access tokens.
        
        Args:
            code: Authorization code from OAuth callback
            redirect_uri: OAuth redirect URI (must match authorization request)
            state: OAuth state parameter for validation
            
        Returns:
            Dict[str, Any]: Token response data
            
        Raises:
            ValueError: If token exchange fails
        """
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        
        try:
            response = requests.post(
                self.token_url,
                data=token_data,
                headers={"Accept": "application/json"},
                timeout=30
            )
            response.raise_for_status()
            
            token_response = response.json()
            
            # Validate required fields
            if "access_token" not in token_response:
                raise ValueError("Access token not received from Google")
            
            # Calculate expiration time if expires_in is provided
            if "expires_in" in token_response:
                expires_in = int(token_response["expires_in"])
                token_response["expires_at"] = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            return token_response
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to exchange code for tokens: {sanitize_error_message(str(e))}")
        except Exception as e:
            raise ValueError(f"Token exchange error: {sanitize_error_message(str(e))}")
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: OAuth refresh token
            
        Returns:
            Dict[str, Any]: New token data
            
        Raises:
            ValueError: If token refresh fails
        """
        refresh_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        try:
            response = requests.post(
                self.token_url,
                data=refresh_data,
                headers={"Accept": "application/json"},
                timeout=30
            )
            response.raise_for_status()
            
            token_response = response.json()
            
            # Validate required fields
            if "access_token" not in token_response:
                raise ValueError("Access token not received from Google")
            
            # Calculate expiration time
            if "expires_in" in token_response:
                expires_in = int(token_response["expires_in"])
                token_response["expires_at"] = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            # Google may not return a new refresh token
            if "refresh_token" not in token_response:
                token_response["refresh_token"] = refresh_token
            
            return token_response
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to refresh access token: {sanitize_error_message(str(e))}")
        except Exception as e:
            raise ValueError(f"Token refresh error: {sanitize_error_message(str(e))}")
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information using access token.
        
        Args:
            access_token: OAuth access token
            
        Returns:
            Dict[str, Any]: User information from Google
            
        Raises:
            ValueError: If user info request fails
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        try:
            response = requests.get(
                self.userinfo_url,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            user_info = response.json()
            
            # Validate required fields
            if "email" not in user_info:
                raise ValueError("Email not received from Google user info")
            
            return user_info
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to get user info: {sanitize_error_message(str(e))}")
        except Exception as e:
            raise ValueError(f"User info error: {sanitize_error_message(str(e))}")
    
    def validate_token(self, access_token: str) -> bool:
        """
        Validate an access token by attempting to use it.
        
        Args:
            access_token: OAuth access token to validate
            
        Returns:
            bool: True if token is valid
        """
        try:
            self.get_user_info(access_token)
            return True
        except ValueError:
            return False
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke an access or refresh token.
        
        Args:
            token: Token to revoke
            
        Returns:
            bool: True if revocation succeeded
        """
        revoke_url = "https://oauth2.googleapis.com/revoke"
        
        try:
            response = requests.post(
                revoke_url,
                data={"token": token},
                headers={"Accept": "application/json"},
                timeout=30
            )
            # Google returns 200 for successful revocation
            return response.status_code == 200
            
        except requests.exceptions.RequestException:
            return False
    
    def get_token_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an access token.
        
        Args:
            access_token: OAuth access token
            
        Returns:
            Optional[Dict[str, Any]]: Token information or None if failed
        """
        tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?access_token={access_token}"
        
        try:
            response = requests.get(tokeninfo_url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException:
            return None


class OAuthStateManager:
    """Manager for OAuth state parameters"""
    
    def __init__(self):
        self._states = {}  # In production, use Redis or database
    
    def generate_state(self, user_id: int, redirect_uri: str) -> str:
        """
        Generate and store OAuth state.
        
        Args:
            user_id: ID of the user initiating OAuth
            redirect_uri: Redirect URI for the flow
            
        Returns:
            str: Generated state parameter
        """
        state = generate_oauth_state()
        
        # Store state with metadata (expires after 10 minutes)
        self._states[state] = {
            "user_id": user_id,
            "redirect_uri": redirect_uri,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
        }
        
        return state
    
    def validate_state(self, state: str, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Validate OAuth state parameter.
        
        Args:
            state: State parameter to validate
            user_id: Expected user ID
            
        Returns:
            Optional[Dict[str, Any]]: State metadata if valid, None otherwise
        """
        if state not in self._states:
            return None
        
        state_data = self._states[state]
        
        # Check expiration
        if datetime.now(timezone.utc) > state_data["expires_at"]:
            del self._states[state]
            return None
        
        # Check user ID
        if state_data["user_id"] != user_id:
            return None
        
        return state_data
    
    def validate_state_only(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Validate OAuth state parameter without checking user ID.
        
        Args:
            state: State parameter to validate
            
        Returns:
            Optional[Dict[str, Any]]: State metadata if valid, None otherwise
        """
        if state not in self._states:
            return None
        
        state_data = self._states[state]
        
        # Check expiration
        if datetime.now(timezone.utc) > state_data["expires_at"]:
            del self._states[state]
            return None
        
        return state_data
    
    def consume_state(self, state: str) -> bool:
        """
        Consume (remove) a state parameter after use.
        
        Args:
            state: State parameter to consume
            
        Returns:
            bool: True if state was found and removed
        """
        if state in self._states:
            del self._states[state]
            return True
        return False
    
    def cleanup_expired_states(self):
        """Remove expired state parameters"""
        now = datetime.now(timezone.utc)
        expired_states = [
            state for state, data in self._states.items()
            if now > data["expires_at"]
        ]
        
        for state in expired_states:
            del self._states[state]


# Global instances
google_oauth_handler = GoogleOAuthHandler()
oauth_state_manager = OAuthStateManager()