#!/usr/bin/env python3
"""
NeuroEscrow / Hermes — Codebase Indexing Script

Parses repomix-output.md, generates embeddings via Mistral API,
and stores them in AstraDB for Hermes RAG access.

Usage:
    python backend/scripts/index_codebase.py --api-key YOUR_MISTRAL_KEY --astra-token YOUR_ASTRA_TOKEN
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from memory.embeddings import MistralEmbeddingClient
from memory.core import HermesMemory


def parse_repomix(repomix_path: Path):
    """
    Parse repomix-output.md into file chunks.
    
    Returns list of dicts: [{filename, content, language}, ...]
    """
    text = repomix_path.read_text(encoding="utf-8")

    # Find <files> section
    files_match = re.search(r'<files>.*?</files>', text, re.DOTALL)
    if not files_match:
        print("[WARN] No <files> section found in repomix output")
        return []

    files_section = files_match.group(0)
    
    # Extract each <file path="...">...</file> block
    pattern = r'<file path="([^"]+)">(.*?)</file>'
    matches = re.findall(pattern, files_section, re.DOTALL)

    files = []
    for filepath, content in matches:
        ext = Path(filepath).suffix.lower()
        language_map = {
            '.html': 'html',
            '.css': 'css',
            '.js': 'javascript',
            '.json': 'json',
            '.md': 'markdown',
        }
        language = language_map.get(ext, 'text')
        
        content = content.strip()
        
        if content:
            files.append({
                "filename": filepath.strip(),
                "language": language,
                "content": content,
            })

    print(f"[INFO] Parsed {len(files)} files from {repomix_path}")
    return files


def chunk_file(file_info: dict, max_chars: int = 4000, overlap: int = 500):
    """
    Split a file into overlapping chunks.
    Each chunk preserves filename context.
    """
    content = file_info["content"]
    filename = file_info["filename"]
    language = file_info["language"]

    if len(content) <= max_chars:
        return [{
            "filename": filename,
            "language": language,
            "content": content,
            "chunk_index": 0,
            "total_chunks": 1,
        }]

    chunks = []
    start = 0
    chunk_idx = 0

    while start < len(content):
        end = min(start + max_chars, len(content))
        
        # Try to break at newline
        if end < len(content):
            nl_pos = content.rfind("\n", start, end)
            if nl_pos > start + max_chars // 2:
                end = nl_pos + 1

        chunk_text = content[start:end]
        chunks.append({
            "filename": filename,
            "language": language,
            "content": chunk_text,
            "chunk_index": chunk_idx,
            "total_chunks": None,
        })

        start = end - overlap if end < len(content) else end
        chunk_idx += 1

    # Update total_chunks
    for c in chunks:
        c["total_chunks"] = len(chunks)

    return chunks


async def index_codebase(repomix_path: Path, mistral_api_key: str, astra_token: str, astra_endpoint: str):
    """Main indexing pipeline."""
    
    # Initialize clients
    embed_client = MistralEmbeddingClient(api_key=mistral_api_key)
    
    # Initialize AstraDB client (placeholder - needs actual implementation)
    # For now, we'll use a mock
    class MockAstraClient:
        async def create_collection(self, name, dimension, metric):
            return MockCollection()
        def get_collection(self, name):
            return MockCollection()
    
    class MockCollection:
        async def insert_one(self, doc):
            print(f"[MOCK] Inserted chunk: {doc['filename']}:{doc['chunk_index']}")
        async def find(self, **kwargs):
            return []
        async def delete_many(self, query):
            pass
        async def count_documents(self, query):
            return 0
    
    astra_client = MockAstraClient()
    memory = HermesMemory(astra_client, embed_client)
    
    # Parse repomix
    if not repomix_path.exists():
        print(f"[ERROR] repomix file not found: {repomix_path}")
        sys.exit(1)

    files_data = parse_repomix(repomix_path)
    if not files_data:
        print("[WARN] No files found in repomix output")
        return

    # Chunk files
    all_chunks = []
    for f in files_data:
        chunks = chunk_file(f)
        all_chunks.extend(chunks)

    print(f"[INFO] Total chunks to index: {len(all_chunks)}")

    # Index chunks
    for i, chunk in enumerate(all_chunks):
        print(f"[INFO] Indexing chunk {i+1}/{len(all_chunks)}: {chunk['filename']}:{chunk['chunk_index']}")
        
        await memory.add_chunk(
            filename=chunk["filename"],
            content=chunk["content"],
            language=chunk["language"],
            chunk_index=chunk["chunk_index"],
            total_chunks=chunk["total_chunks"]
        )

    await embed_client.close()
    
    stats = await memory.get_stats()
    print(f"[SUCCESS] Indexing complete! {stats['total_chunks']} chunks in {stats['collection']}")


async def main():
    parser = argparse.ArgumentParser(description="Index NeuroEscrow codebase for RAG")
    parser.add_argument("--repomix", type=Path, default=Path("repomix-output.md"), help="Path to repomix-output.md")
    parser.add_argument("--api-key", required=True, help="Mistral API key")
    parser.add_argument("--astra-token", required=True, help="AstraDB token")
    parser.add_argument("--astra-endpoint", default="", help="AstraDB endpoint")
    
    args = parser.parse_args()

    await index_codebase(args.repomix, args.api_key, args.astra_token, args.astra_endpoint)


if __name__ == "__main__":
    asyncio.run(main())
