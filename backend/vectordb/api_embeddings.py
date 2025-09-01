"""
API-based embedding services for OpenAI, Cohere, and other cloud providers.
"""

import os
from typing import List, Dict, Any, Optional, Union
import numpy as np
from abc import ABC, abstractmethod
import asyncio
import aiohttp
import time
from functools import wraps


# Rate limiting decorator
def rate_limit(calls_per_minute: int = 60):
    """Rate limiting decorator to avoid API limits."""
    min_interval = 60.0 / calls_per_minute
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = min_interval - elapsed
            if left_to_wait > 0:
                await asyncio.sleep(left_to_wait)
            ret = await func(*args, **kwargs)
            last_called[0] = time.time()
            return ret
        return wrapper
    return decorator


class APIEmbeddingService(ABC):
    """Abstract base class for API-based embedding services."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or self._get_api_key()
        if not self.api_key:
            raise ValueError(f"API key required for {self.__class__.__name__}")
    
    @abstractmethod
    def _get_api_key(self) -> Optional[str]:
        """Get API key from environment variables."""
        pass
    
    @abstractmethod
    async def embed_text(
        self, 
        texts: Union[str, List[str]], 
        model: str = None
    ) -> np.ndarray:
        """Generate embeddings for text(s)."""
        pass
    
    @abstractmethod
    def get_max_tokens(self, model: str = None) -> int:
        """Get maximum token limit for the model."""
        pass


class OpenAIEmbeddingService(APIEmbeddingService):
    """OpenAI embedding service using their API."""
    
    MODELS = {
        "text-embedding-ada-002": {"dimensions": 1536, "max_tokens": 8191, "price_per_1k": 0.0001},
        "text-embedding-3-small": {"dimensions": 1536, "max_tokens": 8191, "price_per_1k": 0.00002},
        "text-embedding-3-large": {"dimensions": 3072, "max_tokens": 8191, "price_per_1k": 0.00013},
    }
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        try:
            import openai
            self.client = openai.AsyncOpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError("OpenAI package not installed. Run: pip install openai")
    
    def _get_api_key(self) -> Optional[str]:
        return os.getenv("OPENAI_API_KEY")
    
    @rate_limit(calls_per_minute=50)  # Conservative rate limit
    async def embed_text(
        self, 
        texts: Union[str, List[str]], 
        model: str = "text-embedding-3-small"
    ) -> np.ndarray:
        """Generate embeddings using OpenAI API."""
        if isinstance(texts, str):
            texts = [texts]
            single_input = True
        else:
            single_input = False
        
        # Batch requests to stay within limits
        batch_size = 100  # OpenAI allows up to 2048 inputs per request
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                response = await self.client.embeddings.create(
                    input=batch,
                    model=model,
                    encoding_format="float"
                )
                
                batch_embeddings = [np.array(item.embedding) for item in response.data]
                all_embeddings.extend(batch_embeddings)
                
            except Exception as e:
                raise RuntimeError(f"OpenAI API error: {str(e)}")
        
        embeddings = np.array(all_embeddings)
        return embeddings[0] if single_input else embeddings
    
    def get_max_tokens(self, model: str = "text-embedding-3-small") -> int:
        return self.MODELS.get(model, {}).get("max_tokens", 8191)
    
    def get_embedding_dimension(self, model: str = "text-embedding-3-small") -> int:
        return self.MODELS.get(model, {}).get("dimensions", 1536)


class CohereEmbeddingService(APIEmbeddingService):
    """Cohere embedding service using their API."""
    
    MODELS = {
        "embed-english-v3.0": {"dimensions": 1024, "max_tokens": 512, "input_type": "search_document"},
        "embed-multilingual-v3.0": {"dimensions": 1024, "max_tokens": 512, "input_type": "search_document"},
        "embed-english-light-v3.0": {"dimensions": 384, "max_tokens": 512, "input_type": "search_document"},
        "embed-multilingual-light-v3.0": {"dimensions": 384, "max_tokens": 512, "input_type": "search_document"},
    }
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        try:
            import cohere
            self.client = cohere.AsyncClient(api_key=self.api_key)
        except ImportError:
            raise ImportError("Cohere package not installed. Run: pip install cohere")
    
    def _get_api_key(self) -> Optional[str]:
        return os.getenv("COHERE_API_KEY")
    
    @rate_limit(calls_per_minute=40)  # Conservative rate limit
    async def embed_text(
        self, 
        texts: Union[str, List[str]], 
        model: str = "embed-english-v3.0",
        input_type: str = "search_document"
    ) -> np.ndarray:
        """Generate embeddings using Cohere API."""
        if isinstance(texts, str):
            texts = [texts]
            single_input = True
        else:
            single_input = False
        
        # Batch requests (Cohere allows up to 96 texts per request)
        batch_size = 90
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                response = await self.client.embed(
                    texts=batch,
                    model=model,
                    input_type=input_type,
                    embedding_types=["float"]
                )
                
                batch_embeddings = [np.array(emb) for emb in response.embeddings.float]
                all_embeddings.extend(batch_embeddings)
                
            except Exception as e:
                raise RuntimeError(f"Cohere API error: {str(e)}")
        
        embeddings = np.array(all_embeddings)
        return embeddings[0] if single_input else embeddings
    
    def get_max_tokens(self, model: str = "embed-english-v3.0") -> int:
        return self.MODELS.get(model, {}).get("max_tokens", 512)
    
    def get_embedding_dimension(self, model: str = "embed-english-v3.0") -> int:
        return self.MODELS.get(model, {}).get("dimensions", 1024)


class HuggingFaceEmbeddingService(APIEmbeddingService):
    """Hugging Face Inference API embedding service."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.base_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/"
    
    def _get_api_key(self) -> Optional[str]:
        return os.getenv("HUGGINGFACE_API_KEY")
    
    @rate_limit(calls_per_minute=30)
    async def embed_text(
        self, 
        texts: Union[str, List[str]], 
        model: str = "sentence-transformers/all-MiniLM-L6-v2"
    ) -> np.ndarray:
        """Generate embeddings using Hugging Face Inference API."""
        if isinstance(texts, str):
            texts = [texts]
            single_input = True
        else:
            single_input = False
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        url = f"{self.base_url}{model}"
        
        all_embeddings = []
        
        async with aiohttp.ClientSession() as session:
            for text in texts:
                payload = {"inputs": text, "options": {"wait_for_model": True}}
                
                try:
                    async with session.post(url, headers=headers, json=payload) as response:
                        if response.status == 200:
                            embedding = await response.json()
                            all_embeddings.append(np.array(embedding))
                        else:
                            error_text = await response.text()
                            raise RuntimeError(f"HuggingFace API error: {error_text}")
                except Exception as e:
                    raise RuntimeError(f"HuggingFace API error: {str(e)}")
        
        embeddings = np.array(all_embeddings)
        return embeddings[0] if single_input else embeddings
    
    def get_max_tokens(self, model: str = None) -> int:
        # Most transformer models have 512 token limit
        return 512


