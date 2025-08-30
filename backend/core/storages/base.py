from abc import ABC, abstractmethod
from typing import Any


class BaseStorage(ABC):
    """Abstract base class for file storage backends"""

    @abstractmethod
    async def put(self, path: str, content: bytes) -> dict[str, Any]:
        """Upload a file to storage"""
        pass

    @abstractmethod
    async def get(self, path: str) -> bytes:
        """Download a file from storage"""
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete a file from storage"""
        pass

    @abstractmethod
    async def get_sharing_link(self, path: str) -> str:
        """Create a sharing link for a file"""
        pass

    @abstractmethod
    async def get_url(self, path: str) -> str:
        """Get a temporary download URL for a file"""
        pass

    @abstractmethod
    def get_account_info(self) -> dict[str, Any]:
        """Get account information"""
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if a file exists"""
        pass

    @abstractmethod
    async def list_files(self, path: str, limit: int | None = None) -> list:
        """List files in a directory"""
        pass
