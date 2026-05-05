"""
Index NeuroEscrow codebase into AstraDB
Run this script to populate the RAG system
"""
import os
import sys
from pathlib import Path
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


def main():
    """Index codebase from repomix-output.md"""
    print("🚀 Starting codebase indexing...")
    
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
    repomix_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        '..',
        'repomix-output.md'
    )
    
    if not os.path.exists(repomix_path):
        print(f"❌ Error: {repomix_path} not found")
        print("Run 'repomix' first to generate the codebase context")
        return 1
    
    with open(repomix_path, 'r', encoding='utf-8') as f:
        repomix_content = f.read()
    
    print(f"📄 Loaded repomix-output.md ({len(repomix_content)} chars)")
    
    # Initialize RAG system
    rag = get_rag_system()
    
    # Index codebase
    print("🔍 Chunking and indexing files...")
    result = rag.index_codebase(repomix_content)
    
    print(f"✅ Indexing complete!")
    print(f"   Files indexed: {result['files_indexed']}")
    print(f"   Chunks created: {result['chunks_created']}")
    
    # Show stats
    stats = rag.get_stats()
    print(f"\n📊 Collection stats:")
    print(f"   Codebase: {stats['codebase']['document_count']} documents")
    print(f"   Memory: {stats['memory']['document_count']} documents")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
