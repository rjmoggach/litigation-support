"""
Shared test fixtures and configuration for the litigation support backend
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from core.database import Base


@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine"""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(test_engine):
    """Create a database session for testing"""
    SessionLocal = sessionmaker(bind=test_engine)
    session = SessionLocal()
    
    yield session
    
    session.rollback()
    session.close()


@pytest.fixture
def mock_settings():
    """Mock application settings for testing"""
    with patch('core.config.settings') as mock:
        mock.SECRET_KEY = "test_secret_key_for_encryption"
        mock.TOKEN_REFRESH_BUFFER_SECONDS = 300
        yield mock


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "id": 1,
        "email": "testuser@example.com",
        "full_name": "Test User",
        "is_active": True,
        "is_verified": True,
        "is_superuser": False,
        "created_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def sample_oauth_tokens():
    """Sample OAuth token data for testing"""
    return {
        "access_token": "ya29.a0AfH6SMC_sample_access_token_here",
        "refresh_token": "1//sample_refresh_token_here",
        "expires_at": datetime.now(timezone.utc).timestamp() + 3600,  # 1 hour from now
        "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
        "token_type": "Bearer"
    }