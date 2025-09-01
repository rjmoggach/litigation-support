"""
Services for interacting with Weaviate vector database.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np

from .api import DOCUMENT_CLASS, WeaviateClient


class WeaviateService:
    """Service for interacting with Weaviate vector database."""

    def __init__(self):
        """Initialize the service with a Weaviate client."""
        self.client_wrapper = WeaviateClient()
        self.client = self.client_wrapper.get_client()

    def is_healthy(self) -> bool:
        """Check if the Weaviate connection is healthy."""
        return self.client_wrapper.is_healthy()

    def create_document(
        self,
        title: str,
        content: str,
        document_type: str,
        created_date: Optional[datetime] = None,
    ) -> Optional[str]:
        """Create a document in Weaviate.
        
        Args:
            title: Document title
            content: Document content
            document_type: Type of document
            
        Returns:
            Document ID if successful, None otherwise
        """
        if not self.client:
            return None
            
        try:
            # Create a unique ID for the document
            document_id = str(uuid.uuid4())
            
            # Generate a simple random vector (128 dimensions)
            vector_embedding = np.random.rand(128).tolist()
            
            # Add the document to Weaviate
            self.client.data_object.create(
                data_object={
                    "title": title,
                    "content": content,
                    "document_type": document_type,
                    "created_date": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "embedding": vector_embedding
                },
                class_name=DOCUMENT_CLASS,
                uuid=document_id,
            )
            
            return document_id
        except Exception as e:
            print(f"Error creating document: {e}")
            return None

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a document by ID.

        Args:
            document_id: The UUID of the document

        Returns:
            The document data, or None if not found
        """
        if not self.client:
            return None

        try:
            result = self.client.data_object.get_by_id(
                uuid=document_id, class_name=DOCUMENT_CLASS
            )

            return result
        except Exception as e:
            print(f"Error getting document: {e}")
            return None

    def update_document(
        self,
        document_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        document_type: Optional[str] = None,
    ) -> bool:
        """
        Update a document by ID.

        Args:
            document_id: The UUID of the document
            title: The new title (if None, will not update)
            content: The new content (if None, will not update)
            document_type: The new document type (if None, will not update)

        Returns:
            True if update was successful, False otherwise
        """
        if not self.client:
            return False

        try:
            # Build update object with only provided fields
            update_data = {}
            if title is not None:
                update_data["title"] = title
            if content is not None:
                update_data["content"] = content
            if document_type is not None:
                update_data["document_type"] = document_type

            if not update_data:
                # Nothing to update
                return True

            # Update document
            self.client.data_object.update(
                uuid=document_id, data_object=update_data, class_name=DOCUMENT_CLASS
            )

            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False

    def delete_document(self, document_id: str) -> bool:
        """
        Delete a document by ID.

        Args:
            document_id: The UUID of the document

        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.client:
            return False

        try:
            self.client.data_object.delete(uuid=document_id, class_name=DOCUMENT_CLASS)

            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False

    def search_documents(
        self, 
        query: str, 
        limit: int = 10,
        document_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for documents by keyword matching in standalone mode.
        
        Args:
            query: The search query
            limit: Maximum number of results to return
            document_type: Optional filter by document type
            
        Returns:
            List of matching documents
        """
        if not self.client:
            return []
            
        try:
            # Start building query with a where filter for content containing the query
            weaviate_query = (
                self.client.query
                .get(DOCUMENT_CLASS, ["title", "content", "document_type", "created_date"])
                .with_where({
                    "operator": "Or",
                    "operands": [
                        {
                            "path": ["content"],
                            "operator": "Like",
                            "valueString": f"*{query}*"
                        },
                        {
                            "path": ["title"],
                            "operator": "Like",
                            "valueString": f"*{query}*"
                        }
                    ]
                })
                .with_limit(limit)
            )
            
            # Add document_type filter if provided
            if document_type:
                weaviate_query = weaviate_query.with_where({
                    "path": ["document_type"],
                    "operator": "Equal",
                    "valueString": document_type
                })

            # Execute query
            result = weaviate_query.do()

            # Extract documents from result
            if (
                result
                and "data" in result
                and "Get" in result["data"]
                and DOCUMENT_CLASS in result["data"]["Get"]
            ):
                return result["data"]["Get"][DOCUMENT_CLASS]

            return []
        except Exception as e:
            print(f"Error searching documents: {e}")
            return []

    def batch_create_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """
        Create multiple documents in a batch.

        Args:
            documents: List of document dictionaries with title, content, document_type

        Returns:
            True if batch creation was successful, False otherwise
        """
        if not self.client:
            return False

        try:
            with self.client.batch as batch:
                for doc in documents:
                    # Ensure created_date exists
                    if "created_date" not in doc:
                        doc["created_date"] = datetime.now().strftime(
                            "%Y-%m-%dT%H:%M:%SZ"
                        )
                    elif isinstance(doc["created_date"], datetime):
                        doc["created_date"] = doc["created_date"].strftime(
                            "%Y-%m-%dT%H:%M:%SZ"
                        )

                    # Generate a simple random vector (128 dimensions)
                    if "embedding" not in doc:
                        doc["embedding"] = np.random.rand(128).tolist()
                        
                    # Add to batch
                    batch.add_data_object(
                        data_object=doc,
                        class_name=DOCUMENT_CLASS,
                        uuid=str(uuid.uuid4()),
                    )

            return True
        except Exception as e:
            print(f"Error batch creating documents: {e}")
            return False
