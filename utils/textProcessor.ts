import { DocumentChunk } from '../types';

export const parseAndChunkText = (text: string): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  const lines = text.split('\n');
  
  let currentChunk: Partial<DocumentChunk> = {
    content: '',
    title: 'Preamble',
    metadata: { startIndex: 0, endIndex: 0 }
  };
  
  let chunkCounter = 0;
  let currentContent = '';

  // Heuristic Regex for Legal Texts (BNS/IPC)
  // Matches:
  // "Section 10."
  // "10. Defamation"
  // "CHAPTER IV"
  const sectionRegex = /^(?:Section\s+\d+|[0-9]+\.\s+[A-Z]|CHAPTER\s+[IVXLCDM]+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line looks like a header
    if (sectionRegex.test(line)) {
      // If we have accumulated content, push the previous chunk
      if (currentContent.length > 0) {
        chunks.push({
          id: `chunk-${chunkCounter++}`,
          title: currentChunk.title || `Section ${chunkCounter}`,
          content: currentContent.trim(),
          metadata: { ...currentChunk.metadata, endIndex: i } as any
        });
        currentContent = '';
      }

      // Start new chunk
      // We use the full line as the title, e.g., "302. Murder."
      currentChunk = {
        title: line, 
        metadata: { startIndex: i, endIndex: i }
      };
      currentContent += line + '\n';
    } else {
      currentContent += line + '\n';
    }
  }

  // Push final chunk
  if (currentContent.length > 0) {
    chunks.push({
      id: `chunk-${chunkCounter++}`,
      title: currentChunk.title || 'End',
      content: currentContent.trim(),
      metadata: { ...currentChunk.metadata, endIndex: lines.length } as any
    });
  }

  return chunks;
};