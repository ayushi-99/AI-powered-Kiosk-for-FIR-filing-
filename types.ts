export interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  metadata: {
    sectionNumber?: string;
    startIndex: number;
    endIndex: number;
  };
}

export interface VectorRecord {
  chunkId: string;
  embedding: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING_FILE = 'PROCESSING_FILE',
  INDEXING = 'INDEXING',
  READY = 'READY',
  SEARCHING = 'SEARCHING',
}
