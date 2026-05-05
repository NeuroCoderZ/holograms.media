"""
Incremental Indexing for NeuroEscrow
Only re-indexes changed files based on git diff or file timestamps
"""
import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment from root .env.local
root_dir = Path(__file__).parent.parent.parent.parent
env_path = root_dir / '.env.local'

if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    print(f"⚠️  Warning: {env_path} not found, using system environment")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.rag import get_rag_system
from src.astra import get_astra_connector

# Cache file to track indexed files
CACHE_FILE = Path(__file__).parent / '.index_cache.json'


def load_cache():
    """Load cache of previously indexed files"""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_cache(cache):
    """Save cache of indexed files"""
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def get_file_hash(content):
    """Get hash of file content"""
    return hashlib.sha256(content.encode()).hexdigest()


def parse_repomix(content):
    """Parse repomix XML output into files"""
    import re
    file_pattern = r'<file path="([^"]+)">(.*?)</file>'
    files = re.findall(file_pattern, content, re.DOTALL)
    return files


def main(force_full=False):
    """Incremental indexing - only update changed files"""
    print("🚀 Starting incremental indexing...")
    
    # Verify environment variables
    required_vars = ['MISTRAL_API_KEY', 'ASTRA_DB_APPLICATION_TOKEN', 'ASTRA_DB_API_ENDPOINT']
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print(f"❌ Error: Missing environment variables: {', '.join(missing)}")
        print("   Make sure they are set in .env.local")
        return 1
    
    # Set AstraDB environment variables (normalize names)
    os.environ['ASTRA_DB_TOKEN'] = os.getenv('ASTRA_DB_APPLICATION_TOKEN')
    os.environ['ASTRA_DB_ENDPOINT'] = os.getenv('ASTRA_DB_API_ENDPOINT')
    
    # Read repomix output
    repomix_path = Path(__file__).parent.parent.parent / 'repomix-output.md'
    
    if not repomix_path.exists():
        print(f"❌ Error: {repomix_path} not found")
        print("Run 'repomix' first to generate the codebase context")
        return 1
    
    with open(repomix_path, 'r', encoding='utf-8') as f:
        repomix_content = f.read()
    
    print(f"📄 Loaded repomix-output.md ({len(repomix_content)} chars)")
    
    # Parse files
    files = parse_repomix(repomix_content)
    print(f"📦 Found {len(files)} files in repomix output")
    
    # Load cache
    cache = load_cache() if not force_full else {}
    
    # Initialize RAG and AstraDB
    rag = get_rag_system()
    astra = get_astra_connector()
    
    # Determine which files need updating
    files_to_update = []
    files_unchanged = []
    
    for filepath, content in files:
        file_hash = get_file_hash(content)
        
        if filepath not in cache or cache[filepath]['hash'] != file_hash:
            files_to_update.append((filepath, content, file_hash))
        else:
            files_unchanged.append(filepath)
    
    if not files_to_update:
        print("✅ All files up to date! No indexing needed.")
        return 0
    
    print(f"\n📊 Status:")
    print(f"   Unchanged: {len(files_unchanged)} files")
    print(f"   To update: {len(files_to_update)} files")
    
    # Delete old chunks for updated files
    print(f"\n🗑️  Removing old chunks for updated files...")
    for filepath, _, _ in files_to_update:
        try:
            deleted = astra.delete_by_filter(
                astra.CODEBASE_COLLECTION,
                {"filepath": filepath}
            )
            if deleted > 0:
                print(f"   Deleted {deleted} chunks from {filepath}")
        except Exception as e:
            print(f"   ⚠️  Could not delete chunks for {filepath}: {e}")
    
    # Index updated files
    print(f"\n🔍 Indexing updated files...")
    total_chunks = 0
    
    for filepath, content, file_hash in files_to_update:
        # Skip non-code files
        if not any(filepath.endswith(ext) for ext in ['.py', '.js', '.ts', '.html', '.css']):
            continue
        
        # Chunk file
        chunks = rag._chunk_text(content, filepath)
        
        # Generate embeddings and store
        for chunk in chunks:
            try:
                embedding = rag.embeddings.embed(chunk["text"])
                
                document = {
                    "text": chunk["text"],
                    "filepath": filepath,
                    **chunk["metadata"]
                }
                
                astra.insert_document(
                    astra.CODEBASE_COLLECTION,
                    document,
                    vector=embedding
                )
                
                total_chunks += 1
            except Exception as e:
                print(f"   ⚠️  Error indexing chunk from {filepath}: {e}")
        
        # Update cache
        cache[filepath] = {
            "hash": file_hash,
            "indexed_at": datetime.utcnow().isoformat(),
            "chunks": len(chunks)
        }
        
        print(f"   ✅ {filepath} ({len(chunks)} chunks)")
    
    # Save cache
    save_cache(cache)
    
    print(f"\n✅ Incremental indexing complete!")
    print(f"   Files updated: {len(files_to_update)}")
    print(f"   Chunks created: {total_chunks}")
    
    # Show stats
    stats = rag.get_stats()
    print(f"\n📊 Collection stats:")
    print(f"   Codebase: {stats['codebase']['document_count']} documents")
    print(f"   Memory: {stats['memory']['document_count']} documents")
    
    return 0


if __name__ == '__main__':
    force_full = '--full' in sys.argv
    if force_full:
        print("⚠️  Running FULL re-index (all files)")
    sys.exit(main(force_full=force_full))
