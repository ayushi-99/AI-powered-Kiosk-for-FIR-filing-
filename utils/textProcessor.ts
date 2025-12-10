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

  // Matches:
  // "1. Short title..."
  // "303. Theft."
  // "CHAPTER IV"
  const sectionRegex = /^(?:CHAPTER\s+[IVXLCDM]+|\d+\.)/;
  
  // Regex to identify garbage lines from PDF copy-paste (e.g., "S__ec___ . __ 1 __ ]" or page headers)
  const garbageRegex = /_{3,}|\[Part II—|THE GAZETTE OF INDIA|EXTRAORDINARY/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip garbage lines
    if (garbageRegex.test(line)) continue;

    // Check if line looks like a header (Section or Chapter)
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
      // Use the line as title. If it's just a number like "303.", we might want to grab the next line too, 
      // but usually the title is on the same line or valid enough.
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