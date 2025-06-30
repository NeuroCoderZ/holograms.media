from pydantic import Field, BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

class HologramSemanticEmbedding(BaseUUIDModel):
    """
    Represents a semantic embedding in the Holograms.media project, 
    designed for "liquid code" and "vector control of vectors" concepts.
    Includes revolutionary metadata for dynamic adaptation and gesture interaction.
    """
    embedding_vector: List[float] = Field(..., description="The actual embedding vector.")
    embedding_model_version: str = Field(..., description="Version of the embedding model used (e.g., text-embedding-004, custom-gesture-v1).")
    
    # Revolutionary Metadata for Vector Control
    semantic_type: str = Field(..., description="Semantic category of the embedded data (e.g., 'concept', 'action', 'state', 'gesture_pattern', 'visual_attribute', 'audio_feature').")
    
    gesture_affordances: Dict[str, Any] = Field(
        default_factory=dict, 
        description="JSON object describing possible gesture-based manipulations and their parameters (e.g., {'movable': True, 'resizable': {'dimensions': ['x', 'y']}, 'color_changeable': True})."
    )
    vector_operators: Dict[str, Any] = Field(
        default_factory=dict, 
        description="JSON object mapping semantic operations to vector transformations (e.g., {'add_sentiment': {'vector_dimension': 5, 'strength_factor': 0.1}, 'scale_intensity': {'dimensions': [0, 1]}})."
    )
    learning_targets: Dict[str, Any] = Field(
        default_factory=dict, 
        description="JSON object with instructions/priorities for LearningBot regarding this embedding's adaptation (e.g., {'refinement_priority': 'high', 'data_sources': ['user_interactions', 'azr_cycles'], 'feedback_metric': 'accuracy'})."
    )
    evolution_timestamps: Dict[str, Any] = Field(
        default_factory=dict, 
        description="JSON object tracking key evolutionary events and their timestamps (e.g., {'last_adapted': '2025-01-01T10:00:00Z', 'first_created': '2024-12-01T00:00:00Z', 'last_reviewed': '2025-01-05T15:30:00Z'})."
    )
    
    # Metadata for Personalization and Liquid Data Structure
    user_id: Optional[str] = Field(None, description="Firebase UID of the user this embedding is personalized for, if applicable.")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0, description="System's confidence in the accuracy/relevance of this embedding (0.0 to 1.0).")
    liquidity_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Measure of how 'liquid' or adaptable this embedding is (0.0=stable, 1.0=highly adaptable).")
    related_chunk_ids: List[UUID] = Field(default_factory=list, description="List of InteractionChunk IDs that contributed to this embedding.")

    # Optional context from original source
    source_file_path: Optional[str] = Field(default=None, description="Original file path of the source data, if applicable.")
    original_content_hash: Optional[str] = Field(default=None, description="Hash of the original content from which embedding was derived.")

    model_config = ConfigDict(from_attributes=True)

    class Config:
        schema_extra = {
            "examples": [
                {
                    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                    "embedding_vector": [0.1, 0.2, 0.3, 0.4, 0.5], # Simplified for example
                    "embedding_model_version": "text-embedding-004",
                    "semantic_type": "concept",
                    "gesture_affordances": {"movable": True, "scaleable": {"axis": "all"}},
                    "vector_operators": {"emphasize": {"dimension_indices": [0, 1]}},
                    "learning_targets": {"refinement_priority": "medium"},
                    "evolution_timestamps": {"last_adapted": "2025-06-10T12:00:00Z"},
                    "user_id": "some_firebase_uid",
                    "confidence_score": 0.95,
                    "liquidity_score": 0.7,
                    "related_chunk_ids": [],
                    "created_at": "2025-06-01T00:00:00Z",
                    "updated_at": "2025-06-10T12:00:00Z"
                }
            ]
        }

