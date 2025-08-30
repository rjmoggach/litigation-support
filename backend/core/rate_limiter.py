from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
import hashlib


class TokenBucket:
    """Token bucket implementation for rate limiting"""
    
    def __init__(self, max_tokens: int, refill_rate: float):
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = datetime.utcnow()
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens from the bucket"""
        self._refill()
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def _refill(self):
        """Refill tokens based on time passed"""
        now = datetime.utcnow()
        time_passed = (now - self.last_refill).total_seconds()
        tokens_to_add = time_passed * self.refill_rate
        
        self.tokens = min(self.max_tokens, self.tokens + tokens_to_add)
        self.last_refill = now


class RateLimiter:
    """Simple in-memory rate limiter using token bucket algorithm"""
    
    def __init__(self):
        self.buckets: Dict[str, TokenBucket] = {}
        self.last_cleanup = datetime.utcnow()
    
    def is_allowed(
        self, 
        identifier: str, 
        max_requests: int = 5, 
        window_seconds: int = 60
    ) -> bool:
        """Check if request is allowed for given identifier"""
        self._cleanup_old_buckets()
        
        # Create bucket if it doesn't exist
        if identifier not in self.buckets:
            refill_rate = max_requests / window_seconds
            self.buckets[identifier] = TokenBucket(max_requests, refill_rate)
        
        return self.buckets[identifier].consume()
    
    def _cleanup_old_buckets(self):
        """Clean up old buckets to prevent memory leaks"""
        now = datetime.utcnow()
        
        # Only cleanup every 5 minutes
        if (now - self.last_cleanup).total_seconds() < 300:
            return
        
        # Remove buckets that haven't been used in the last hour
        cutoff_time = now - timedelta(hours=1)
        expired_keys = [
            key for key, bucket in self.buckets.items()
            if bucket.last_refill < cutoff_time
        ]
        
        for key in expired_keys:
            del self.buckets[key]
        
        self.last_cleanup = now


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_identifier(request: Request) -> str:
    """Get a unique identifier for rate limiting"""
    # Try to get real IP from headers (for reverse proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    
    # Hash the IP for privacy
    return hashlib.sha256(client_ip.encode()).hexdigest()[:16]


def check_rate_limit(
    request: Request,
    max_requests: int = 5,
    window_seconds: int = 60,
    error_message: str = "Rate limit exceeded. Please try again later."
) -> None:
    """Check rate limit and raise HTTPException if exceeded"""
    identifier = get_client_identifier(request)
    
    if not rate_limiter.is_allowed(identifier, max_requests, window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message,
            headers={"Retry-After": str(window_seconds)}
        )


def rate_limit_dependency(
    max_requests: int = 5,
    window_seconds: int = 60,
    error_message: str = "Rate limit exceeded. Please try again later."
):
    """FastAPI dependency for rate limiting"""
    def dependency(request: Request):
        check_rate_limit(request, max_requests, window_seconds, error_message)
        return True
    
    return dependency


# Specific rate limiters for different endpoints
from core.config import settings

refresh_token_rate_limit = rate_limit_dependency(
    max_requests=settings.REFRESH_RATE_LIMIT_PER_MINUTE,
    window_seconds=60,  # per minute
    error_message="Too many token refresh attempts. Please wait before trying again."
)

login_rate_limit = rate_limit_dependency(
    max_requests=5,  # 5 login attempts
    window_seconds=300,  # per 5 minutes
    error_message="Too many login attempts. Please wait before trying again."
)