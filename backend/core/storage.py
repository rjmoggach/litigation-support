from .storages import get_storage

# Lazy-loaded storage backend
_storage: object | None = None


def get_storage_instance():
    """Get storage instance, lazy-loaded"""
    global _storage
    if _storage is None:
        try:
            _storage = get_storage()
        except ValueError as e:
            # Storage not configured
            _storage = None
            raise e
    return _storage


# For backward compatibility
storage = None
try:
    storage = get_storage_instance()
except ValueError:
    # Storage not configured yet
    pass
