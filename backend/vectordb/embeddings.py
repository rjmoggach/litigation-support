"""
Embeddings service for document vectorization using various models.
Supports legal-specific models and general-purpose transformers.
"""

import os
from typing import List, Dict, Any, Optional, Union
from enum import Enum
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
from transformers import AutoTokenizer, AutoModel
import hashlib
import json
from pathlib import Path


class ModelType(Enum):
    """Available embedding models."""
    # Legal-specialized models
    LEGAL_BERT = "nlpaueb/legal-bert-base-uncased"
    LEGAL_BERT_SMALL = "nlpaueb/legal-bert-small-uncased"
    
    # General sentence transformers
    MINILM = "sentence-transformers/all-MiniLM-L6-v2"
    MPNET = "sentence-transformers/all-mpnet-base-v2"
    E5_BASE = "intfloat/e5-base-v2"
    E5_LARGE = "intfloat/e5-large-v2"
    BGE_BASE = "BAAI/bge-base-en-v1.5"
    BGE_LARGE = "BAAI/bge-large-en-v1.5"
    
    # Specialized embeddings
    DISTILBERT = "sentence-transformers/distilbert-base-nli-mean-tokens"
    ROBERTA_BASE = "sentence-transformers/all-roberta-large-v1"
    
    # API-based embeddings (require API keys)
    OPENAI_ADA_002 = "openai-text-embedding-ada-002"
    OPENAI_3_SMALL = "openai-text-embedding-3-small"
    OPENAI_3_LARGE = "openai-text-embedding-3-large"
    COHERE_EMBED = "cohere-embed-english-v3.0"
    COHERE_EMBED_MULTILINGUAL = "cohere-embed-multilingual-v3.0"
    
    # Hugging Face models for legal domain
    LEGAL_ELECTRA = "lexlms/legal-electra-small-finetuned"
    LEGAL_ROBERTA = "roberta-base"  # Can be fine-tuned for legal
    CONTRACT_BERT = "nlpaueb/bert-base-uncased-contracts"
    
    # Multilingual models
    MULTILINGUAL_E5 = "intfloat/multilingual-e5-base"
    LABSE = "sentence-transformers/LaBSE"


class EmbeddingService:
    """Service for generating document embeddings."""
    
    def __init__(
        self,
        model_type: ModelType = ModelType.LEGAL_BERT,
        cache_dir: str = "./models",
        device: Optional[str] = None,
    ):
        """
        Initialize the embedding service.
        
        Args:
            model_type: The type of model to use
            cache_dir: Directory to cache downloaded models
            device: Device to run models on ('cuda', 'mps', 'cpu', or None for auto)
        """
        self.model_type = model_type
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Auto-detect device if not specified
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device
            
        self.model = None
        self.tokenizer = None
        self._load_model()
        
    def _load_model(self):
        """Load the specified model."""
        model_name = self.model_type.value
        
        # Check if this is a sentence-transformers model
        if "sentence-transformers" in model_name or "BGE" in model_name.upper() or "e5" in model_name.lower():
            print(f"Loading sentence-transformers model: {model_name}")
            self.model = SentenceTransformer(
                model_name,
                cache_folder=str(self.cache_dir),
                device=self.device
            )
            self.is_sentence_transformer = True
        else:
            # Load as a regular transformers model (like legal-bert)
            print(f"Loading transformers model: {model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=str(self.cache_dir)
            )
            self.model = AutoModel.from_pretrained(
                model_name,
                cache_dir=str(self.cache_dir)
            ).to(self.device)
            self.is_sentence_transformer = False
            
    def _mean_pooling(self, model_output, attention_mask):
        """
        Perform mean pooling on transformer outputs.
        
        Args:
            model_output: Output from the transformer model
            attention_mask: Attention mask from tokenizer
            
        Returns:
            Mean pooled embeddings
        """
        token_embeddings = model_output[0]  # First element of model_output contains all token embeddings
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    
    def embed_text(
        self,
        text: Union[str, List[str]],
        normalize: bool = True,
        batch_size: int = 32,
    ) -> np.ndarray:
        """
        Generate embeddings for text.
        
        Args:
            text: Single text or list of texts to embed
            normalize: Whether to normalize embeddings to unit length
            batch_size: Batch size for processing multiple texts
            
        Returns:
            Numpy array of embeddings
        """
        # Handle single text input
        if isinstance(text, str):
            texts = [text]
            single_input = True
        else:
            texts = text
            single_input = False
            
        # Add prefixes for E5 models
        if "e5" in self.model_type.value.lower():
            texts = [f"query: {t}" for t in texts]
            
        if self.is_sentence_transformer:
            # Use sentence-transformers encode method
            embeddings = self.model.encode(
                texts,
                normalize_embeddings=normalize,
                batch_size=batch_size,
                show_progress_bar=len(texts) > 100,
                convert_to_numpy=True,
            )
        else:
            # Manual encoding for transformers models
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                # Tokenize
                encoded_input = self.tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(self.device)
                
                # Generate embeddings
                with torch.no_grad():
                    model_output = self.model(**encoded_input)
                    
                # Perform pooling
                embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])
                
                # Normalize if requested
                if normalize:
                    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
                    
                all_embeddings.append(embeddings.cpu().numpy())
                
            embeddings = np.vstack(all_embeddings)
            
        # Return single embedding if single input
        if single_input:
            return embeddings[0]
            
        return embeddings
    
    def embed_documents(
        self,
        documents: List[Dict[str, Any]],
        content_field: str = "content",
        metadata_fields: Optional[List[str]] = None,
        normalize: bool = True,
        batch_size: int = 32,
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for a list of documents.
        
        Args:
            documents: List of document dictionaries
            content_field: Field name containing the main text content
            metadata_fields: Additional fields to include in embedding (e.g., title, tags)
            normalize: Whether to normalize embeddings
            batch_size: Batch size for processing
            
        Returns:
            List of documents with added 'embedding' field
        """
        # Extract texts to embed
        texts = []
        for doc in documents:
            text_parts = []
            
            # Add main content
            if content_field in doc:
                text_parts.append(str(doc[content_field]))
                
            # Add metadata fields if specified
            if metadata_fields:
                for field in metadata_fields:
                    if field in doc and doc[field]:
                        text_parts.append(f"{field}: {str(doc[field])}")
                        
            texts.append(" ".join(text_parts))
            
        # Generate embeddings
        embeddings = self.embed_text(texts, normalize=normalize, batch_size=batch_size)
        
        # Add embeddings to documents
        for doc, embedding in zip(documents, embeddings):
            doc["embedding"] = embedding.tolist()
            doc["embedding_model"] = self.model_type.value
            doc["embedding_dim"] = len(embedding)
            
        return documents
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model."""
        info = {
            "model_name": self.model_type.value,
            "model_type": self.model_type.name,
            "device": self.device,
            "is_sentence_transformer": self.is_sentence_transformer,
            "cache_dir": str(self.cache_dir),
        }
        
        if self.is_sentence_transformer:
            info["embedding_dimension"] = self.model.get_sentence_embedding_dimension()
        else:
            # Get embedding dimension from model config
            if hasattr(self.model.config, "hidden_size"):
                info["embedding_dimension"] = self.model.config.hidden_size
                
        return info
    
    def compute_similarity(
        self,
        embedding1: Union[List[float], np.ndarray],
        embedding2: Union[List[float], np.ndarray],
        metric: str = "cosine"
    ) -> float:
        """
        Compute similarity between two embeddings.
        
        Args:
            embedding1: First embedding
            embedding2: Second embedding
            metric: Similarity metric ('cosine', 'euclidean', 'dot')
            
        Returns:
            Similarity score
        """
        # Convert to numpy arrays
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        if metric == "cosine":
            # Cosine similarity
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            return dot_product / (norm1 * norm2)
        elif metric == "euclidean":
            # Negative euclidean distance (so higher is more similar)
            return -np.linalg.norm(emb1 - emb2)
        elif metric == "dot":
            # Dot product
            return np.dot(emb1, emb2)
        else:
            raise ValueError(f"Unknown metric: {metric}")
    
    def find_similar(
        self,
        query_embedding: Union[List[float], np.ndarray],
        embeddings: List[Union[List[float], np.ndarray]],
        top_k: int = 10,
        metric: str = "cosine",
    ) -> List[tuple]:
        """
        Find most similar embeddings to a query.
        
        Args:
            query_embedding: Query embedding
            embeddings: List of embeddings to search
            top_k: Number of top results to return
            metric: Similarity metric
            
        Returns:
            List of (index, similarity_score) tuples
        """
        similarities = []
        for i, emb in enumerate(embeddings):
            sim = self.compute_similarity(query_embedding, emb, metric)
            similarities.append((i, sim))
            
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]


