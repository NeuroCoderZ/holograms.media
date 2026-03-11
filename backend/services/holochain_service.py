import hashlib
import json
import time
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class HoloBlock:
    def __init__(self, index: int, previous_hash: str, timestamp: float, data: Dict, hash: str = ""):
        self.index = index
        self.previous_hash = previous_hash
        self.timestamp = timestamp
        self.data = data
        self.hash = hash or self.calculate_hash()

    def calculate_hash(self) -> str:
        block_string = json.dumps({
            "index": self.index,
            "previous_hash": self.previous_hash,
            "timestamp": self.timestamp,
            "data": self.data
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def to_dict(self) -> Dict:
        return {
            "index": self.index,
            "previous_hash": self.previous_hash,
            "timestamp": self.timestamp,
            "data": self.data,
            "hash": self.hash
        }

class HoloChainService:
    """
    HoloChain Service: Implements a gesture-based ledger (blockchain)
    to sequence user intentions (Snapshots) into an immutable chain.
    """
    def __init__(self):
        # In a real scenario, we would load from Astra DB
        self.chain: List[HoloBlock] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis_data = {"message": "HoloChain Genesis - Tria Evolution v0.20.124"}
        genesis_block = HoloBlock(0, "0", time.time(), genesis_data)
        self.chain.append(genesis_block)
        logger.info("[HoloChain] Genesis block created.")

    def get_last_block(self) -> HoloBlock:
        return self.chain[-1]

    def add_snapshot(self, snapshot_data: Dict) -> HoloBlock:
        """
        Creates a new block from a Tria session snapshot and adds it to the chain.
        """
        last_block = self.get_last_block()
        new_index = last_block.index + 1
        new_timestamp = time.time()
        
        # We strip large raw data if necessary, or hash the whole thing
        # For HoloChain, we store the metadata and a reference/hash of the granular data
        block_data = {
            "session_id": snapshot_data.get("session_id"),
            "user_email": snapshot_data.get("user_email"),
            "frame_count": len(snapshot_data.get("data", [])),
            "is_training": snapshot_data.get("is_training", False)
        }
        
        new_block = HoloBlock(new_index, last_block.hash, new_timestamp, block_data)
        self.chain.append(new_block)
        
        logger.info(f"[HoloChain] Block #{new_index} added with hash: {new_block.hash[:10]}...")
        return new_block

    def validate_chain(self) -> bool:
        """Verifies the integrity of the HoloChain."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            
            if current.hash != current.calculate_hash():
                logger.error(f"[HoloChain] Integrity failure at block {i}: Hash mismatch.")
                return False
            if current.previous_hash != previous.hash:
                logger.error(f"[HoloChain] Integrity failure at block {i}: Link mismatch.")
                return False
        return True

    def get_chain_dicts(self) -> List[Dict]:
        return [block.to_dict() for block in self.chain]

# Global instance
holochain = HoloChainService()
