/**
 * Similarity Interface
 *
 * Abstract interface for semantic similarity operations.
 * This allows plugging in any embedding provider (OpenAI, local models, etc.)
 * without coupling the memory system to a specific implementation.
 */

/**
 * A match result from similarity search
 */
export interface SimilarityMatch {
  /** Index of the matching candidate in the original array */
  index: number;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** The matched text */
  text: string;
}

/**
 * Abstract interface for similarity computation
 *
 * Implementations may use:
 * - OpenAI embeddings
 * - Local embedding models
 * - Simple text matching (for testing)
 * - Any other similarity method
 */
export interface SimilarityProvider {
  /**
   * Compute similarity between two pieces of text
   *
   * @param textA - First text
   * @param textB - Second text
   * @returns Similarity score between 0 (no similarity) and 1 (identical meaning)
   */
  computeSimilarity(textA: string, textB: string): Promise<number>;

  /**
   * Find candidates similar to a query
   *
   * @param query - The text to match against
   * @param candidates - Array of candidate texts to search
   * @param threshold - Minimum similarity score (0-1) to include in results
   * @returns Array of matches sorted by score (highest first)
   */
  findSimilar(
    query: string,
    candidates: string[],
    threshold: number
  ): Promise<SimilarityMatch[]>;
}

/**
 * Configuration for similarity operations
 */
export interface SimilarityConfig {
  /** Default threshold for similarity matching (0-1) */
  defaultThreshold: number;
  /** Maximum number of results to return from findSimilar */
  maxResults?: number;
}

/**
 * Deterministic word-overlap similarity provider
 *
 * A baseline provider that computes similarity using word overlap (Dice coefficient).
 * Suitable for production use cases where:
 * - Deterministic, reproducible results are required
 * - Embedding services are unavailable or unnecessary
 * - Simple lexical matching is sufficient
 *
 * For semantic similarity (understanding meaning beyond exact words),
 * use an embedding-based provider as an optional adapter.
 */
export class ExactMatchSimilarityProvider implements SimilarityProvider {
  computeSimilarity(textA: string, textB: string): Promise<number> {
    const normalizedA = textA.toLowerCase().trim();
    const normalizedB = textB.toLowerCase().trim();

    if (normalizedA === normalizedB) {
      return Promise.resolve(1.0);
    }

    // Partial match based on word overlap
    const wordsA = new Set(normalizedA.split(/\s+/));
    const wordsB = new Set(normalizedB.split(/\s+/));

    if (wordsA.size === 0 || wordsB.size === 0) {
      return Promise.resolve(0);
    }

    let overlap = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        overlap++;
      }
    }

    const score = (2 * overlap) / (wordsA.size + wordsB.size);
    return Promise.resolve(score);
  }

  findSimilar(
    query: string,
    candidates: string[],
    threshold: number
  ): Promise<SimilarityMatch[]> {
    const matches: SimilarityMatch[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      // Synchronous computation wrapped in the async interface
      const normalizedQuery = query.toLowerCase().trim();
      const normalizedCandidate = candidate.toLowerCase().trim();

      let score: number;
      if (normalizedQuery === normalizedCandidate) {
        score = 1.0;
      } else {
        const wordsQuery = new Set(normalizedQuery.split(/\s+/));
        const wordsCandidate = new Set(normalizedCandidate.split(/\s+/));

        if (wordsQuery.size === 0 || wordsCandidate.size === 0) {
          score = 0;
        } else {
          let overlap = 0;
          for (const word of wordsQuery) {
            if (wordsCandidate.has(word)) {
              overlap++;
            }
          }
          score = (2 * overlap) / (wordsQuery.size + wordsCandidate.size);
        }
      }

      if (score >= threshold) {
        matches.push({
          index: i,
          score,
          text: candidate,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return Promise.resolve(matches);
  }
}