class EmbeddingCache:
    """Cache for storing computed embeddings."""
    
    def __init__(self, cache_dir: str = "./embedding_cache"):
        """Initialize the embedding cache."""
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_cache_key(self, text: str, model_name: str) -> str:
        """Generate a cache key for text and model."""
        content = f"{model_name}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get(self, text: str, model_name: str) -> Optional[List[float]]:
        """Get cached embedding if it exists."""
        cache_key = self._get_cache_key(text, model_name)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                data = json.load(f)
                return data["embedding"]
                
        return None
    
    def put(self, text: str, model_name: str, embedding: List[float]):
        """Store embedding in cache."""
        cache_key = self._get_cache_key(text, model_name)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        data = {
            "text": text[:100],  # Store first 100 chars for reference
            "model": model_name,
            "embedding": embedding,
        }
        
        with open(cache_file, 'w') as f:
            json.dump(data, f)
    
    def clear(self):
        """Clear all cached embeddings."""
        for cache_file in self.cache_dir.glob("*.json"):
            cache_file.unlink()


# Example usage and testing
if __name__ == "__main__":
    # Test with legal-bert
    print("Testing Legal-BERT embeddings...")
    service = EmbeddingService(model_type=ModelType.LEGAL_BERT)
    
    # Test single text
    text = "This is a contract between party A and party B for the sale of goods."
    embedding = service.embed_text(text)
    print(f"Embedding shape: {embedding.shape}")
    print(f"Model info: {service.get_model_info()}")
    
    # Test batch processing
    documents = [
        {"id": 1, "content": "Legal document about contract law", "title": "Contract Law Guide"},
        {"id": 2, "content": "Intellectual property rights and patents", "title": "IP Rights"},
        {"id": 3, "content": "Employment law and workplace regulations", "title": "Employment Law"},
    ]
    
    docs_with_embeddings = service.embed_documents(
        documents,
        content_field="content",
        metadata_fields=["title"]
    )
    
    print(f"\nProcessed {len(docs_with_embeddings)} documents")
    print(f"First document embedding dimension: {docs_with_embeddings[0]['embedding_dim']}")
    
    # Test similarity
    query = "contract disputes and litigation"
    query_embedding = service.embed_text(query)
    
    doc_embeddings = [doc["embedding"] for doc in docs_with_embeddings]
    similar_docs = service.find_similar(query_embedding, doc_embeddings, top_k=2)
    
    print(f"\nTop similar documents to '{query}':")
    for idx, score in similar_docs:
        print(f"  - Document {documents[idx]['id']}: {documents[idx]['title']} (score: {score:.3f})")