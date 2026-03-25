/**
 * IVectorRepository
 *
 * Abstracts all vector database operations.
 * Concrete implementation uses pgvector (PostgreSQL),
 * but Pinecone, Chroma, or Weaviate can be swapped in via this interface.
 *
 * Used by llm-service for:
 *  - Storing chat message embeddings
 *  - Retrieving contextually similar messages for RAG
 */
export interface IVectorRepository {
  /**
   * Insert or update an embedding by ID.
   * @param id       - Unique identifier (e.g. chat message UUID)
   * @param embedding - Dense vector produced by ILLMProvider.embed()
   * @param metadata  - Arbitrary key-value data stored alongside the vector
   */
  upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;

  /**
   * Find the most similar vectors to the query embedding.
   * @param embedding - Query vector
   * @param topK      - Maximum number of results to return
   * @param filter    - Optional metadata filters (e.g. { userId: 'abc' })
   */
  similaritySearch(
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;

  delete(id: string): Promise<void>;
}

export interface VectorSearchResult {
  id: string;
  /** Cosine similarity score (0–1, higher = more similar) */
  score: number;
  metadata: Record<string, unknown>;
}
