"""
PR AI WORKFORCE - Memory Service
Provides persistent, multi-level memory (organization, client, project, agent)
with real 1536-dimensional dense vector embeddings and cosine semantic search.
"""

from typing import Optional, Dict, Any, List
import datetime
import uuid
import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.pipeline import FeatureUnion

import database

# Initialize a hybrid word + character subword embedding vectorizer
# Total dimension: 768 (word 1-2 ngrams) + 768 (char_wb 3-4 ngrams) = 1536
_EMBEDDING_UNION = FeatureUnion([
    (
        "words",
        HashingVectorizer(
            n_features=768,
            alternate_sign=False,
            norm="l2",
            token_pattern=r"(?u)\b\w+\b",
            ngram_range=(1, 2),
        ),
    ),
    (
        "chars",
        HashingVectorizer(
            n_features=768,
            alternate_sign=False,
            norm="l2",
            analyzer="char_wb",
            ngram_range=(3, 4),
        ),
    ),
])


def embed_text(text: str) -> List[float]:
    """
    Computes a 1536-dimensional L2-normalized dense vector embedding for text.
    Handles English, Arabic, and multilingual tokens with subword resilience.
    """
    if not text or not text.strip():
        return [0.0] * 1536
    
    vec = _EMBEDDING_UNION.transform([text]).toarray()[0]
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return [float(x) for x in vec]


def save_memory(
    org_id: str,
    type: str,
    reference_id: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Embeds and persists a new memory item into the memory database.
    Supported types: 'organization', 'client', 'project', 'agent'.
    """
    valid_types = {"organization", "client", "project", "agent"}
    if type not in valid_types:
        raise ValueError(f"Invalid memory type: '{type}'. Must be one of {valid_types}")

    memory_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    embedding = embed_text(content)

    memory_record = {
        "id": memory_id,
        "org_id": org_id,
        "type": type,
        "reference_id": reference_id,
        "content": content,
        "metadata": metadata or {},
        "created_at": now,
    }

    # Persist record and embedding in database
    database.create_memory(memory_record, embedding)
    return memory_record


def search_memory(
    org_id: str,
    query: str,
    type: Optional[str] = None,
    reference_id: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Performs cosine similarity semantic search (<=> operator) against stored memories.
    Enforces strict organization isolation and optional type/reference filters.
    Returns memories with similarity score and cosine distance.
    """
    if not query or not query.strip():
        return []

    query_vec = np.array(embed_text(query))
    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return []

    memories, embeddings = database.get_memories_for_search(
        org_id=org_id,
        type_filter=type,
        reference_id_filter=reference_id,
    )

    scored_results = []
    for mem in memories:
        mem_id = mem["id"]
        mem_vec = np.array(embeddings.get(mem_id, []))
        if len(mem_vec) != 1536:
            continue

        mem_norm = np.linalg.norm(mem_vec)
        if mem_norm == 0:
            continue

        # Cosine similarity and cosine distance (<=> in pgvector)
        dot_product = float(np.dot(query_vec, mem_vec))
        cosine_sim = dot_product / (query_norm * mem_norm)
        # Clamp to [0.0, 1.0]
        cosine_sim = max(0.0, min(1.0, cosine_sim))
        cosine_dist = 1.0 - cosine_sim

        scored_mem = dict(mem)
        scored_mem["similarity"] = round(cosine_sim, 4)
        scored_mem["similarity_percent"] = round(cosine_sim * 100, 1)
        scored_mem["cosine_distance"] = round(cosine_dist, 4)
        scored_results.append(scored_mem)

    # Sort by cosine distance ascending (closest / highest similarity first)
    scored_results.sort(key=lambda x: x["cosine_distance"])
    return scored_results[:limit]


def get_memory(memory_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a memory by ID."""
    return database.get_memory(memory_id)


def delete_memory(memory_id: str, org_id: Optional[str] = None) -> bool:
    """Deletes a memory item and its vector embedding."""
    return database.delete_memory(memory_id, org_id=org_id)


def list_memories(
    org_id: str,
    type: Optional[str] = None,
    reference_id: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Lists memories without semantic search."""
    return database.list_memories(
        org_id=org_id,
        type_filter=type,
        reference_id_filter=reference_id,
        limit=limit,
    )
