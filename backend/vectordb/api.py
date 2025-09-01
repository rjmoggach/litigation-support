"""
Weaviate client connection and API integration.
"""

import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, List, Union

import numpy as np
import weaviate
import weaviate.classes as wvc
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from weaviate import WeaviateClient as WeaviateClientV4

from .embeddings import EmbeddingService, ModelType
from .api_embeddings import EmbeddingServiceFactory, compare_embeddings_across_services

# Router for Weaviate API endpoints
router = APIRouter()

# Default Weaviate connection settings
WEAVIATE_HOST = os.getenv("WEAVIATE_HOST", "localhost")
WEAVIATE_PORT = os.getenv("WEAVIATE_PORT", "8080")
WEAVIATE_URL = f"http://{WEAVIATE_HOST}:{WEAVIATE_PORT}"

# Schema definition for the Document class
DOCUMENT_CLASS = "Document"
DOCUMENT_SCHEMA = {
    "class": DOCUMENT_CLASS,
    "description": "A document stored in the vector database",
    "properties": [
        {
            "name": "content",
            "description": "The content of the document",
            "dataType": ["text"],
        },
        {
            "name": "title",
            "description": "The title of the document",
            "dataType": ["string"],
        },
        {
            "name": "document_type",
            "description": "The type of document",
            "dataType": ["string"],
        },
        {
            "name": "created_date",
            "description": "The date the document was created",
            "dataType": ["date"],
        },
        {
            "name": "embedding",
            "description": "Vector embedding for the document",
            "dataType": ["vector"],
        },
    ],
}


class WeaviateClient:
    """Singleton client for Weaviate vector database."""

    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WeaviateClient, cls).__new__(cls)
            cls._instance._initialize_client()
        return cls._instance

    def _initialize_client(self) -> None:
        """Initialize the Weaviate client connection."""
        try:
            # Use the v4 client connection approach
            self._client = weaviate.connect_to_local(
                host=WEAVIATE_HOST,
                port=int(WEAVIATE_PORT),
            )
            # Ensure the schema exists
            self._ensure_schema()
        except Exception as e:
            # Log error but don't fail on initialization
            print(f"Error initializing Weaviate client: {e}")
            self._client = None

    def _ensure_schema(self) -> None:
        """Ensure the Document schema exists in Weaviate."""
        if self._client is None:
            return

        try:
            # Check if collection exists and create if not
            collections = self._client.collections
            if not collections.exists(DOCUMENT_CLASS):
                # Create collection with v4 API
                collections.create(
                    name=DOCUMENT_CLASS,
                    vectorizer_config=wvc.config.Configure.Vectorizer.none(),
                    properties=[
                        wvc.config.Property(
                            name="content",
                            data_type=wvc.config.DataType.TEXT,
                        ),
                        wvc.config.Property(
                            name="title",
                            data_type=wvc.config.DataType.TEXT,
                        ),
                        wvc.config.Property(
                            name="document_type",
                            data_type=wvc.config.DataType.TEXT,
                        ),
                        wvc.config.Property(
                            name="created_date",
                            data_type=wvc.config.DataType.DATE,
                        ),
                    ],
                )
        except Exception as e:
            print(f"Error ensuring schema: {e}")

    def get_client(self) -> Optional[WeaviateClientV4]:
        """Get the Weaviate client instance."""
        return self._client

    def is_healthy(self) -> bool:
        """Check if the Weaviate connection is healthy."""
        if self._client is None:
            return False

        try:
            return self._client.is_ready()
        except Exception:
            return False


# Dependency for getting the Weaviate client
def get_weaviate_client() -> WeaviateClientV4:
    """Dependency to get the Weaviate client."""
    client = WeaviateClient().get_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weaviate connection not available",
        )
    return client


@router.get("/health")
async def health_check(
    client: WeaviateClientV4 = Depends(get_weaviate_client),
) -> Dict[str, Any]:
    """Check the health of the Weaviate connection."""
    is_healthy = WeaviateClient().is_healthy()

    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weaviate connection is not healthy",
        )

    return {"status": "healthy", "message": "Weaviate connection is healthy"}


class TestDocument(BaseModel):
    """Test document model."""

    title: str
    content: str
    document_type: str


class EmbeddingRequest(BaseModel):
    """Request model for generating embeddings."""
    
    text: Union[str, List[str]] = Field(
        ...,
        description="Text or list of texts to generate embeddings for"
    )
    model: Optional[str] = Field(
        default="LEGAL_BERT",
        description="Model to use for embeddings (LEGAL_BERT, MINILM, MPNET, etc.)"
    )
    normalize: bool = Field(
        default=True,
        description="Whether to normalize embeddings to unit length"
    )


