import { DocumentChunk, VectorRecord, SearchResult } from '../types';

// Simple in-memory vector store
export class VectorStore {
  private vectors: VectorRecord[] = [];
  private chunks: Map<string, DocumentChunk> = new Map();

  add(chunk: DocumentChunk, embedding: number[]) {
    this.vectors.push({ chunkId: chunk.id, embedding });
    this.chunks.set(chunk.id, chunk);
  }

  clear() {
    this.vectors = [];
    this.chunks.clear();
  }

  search(queryEmbedding: number[], topK: number = 3): SearchResult[] {
    const scores = this.vectors.map(vec => ({
      chunkId: vec.chunkId,
      similarity: this.cosineSimilarity(queryEmbedding, vec.embedding)
    }));

    // Sort by similarity descending
    scores.sort((a, b) => b.similarity - a.similarity);

    // Get top K
    return scores.slice(0, topK).map(score => ({
      chunk: this.chunks.get(score.chunkId)!,
      similarity: score.similarity
    }));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  get size() {
    return this.vectors.length;
  }
}

export const vectorStore = new VectorStore();