class EmbeddingServiceFactory:
    """Factory for creating embedding services."""
    
    _services = {}
    
    @classmethod
    def get_service(
        cls, 
        service_type: str, 
        api_key: Optional[str] = None
    ) -> APIEmbeddingService:
        """Get or create an embedding service."""
        cache_key = f"{service_type}_{api_key or 'default'}"
        
        if cache_key not in cls._services:
            if service_type.lower() == "openai":
                cls._services[cache_key] = OpenAIEmbeddingService(api_key)
            elif service_type.lower() == "cohere":
                cls._services[cache_key] = CohereEmbeddingService(api_key)
            elif service_type.lower() == "huggingface":
                cls._services[cache_key] = HuggingFaceEmbeddingService(api_key)
            else:
                raise ValueError(f"Unknown service type: {service_type}")
        
        return cls._services[cache_key]
    
    @classmethod
    def list_services(cls) -> List[Dict[str, Any]]:
        """List available embedding services."""
        return [
            {
                "name": "OpenAI",
                "type": "openai",
                "models": list(OpenAIEmbeddingService.MODELS.keys()),
                "requires_api_key": True,
                "description": "OpenAI's embedding models (Ada-002, 3-small, 3-large)"
            },
            {
                "name": "Cohere",
                "type": "cohere",
                "models": list(CohereEmbeddingService.MODELS.keys()),
                "requires_api_key": True,
                "description": "Cohere's multilingual embedding models"
            },
            {
                "name": "Hugging Face",
                "type": "huggingface",
                "models": ["Any Hugging Face model"],
                "requires_api_key": True,
                "description": "Hugging Face Inference API for any transformer model"
            }
        ]


# Async utility functions
async def compare_embeddings_across_services(
    text: str,
    services: List[str] = ["openai", "cohere"],
    api_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Compare embeddings across different services."""
    api_keys = api_keys or {}
    results = {}
    
    for service_type in services:
        try:
            service = EmbeddingServiceFactory.get_service(
                service_type, 
                api_keys.get(service_type)
            )
            
            start_time = time.time()
            embedding = await service.embed_text(text)
            duration = time.time() - start_time
            
            results[service_type] = {
                "embedding": embedding.tolist(),
                "dimension": len(embedding),
                "duration_seconds": duration,
                "status": "success"
            }
        except Exception as e:
            results[service_type] = {
                "status": "error",
                "error": str(e)
            }
    
    return results


# Example usage
if __name__ == "__main__":
    async def main():
        # Test OpenAI embeddings
        try:
            openai_service = EmbeddingServiceFactory.get_service("openai")
            text = "This is a legal contract between two parties."
            embedding = await openai_service.embed_text(text)
            print(f"OpenAI embedding dimension: {len(embedding)}")
        except Exception as e:
            print(f"OpenAI test failed: {e}")
        
        # Test Cohere embeddings
        try:
            cohere_service = EmbeddingServiceFactory.get_service("cohere")
            embedding = await cohere_service.embed_text(text)
            print(f"Cohere embedding dimension: {len(embedding)}")
        except Exception as e:
            print(f"Cohere test failed: {e}")
        
        # Compare services
        comparison = await compare_embeddings_across_services(
            "Legal document analysis and contract review."
        )
        print("Service comparison:", comparison)
    
    # Run the async example
    # asyncio.run(main())