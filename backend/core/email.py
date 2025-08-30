from typing import Dict, Any
import logging
from mailjet_rest import Client
from core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.mailjet = None
        if settings.MAILJET_API_KEY and settings.MAILJET_SECRET_KEY:
            self.mailjet = Client(auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY), version='v3.1')
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        if not self.mailjet:
            logger.warning("Email service not configured. Skipping email send.")
            logger.info(f"Would have sent email to {to_email} with subject: {subject}")
            return False
        
        data = {
            'Messages': [
                {
                    "From": {
                        "Email": settings.EMAIL_FROM,
                        "Name": settings.EMAIL_FROM_NAME
                    },
                    "To": [
                        {
                            "Email": to_email
                        }
                    ],
                    "Subject": subject,
                    "HTMLPart": html_content,
                }
            ]
        }
        
        if text_content:
            data['Messages'][0]['TextPart'] = text_content
        
        try:
            result = self.mailjet.send.create(data=data)
            if result.status_code == 200:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {result.status_code} - {result.json()}")
                return False
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False
    
    def send_verification_email(self, to_email: str, verification_token: str) -> bool:
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
        html_content = f"""
        <html>
            <body>
                <h2>Welcome to {settings.PROJECT_NAME}!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px;">Verify Email</a></p>
                <p>Or copy and paste this link: {verification_link}</p>
                <p>This link will expire in 24 hours.</p>
            </body>
        </html>
        """
        
        text_content = f"""
        Welcome to {settings.PROJECT_NAME}!
        
        Please verify your email address by visiting:
        {verification_link}
        
        This link will expire in 24 hours.
        """
        
        return self.send_email(to_email, f"Verify your email for {settings.PROJECT_NAME}", html_content, text_content)
    
    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        html_content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>You have requested to reset your password. Click the link below to proceed:</p>
                <p><a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px;">Reset Password</a></p>
                <p>Or copy and paste this link: {reset_link}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        You have requested to reset your password. Visit the link below:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        """
        
        return self.send_email(to_email, "Password Reset Request", html_content, text_content)
    
    def get_delivery_stats(self) -> Dict[str, Any]:
        """Get email delivery statistics from Mailjet"""
        if not self.mailjet:
            logger.warning("Email service not configured. Cannot retrieve delivery stats.")
            return {
                "configured": False,
                "total_sent": 0,
                "total_delivered": 0,
                "total_bounced": 0,
                "delivery_rate": 0,
                "error": "Email service not configured"
            }
        
        try:
            # Use Mailjet v3 API to get message statistics
            # This gets the last 24 hours of statistics
            result = self.mailjet.statcounters.get()
            
            if result.status_code == 200:
                stats_data = result.json().get('Data', [])
                
                # Aggregate the statistics
                total_sent = 0
                total_delivered = 0
                total_bounced = 0
                
                for stat in stats_data:
                    total_sent += stat.get('MessageSentCount', 0)
                    total_delivered += stat.get('MessageDeliveredCount', 0)
                    total_bounced += stat.get('MessageBouncedCount', 0)
                
                delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
                
                return {
                    "configured": True,
                    "total_sent": total_sent,
                    "total_delivered": total_delivered,
                    "total_bounced": total_bounced,
                    "delivery_rate": round(delivery_rate, 2),
                    "last_updated": "24h"
                }
            else:
                logger.error(f"Failed to get delivery stats: {result.status_code}")
                return {
                    "configured": True,
                    "error": f"Failed to retrieve stats: {result.status_code}",
                    "total_sent": 0,
                    "total_delivered": 0,
                    "total_bounced": 0,
                    "delivery_rate": 0
                }
                
        except Exception as e:
            logger.error(f"Error getting delivery stats: {str(e)}")
            return {
                "configured": True,
                "error": str(e),
                "total_sent": 0,
                "total_delivered": 0,
                "total_bounced": 0,
                "delivery_rate": 0
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """Test Mailjet connectivity and configuration"""
        if not self.mailjet:
            return {
                "connected": False,
                "configured": False,
                "error": "Email service not configured - missing API keys"
            }
        
        try:
            # Test connection by making a simple API call to get account info
            result = self.mailjet.contactslist.get()
            
            if result.status_code == 200:
                logger.info("Mailjet connection test successful")
                return {
                    "connected": True,
                    "configured": True,
                    "status": "Connection successful",
                    "api_key_configured": bool(settings.MAILJET_API_KEY),
                    "secret_key_configured": bool(settings.MAILJET_SECRET_KEY),
                    "from_email": settings.EMAIL_FROM,
                    "from_name": settings.EMAIL_FROM_NAME
                }
            elif result.status_code == 401:
                logger.error("Mailjet authentication failed - check API credentials")
                return {
                    "connected": False,
                    "configured": True,
                    "error": "Authentication failed - check API credentials",
                    "status_code": 401
                }
            else:
                logger.error(f"Mailjet connection test failed: {result.status_code}")
                return {
                    "connected": False,
                    "configured": True,
                    "error": f"Connection failed with status {result.status_code}",
                    "status_code": result.status_code
                }
                
        except Exception as e:
            logger.error(f"Error testing Mailjet connection: {str(e)}")
            return {
                "connected": False,
                "configured": True,
                "error": f"Connection test failed: {str(e)}"
            }


email_service = EmailService()