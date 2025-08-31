"""
Connection Health Monitoring Service

Provides background monitoring and maintenance of email connections
to ensure reliability without user intervention.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from core.database import get_db
from email_connections.models import EmailConnection
from email_connections.services import EmailConnectionService
from email_connections.oauth import google_oauth_handler
from email_connections.utils import (
    is_token_expired, 
    should_refresh_token, 
    get_token_expiry_buffer,
    sanitize_error_message
)

logger = logging.getLogger(__name__)

class ConnectionHealthMonitor:
    """
    Background service for monitoring and maintaining email connection health
    """
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.is_running = False
        self.stats = {
            "last_health_check": None,
            "connections_checked": 0,
            "tokens_refreshed": 0,
            "errors_detected": 0,
            "connections_recovered": 0,
        }
    
    async def start(self):
        """Start the health monitoring service"""
        if self.is_running:
            logger.warning("Health monitor already running")
            return
            
        logger.info("Starting email connection health monitor")
        
        self.scheduler = AsyncIOScheduler()
        
        # Schedule different monitoring tasks
        
        # Quick health check every 15 minutes
        self.scheduler.add_job(
            self._quick_health_check,
            trigger=IntervalTrigger(minutes=15),
            id="quick_health_check",
            name="Quick Connection Health Check",
            max_instances=1,
            coalesce=True
        )
        
        # Comprehensive health check every hour
        self.scheduler.add_job(
            self._comprehensive_health_check,
            trigger=IntervalTrigger(hours=1),
            id="comprehensive_health_check", 
            name="Comprehensive Connection Health Check",
            max_instances=1,
            coalesce=True
        )
        
        # Token refresh check every 30 minutes
        self.scheduler.add_job(
            self._token_refresh_check,
            trigger=IntervalTrigger(minutes=30),
            id="token_refresh_check",
            name="Token Refresh Check",
            max_instances=1,
            coalesce=True
        )
        
        # Connection recovery attempts every 2 hours
        self.scheduler.add_job(
            self._connection_recovery,
            trigger=IntervalTrigger(hours=2),
            id="connection_recovery",
            name="Connection Recovery",
            max_instances=1,
            coalesce=True
        )
        
        # Daily statistics and cleanup at 3 AM
        self.scheduler.add_job(
            self._daily_maintenance,
            trigger=CronTrigger(hour=3, minute=0),
            id="daily_maintenance",
            name="Daily Maintenance",
            max_instances=1,
            coalesce=True
        )
        
        self.scheduler.start()
        self.is_running = True
        
        logger.info("Email connection health monitor started successfully")
    
    async def stop(self):
        """Stop the health monitoring service"""
        if not self.is_running:
            return
            
        logger.info("Stopping email connection health monitor")
        
        if self.scheduler:
            self.scheduler.shutdown(wait=True)
            self.scheduler = None
        
        self.is_running = False
        logger.info("Email connection health monitor stopped")
    
    async def _get_db_session(self) -> Session:
        """Get database session for monitoring tasks"""
        return next(get_db())
    
    async def _quick_health_check(self):
        """Quick health check focusing on critical issues"""
        logger.debug("Running quick health check")
        
        try:
            db = await self._get_db_session()
            service = EmailConnectionService(db)
            
            # Get connections that might need immediate attention
            critical_connections = db.query(EmailConnection).filter(
                and_(
                    EmailConnection.connection_status.in_(["expired", "error"]),
                    EmailConnection.updated_at < datetime.now(timezone.utc) - timedelta(minutes=30)
                )
            ).limit(20).all()
            
            checked_count = 0
            for connection in critical_connections:
                try:
                    await self._check_single_connection(service, connection, quick_check=True)
                    checked_count += 1
                except Exception as e:
                    logger.error(f"Error checking connection {connection.id}: {str(e)}")
            
            self.stats["last_health_check"] = datetime.now(timezone.utc)
            self.stats["connections_checked"] += checked_count
            
            logger.debug(f"Quick health check completed, checked {checked_count} connections")
            
        except Exception as e:
            logger.error(f"Error in quick health check: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _comprehensive_health_check(self):
        """Comprehensive health check of all connections"""
        logger.info("Running comprehensive health check")
        
        try:
            db = await self._get_db_session()
            service = EmailConnectionService(db)
            
            # Get all active and recently active connections
            connections = db.query(EmailConnection).filter(
                or_(
                    EmailConnection.connection_status == "active",
                    and_(
                        EmailConnection.connection_status.in_(["expired", "error"]),
                        EmailConnection.updated_at > datetime.now(timezone.utc) - timedelta(days=7)
                    )
                )
            ).all()
            
            checked_count = 0
            for connection in connections:
                try:
                    await self._check_single_connection(service, connection, quick_check=False)
                    checked_count += 1
                except Exception as e:
                    logger.error(f"Error checking connection {connection.id}: {str(e)}")
                
                # Small delay to avoid overwhelming the API
                await asyncio.sleep(0.1)
            
            self.stats["connections_checked"] += checked_count
            logger.info(f"Comprehensive health check completed, checked {checked_count} connections")
            
        except Exception as e:
            logger.error(f"Error in comprehensive health check: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _check_single_connection(
        self, 
        service: EmailConnectionService, 
        connection: EmailConnection,
        quick_check: bool = False
    ):
        """Check and potentially fix a single connection"""
        
        # Check if tokens are expired or expiring soon
        is_expired = is_token_expired(connection.token_expires_at)
        needs_refresh = should_refresh_token(connection.token_expires_at)
        
        if is_expired or needs_refresh:
            await self._attempt_token_refresh(service, connection)
            return
        
        # For comprehensive checks, validate the connection actually works
        if not quick_check and connection.connection_status == "active":
            await self._validate_connection_access(service, connection)
    
    async def _token_refresh_check(self):
        """Check for connections that need token refresh"""
        logger.debug("Running token refresh check")
        
        try:
            db = await self._get_db_session()
            service = EmailConnectionService(db)
            
            # Find connections with tokens expiring within the buffer period
            buffer_seconds = get_token_expiry_buffer()
            expiry_threshold = datetime.now(timezone.utc) + timedelta(seconds=buffer_seconds)
            
            expiring_connections = db.query(EmailConnection).filter(
                and_(
                    EmailConnection.connection_status.in_(["active", "expired"]),
                    EmailConnection.token_expires_at <= expiry_threshold,
                    EmailConnection.refresh_token_encrypted.isnot(None)
                )
            ).all()
            
            refreshed_count = 0
            for connection in expiring_connections:
                try:
                    success = await self._attempt_token_refresh(service, connection)
                    if success:
                        refreshed_count += 1
                except Exception as e:
                    logger.error(f"Error refreshing connection {connection.id}: {str(e)}")
            
            self.stats["tokens_refreshed"] += refreshed_count
            logger.debug(f"Token refresh check completed, refreshed {refreshed_count} connections")
            
        except Exception as e:
            logger.error(f"Error in token refresh check: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _attempt_token_refresh(
        self, 
        service: EmailConnectionService, 
        connection: EmailConnection
    ) -> bool:
        """Attempt to refresh tokens for a connection"""
        
        try:
            # Get current tokens
            tokens = service.get_connection_tokens(connection.id, connection.user_id, auto_refresh=False)
            
            if not tokens or not tokens.get("refresh_token"):
                logger.warning(f"Connection {connection.id} has no refresh token")
                service.mark_connection_error(
                    connection.id, 
                    connection.user_id,
                    "No refresh token available for automatic renewal"
                )
                return False
            
            # Attempt refresh
            new_tokens = google_oauth_handler.refresh_access_token(tokens["refresh_token"])
            
            # Update connection with new tokens
            success = service.update_tokens(
                connection_id=connection.id,
                user_id=connection.user_id,
                access_token=new_tokens["access_token"],
                refresh_token=new_tokens.get("refresh_token", tokens["refresh_token"]),
                expires_at=new_tokens.get("expires_at")
            )
            
            if success:
                # Mark as active if refresh was successful
                connection.connection_status = "active"
                connection.error_message = None
                connection.updated_at = datetime.now(timezone.utc)
                service.db.commit()
                
                logger.info(f"Successfully refreshed tokens for connection {connection.id}")
                self.stats["connections_recovered"] += 1
                return True
            else:
                logger.error(f"Failed to update tokens for connection {connection.id}")
                return False
                
        except Exception as e:
            error_msg = f"Token refresh failed: {sanitize_error_message(str(e))}"
            logger.error(f"Connection {connection.id} token refresh error: {error_msg}")
            
            service.mark_connection_error(connection.id, connection.user_id, error_msg)
            self.stats["errors_detected"] += 1
            return False
    
    async def _validate_connection_access(
        self, 
        service: EmailConnectionService, 
        connection: EmailConnection
    ):
        """Validate that a connection can actually access the email service"""
        
        try:
            # Get tokens
            tokens = service.get_connection_tokens(connection.id, connection.user_id, auto_refresh=False)
            
            if not tokens:
                logger.warning(f"Connection {connection.id} has no tokens")
                service.mark_connection_error(
                    connection.id,
                    connection.user_id, 
                    "Connection tokens are not available"
                )
                return False
            
            # Test token by getting user info
            user_info = google_oauth_handler.get_user_info(tokens["access_token"])
            
            if user_info:
                # Update last sync time
                connection.last_sync_at = datetime.now(timezone.utc)
                connection.updated_at = datetime.now(timezone.utc)
                service.db.commit()
                
                logger.debug(f"Connection {connection.id} validation successful")
                return True
            else:
                raise ValueError("Failed to get user info")
                
        except Exception as e:
            error_msg = f"Connection validation failed: {sanitize_error_message(str(e))}"
            logger.warning(f"Connection {connection.id} validation error: {error_msg}")
            
            service.mark_connection_error(connection.id, connection.user_id, error_msg)
            self.stats["errors_detected"] += 1
            return False
    
    async def _connection_recovery(self):
        """Attempt to recover connections in error state"""
        logger.info("Running connection recovery")
        
        try:
            db = await self._get_db_session()
            service = EmailConnectionService(db)
            
            # Find connections in error state that might be recoverable
            error_connections = db.query(EmailConnection).filter(
                and_(
                    EmailConnection.connection_status == "error",
                    EmailConnection.refresh_token_encrypted.isnot(None),
                    EmailConnection.updated_at > datetime.now(timezone.utc) - timedelta(days=7)
                )
            ).limit(10).all()  # Limit recovery attempts
            
            recovered_count = 0
            for connection in error_connections:
                try:
                    success = await self._attempt_token_refresh(service, connection)
                    if success:
                        recovered_count += 1
                        logger.info(f"Recovered connection {connection.id}")
                except Exception as e:
                    logger.error(f"Error recovering connection {connection.id}: {str(e)}")
            
            logger.info(f"Connection recovery completed, recovered {recovered_count} connections")
            
        except Exception as e:
            logger.error(f"Error in connection recovery: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _daily_maintenance(self):
        """Daily maintenance tasks"""
        logger.info("Running daily maintenance")
        
        try:
            db = await self._get_db_session()
            
            # Clean up very old error connections (30+ days)
            old_errors = db.query(EmailConnection).filter(
                and_(
                    EmailConnection.connection_status == "error",
                    EmailConnection.updated_at < datetime.now(timezone.utc) - timedelta(days=30)
                )
            ).count()
            
            # Log statistics
            logger.info(f"Health monitoring statistics:")
            logger.info(f"  Connections checked today: {self.stats['connections_checked']}")
            logger.info(f"  Tokens refreshed today: {self.stats['tokens_refreshed']}")
            logger.info(f"  Errors detected today: {self.stats['errors_detected']}")
            logger.info(f"  Connections recovered today: {self.stats['connections_recovered']}")
            logger.info(f"  Old error connections: {old_errors}")
            
            # Reset daily stats
            self.stats.update({
                "connections_checked": 0,
                "tokens_refreshed": 0,
                "errors_detected": 0,
                "connections_recovered": 0,
            })
            
        except Exception as e:
            logger.error(f"Error in daily maintenance: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    def get_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        return {
            "is_running": self.is_running,
            "stats": self.stats.copy(),
            "scheduler_jobs": [
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in (self.scheduler.get_jobs() if self.scheduler else [])
            ]
        }

# Global instance
health_monitor = ConnectionHealthMonitor()

async def start_health_monitoring():
    """Start the health monitoring service"""
    await health_monitor.start()

async def stop_health_monitoring():
    """Stop the health monitoring service"""
    await health_monitor.stop()

def get_health_monitor_status() -> Dict[str, Any]:
    """Get current health monitor status"""
    return health_monitor.get_status()

@asynccontextmanager
async def health_monitor_lifespan():
    """Context manager for health monitor lifecycle"""
    await start_health_monitoring()
    try:
        yield
    finally:
        await stop_health_monitoring()