class DocumentEmbeddingRequest(BaseModel):
    """Request model for embedding documents."""
    
    documents: List[Dict[str, Any]] = Field(
        ...,
        description="List of documents to embed"
    )
    content_field: str = Field(
        default="content",
        description="Field name containing the main text content"
    )
    metadata_fields: Optional[List[str]] = Field(
        default=None,
        description="Additional fields to include in embedding"
    )
    model: Optional[str] = Field(
        default="LEGAL_BERT",
        description="Model to use for embeddings"
    )


class SimilarityRequest(BaseModel):
    """Request model for computing similarity."""
    
    query: str = Field(..., description="Query text")
    documents: List[Dict[str, Any]] = Field(
        ...,
        description="Documents to search (must have 'embedding' field)"
    )
    top_k: int = Field(default=10, description="Number of top results")
    metric: str = Field(
        default="cosine",
        description="Similarity metric (cosine, euclidean, dot)"
    )


@router.post("/test", status_code=status.HTTP_200_OK)
async def test_weaviate(document: TestDocument):
    """Test Weaviate by adding a document and searching for it."""
    client = get_weaviate_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weaviate client not available",
        )

    try:
        # Create a unique ID for the document
        document_id = str(uuid.uuid4())

        # Generate a simple random vector (128 dimensions)
        vector_embedding = np.random.rand(128).tolist()

        # Get the collection
        collection = client.collections.get(DOCUMENT_CLASS)

        # Add the document to Weaviate using v4 API
        collection.data.insert(
            properties={
                "title": document.title,
                "content": document.content,
                "document_type": document.document_type,
                "created_date": datetime.now(),
            },
            uuid=document_id,
            vector=vector_embedding,
        )

        # Search for the document using v4 API
        response = (
            collection.query.where(
                wvc.query.Filter.by_property("document_type").equal(
                    document.document_type
                )
            )
            .with_limit(1)
            .do()
        )

        query_result = [
            {
                "title": obj.properties.get("title"),
                "content": obj.properties.get("content"),
                "document_type": obj.properties.get("document_type"),
            }
            for obj in response.objects
        ]

        return {
            "status": "success",
            "message": "Document added and searched successfully",
            "document_id": document_id,
            "search_results": query_result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error testing Weaviate: {str(e)}",
        )


# Global embedding service instances (cached)
_embedding_services = {}


def get_embedding_service(model_name: str = "LEGAL_BERT") -> EmbeddingService:
    """Get or create an embedding service for the specified model."""
    if model_name not in _embedding_services:
        try:
            model_type = ModelType[model_name]
            _embedding_services[model_name] = EmbeddingService(
                model_type=model_type,
                cache_dir="/app/models"
            )
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown model: {model_name}. Available models: {[m.name for m in ModelType]}"
            )
    return _embedding_services[model_name]


@router.post("/embeddings/generate")
async def generate_embeddings(request: EmbeddingRequest) -> Dict[str, Any]:
    """Generate embeddings for text using specified model."""
    try:
        service = get_embedding_service(request.model)
        embeddings = service.embed_text(
            request.text,
            normalize=request.normalize
        )
        
        # Convert numpy array to list for JSON serialization
        if isinstance(request.text, str):
            embeddings_list = embeddings.tolist()
        else:
            embeddings_list = [emb.tolist() for emb in embeddings]
        
        return {
            "embeddings": embeddings_list,
            "model": request.model,
            "dimension": len(embeddings_list) if isinstance(request.text, str) else len(embeddings_list[0]),
            "normalized": request.normalize,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating embeddings: {str(e)}"
        )


@router.post("/embeddings/documents")
async def embed_documents(request: DocumentEmbeddingRequest) -> Dict[str, Any]:
    """Generate embeddings for multiple documents."""
    try:
        service = get_embedding_service(request.model)
        docs_with_embeddings = service.embed_documents(
            request.documents,
            content_field=request.content_field,
            metadata_fields=request.metadata_fields,
        )
        
        return {
            "documents": docs_with_embeddings,
            "model": request.model,
            "count": len(docs_with_embeddings),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error embedding documents: {str(e)}"
        )


