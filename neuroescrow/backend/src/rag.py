"""
RAG Core for Hermes
Modern chunking: 400-600 tokens (~1600-2400 chars) with 30-40% overlap
Hybrid retrieval: metadata filtering + vector search
"""
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from .astra import get_astra_connector
from .embeddings import get_embeddings_client


class HermesRAG:
    """RAG system for Hermes agent"""
    
    def __init__(self, kv_cache=None):
        self.astra = get_astra_connector()
        self.embeddings = get_embeddings_client(kv_cache=kv_cache)
        
        # Chunking parameters (2026 best practices for codestral-embed-2505)
        self.chunk_size = 2000  # ~500 tokens
        self.chunk_overlap = 700  # ~35% overlap
    
    def _extract_metadata(self, content: str, filename: str) -> Dict[str, Any]:
        """Extract metadata from code chunk"""
        metadata = {
            "filename": filename,
            "language": self._detect_language(filename),
            "functions": [],
            "classes": []
        }
        
        # Extract function names
        func_pattern = r'(?:def|function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        metadata["functions"] = list(set(re.findall(func_pattern, content)))
        
        # Extract class names
        class_pattern = r'class\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        metadata["classes"] = list(set(re.findall(class_pattern, content)))
        
        return metadata
    
    def _detect_language(self, filename: str) -> str:
        """Detect programming language from filename"""
        ext_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown'
        }
        
        for ext, lang in ext_map.items():
            if filename.endswith(ext):
                return lang
        
        return 'unknown'
    
    def _chunk_text(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Chunk text with overlap and metadata"""
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = start + self.chunk_size
            chunk_text = text[start:end]
            
            # Extract metadata
            metadata = self._extract_metadata(chunk_text, filename)
            metadata["chunk_index"] = chunk_index
            metadata["timestamp"] = datetime.utcnow().isoformat()
            
            chunks.append({
                "text": chunk_text,
                "metadata": metadata
            })
            
            start += (self.chunk_size - self.chunk_overlap)
            chunk_index += 1
        
        return chunks
    
    def index_codebase(self, repomix_content: str):
        """Index codebase from repomix-output.md"""
        # Parse XML-style repomix output
        file_pattern = r'<file path="([^"]+)">(.*?)</file>'
        files = re.findall(file_pattern, repomix_content, re.DOTALL)
        
        total_chunks = 0
        
        for filepath, content in files:
            # Skip non-code files
            if not any(filepath.endswith(ext) for ext in ['.py', '.js', '.ts', '.html', '.css']):
                continue
            
            # Chunk file
            chunks = self._chunk_text(content, filepath)
            
            # Generate embeddings and store
            for chunk in chunks:
                embedding = self.embeddings.embed(chunk["text"])
                
                document = {
                    "text": chunk["text"],
                    "filepath": filepath,
                    **chunk["metadata"]
                }
                
                self.astra.insert_document(
                    self.astra.CODEBASE_COLLECTION,
                    document,
                    vector=embedding
                )
                
                total_chunks += 1
        
        return {
            "files_indexed": len(files),
            "chunks_created": total_chunks
        }
    
    def search_codebase(
        self,
        query: str,
        limit: int = 4,
        language: Optional[str] = None,
        filename: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search codebase with hybrid retrieval"""
        # Generate query embedding
        query_embedding = self.embeddings.embed(query)
        
        # Build metadata filter
        filter_dict = {}
        if language:
            filter_dict["language"] = language
        if filename:
            filter_dict["filename"] = filename
        
        # Vector search with metadata filtering
        results = self.astra.vector_search(
            self.astra.CODEBASE_COLLECTION,
            query_embedding,
            limit=limit,
            filter_dict=filter_dict if filter_dict else None,
            include_similarity=True
        )
        
        return results
    
    def add_memory(
        self,
        user_id: str,
        session_id: str,
        content: str,
        memory_type: str = "conversation"
    ):
        """Add to long-term memory"""
        embedding = self.embeddings.embed(content)
        
        document = {
            "user_id": user_id,
            "session_id": session_id,
            "content": content,
            "memory_type": memory_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return self.astra.insert_document(
            self.astra.MEMORY_COLLECTION,
            document,
            vector=embedding
        )
    
    def search_memory(
        self,
        query: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Search long-term memory"""
        query_embedding = self.embeddings.embed(query)
        
        filter_dict = {}
        if user_id:
            filter_dict["user_id"] = user_id
        if session_id:
            filter_dict["session_id"] = session_id
        
        return self.astra.vector_search(
            self.astra.MEMORY_COLLECTION,
            query_embedding,
            limit=limit,
            filter_dict=filter_dict if filter_dict else None
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG statistics"""
        return {
            "codebase": self.astra.get_stats(self.astra.CODEBASE_COLLECTION),
            "memory": self.astra.get_stats(self.astra.MEMORY_COLLECTION)
        }


def get_rag_system(kv_cache=None) -> HermesRAG:
    """Get RAG system instance"""
    return HermesRAG(kv_cache=kv_cache)
