#!/usr/bin/env python3
"""Download essential embedding models for litigation support system."""

import os
import sys
from pathlib import Path

def download_models():
    """Download only the essential models."""
    models_dir = Path('./models')
    models_dir.mkdir(exist_ok=True)
    
    print("🚀 Downloading essential embedding models...")
    print("Total expected download: ~500MB\n")
    
    # Essential models only
    try:
        from transformers import AutoTokenizer, AutoModel
        from sentence_transformers import SentenceTransformer
        
        # 1. Legal-BERT (specialized for legal documents) - ~400MB
        print("📥 Legal-BERT (specialized for legal documents)...")
        tokenizer = AutoTokenizer.from_pretrained('nlpaueb/legal-bert-base-uncased', cache_dir='./models')
        model = AutoModel.from_pretrained('nlpaueb/legal-bert-base-uncased', cache_dir='./models')
        print("✅ Legal-BERT downloaded! (~400MB)")
        
        # 2. MiniLM (fast general-purpose) - ~90MB
        print("\n📥 MiniLM (fast general-purpose)...")
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder='./models')
        print("✅ MiniLM downloaded! (~90MB)")
        
    except Exception as e:
        print(f"❌ Error downloading models: {e}")
        print("💡 Make sure you have: pip install sentence-transformers transformers torch")
        return False
    
    print("\n🎉 Essential models downloaded successfully!")
    print("📍 Models cached in ./models directory")
    
    # Show actual disk usage
    try:
        import shutil
        total_size = sum(f.stat().st_size for f in Path('./models').rglob('*') if f.is_file())
        print(f"📊 Actual cache size: {total_size / 1024**2:.0f} MB")
    except:
        pass
    
    print("\n💡 Note: text2vec-transformers uses its own containerized model")
    return True

if __name__ == "__main__":
    success = download_models()
    if success:
        print("\n🚀 Ready to test with:")
        print("curl -X POST http://localhost:8000/api/v1/weaviate/embeddings/generate \\")
        print('  -H "Content-Type: application/json" \\')
        print("  -d '{\"text\": \"Legal contract terms\", \"model\": \"LEGAL_BERT\"}'")
    sys.exit(0 if success else 1)