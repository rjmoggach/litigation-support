from .base import BaseStorage
from .dropbox import DropboxStorage
from .s3 import S3Storage
from core.config import settings


def get_storage() -> BaseStorage:
    """Factory function to get the configured storage backend"""
    
    # Check storage provider preference
    storage_provider = getattr(settings, 'STORAGE_PROVIDER', 'auto').lower()
    
    # Use S3 if explicitly configured or if S3 credentials are available
    if storage_provider == 's3' or (storage_provider == 'auto' and all([
        getattr(settings, 'AWS_ACCESS_KEY_ID', None),
        getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        getattr(settings, 'AWS_S3_BUCKET_NAME', None)
    ])):
        return S3Storage(
            access_key=settings.AWS_ACCESS_KEY_ID,
            secret_key=settings.AWS_SECRET_ACCESS_KEY,
            bucket_name=settings.AWS_S3_BUCKET_NAME,
            region=getattr(settings, 'AWS_REGION', 'us-east-1')
        )
    
    # Check for Dropbox configuration (flexible with token names)
    refresh_token = getattr(settings, 'DROPBOX_REFRESH_TOKEN', None) or getattr(settings, 'DROPBOX_OAUTH2_REFRESH_TOKEN', None)
    
    # Support both access token and refresh token approaches
    if storage_provider == 'dropbox' or (storage_provider == 'auto' and all([
        getattr(settings, 'DROPBOX_APP_KEY', None),
        getattr(settings, 'DROPBOX_APP_SECRET', None),
    ]) and (getattr(settings, 'DROPBOX_ACCESS_TOKEN', None) or refresh_token)):
        return DropboxStorage(
            access_token=getattr(settings, 'DROPBOX_ACCESS_TOKEN', None),  # Can be empty, will use refresh token
            app_key=settings.DROPBOX_APP_KEY,
            app_secret=settings.DROPBOX_APP_SECRET,
            refresh_token=refresh_token
        )
    
    else:
        raise ValueError("No storage backend configured. Please configure Dropbox or S3 credentials.")