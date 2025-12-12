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

export interface LegalAnalysisResult {
  classification: 'Cognizable Offense' | 'Non-Cognizable/Civil Dispute' | 'Ambiguous/Need More Info';
  bns_section: string;
  confidence_score: number;
  reasoning: string;
  missing_details: string;
  detected_language?: string;
  translated_narrative?: string;
  transcription?: string;
  visual_analysis?: string;
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

// Red Team Types
export interface TestCase {
  id: string;
  narrative: string;
  expected_classification: 'Cognizable Offense' | 'Non-Cognizable/Civil Dispute' | 'Ambiguous/Need More Info';
  type: 'Genuine' | 'Civil' | 'Frivolous' | 'Vague';
}

export interface TestResult extends TestCase {
  actual_classification: string;
  bns_section_found: string;
  pass: boolean;
  reasoning: string;
}