@router.post("/embeddings/similarity")
async def find_similar_documents(request: SimilarityRequest) -> Dict[str, Any]:
    """Find similar documents based on query."""
    try:
        # Get embedding service (use same model as documents)
        model = request.documents[0].get("embedding_model", "LEGAL_BERT") if request.documents else "LEGAL_BERT"
        service = get_embedding_service(model)
        
        # Generate query embedding
        query_embedding = service.embed_text(request.query)
        
        # Extract document embeddings
        doc_embeddings = []
        for doc in request.documents:
            if "embedding" not in doc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="All documents must have 'embedding' field"
                )
            doc_embeddings.append(doc["embedding"])
        
        # Find similar documents
        similar_indices = service.find_similar(
            query_embedding,
            doc_embeddings,
            top_k=request.top_k,
            metric=request.metric
        )
        
        # Build response
        results = []
        for idx, score in similar_indices:
            doc = request.documents[idx].copy()
            doc.pop("embedding", None)  # Remove embedding from response
            results.append({
                "document": doc,
                "similarity_score": float(score),
                "rank": len(results) + 1,
            })
        
        return {
            "query": request.query,
            "results": results,
            "model": model,
            "metric": request.metric,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding similar documents: {str(e)}"
        )


@router.get("/embeddings/models")
async def list_available_models() -> Dict[str, Any]:
    """List all available embedding models."""
    models = []
    for model in ModelType:
        models.append({
            "name": model.name,
            "value": model.value,
            "is_legal_specialized": "legal" in model.value.lower(),
        })
    
    return {
        "models": models,
        "default": "LEGAL_BERT",
        "count": len(models),
    }


@router.get("/embeddings/model-info/{model_name}")
async def get_model_info(model_name: str) -> Dict[str, Any]:
    """Get information about a specific model."""
    try:
        service = get_embedding_service(model_name)
        return service.get_model_info()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting model info: {str(e)}"
        )


class APIEmbeddingRequest(BaseModel):
    """Request for API-based embeddings (OpenAI, Cohere, etc.)."""
    
    text: Union[str, List[str]] = Field(
        ...,
        description="Text or list of texts to generate embeddings for"
    )
    service: str = Field(
        ...,
        description="Embedding service to use (openai, cohere, huggingface)"
    )
    model: Optional[str] = Field(
        default=None,
        description="Specific model to use (if None, uses service default)"
    )
    api_key: Optional[str] = Field(
        default=None,
        description="API key (if not provided, uses environment variable)"
    )


class ComparisonRequest(BaseModel):
    """Request to compare embeddings across different services."""
    
    text: str = Field(..., description="Text to generate embeddings for")
    services: List[str] = Field(
        default=["openai", "cohere"],
        description="List of services to compare"
    )
    api_keys: Optional[Dict[str, str]] = Field(
        default=None,
        description="API keys for each service"
    )


@router.post("/embeddings/api-generate")
async def generate_api_embeddings(request: APIEmbeddingRequest) -> Dict[str, Any]:
    """Generate embeddings using API-based services (OpenAI, Cohere, etc.)."""
    try:
        service = EmbeddingServiceFactory.get_service(
            request.service, 
            request.api_key
        )
        
        # Use default model if not specified
        model = request.model
        if not model:
            if request.service.lower() == "openai":
                model = "text-embedding-3-small"
            elif request.service.lower() == "cohere":
                model = "embed-english-v3.0"
            else:
                model = "sentence-transformers/all-MiniLM-L6-v2"
        
        embeddings = await service.embed_text(request.text, model=model)
        
        # Convert to list for JSON serialization
        if isinstance(request.text, str):
            embeddings_list = embeddings.tolist()
        else:
            embeddings_list = [emb.tolist() for emb in embeddings]
        
        return {
            "embeddings": embeddings_list,
            "service": request.service,
            "model": model,
            "dimension": len(embeddings_list) if isinstance(request.text, str) else len(embeddings_list[0]),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating API embeddings: {str(e)}"
        )


@router.post("/embeddings/compare")
async def compare_embedding_services(request: ComparisonRequest) -> Dict[str, Any]:
    """Compare embeddings across different API services."""
    try:
        results = await compare_embeddings_across_services(
            request.text,
            request.services,
            request.api_keys
        )
        
        return {
            "text": request.text,
            "services": request.services,
            "results": results,
            "comparison_summary": {
                "total_services": len(request.services),
                "successful": len([r for r in results.values() if r.get("status") == "success"]),
                "failed": len([r for r in results.values() if r.get("status") == "error"]),
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing embedding services: {str(e)}"
        )


@router.get("/embeddings/api-services")
async def list_api_embedding_services() -> Dict[str, Any]:
    """List available API-based embedding services."""
    try:
        services = EmbeddingServiceFactory.list_services()
        return {
            "services": services,
            "count": len(services),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing API services: {str(e)}"
        )
