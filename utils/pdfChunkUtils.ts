/**
 * Split text into manageable chunks
 * @param text - Text to split
 * @param maxChunkSize - Maximum size of each chunk
 * @returns Array of text chunks
 */
export function splitIntoChunks(text: string, maxChunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Approach 1: Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    // If a single paragraph is longer than the max size, we need to split it further
    if (paragraph.length > maxChunkSize) {
      // Split paragraph into sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        // If a single sentence is too long, split by words
        if (sentence.length > maxChunkSize) {
          const words = sentence.split(/\s+/);
          
          for (const word of words) {
            if (currentChunk.length + word.length + 1 > maxChunkSize) {
              chunks.push(currentChunk.trim());
              currentChunk = '';
            }
            currentChunk += ' ' + word;
          }
        } else {
          // Add sentence if it fits, otherwise start a new chunk
          if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += ' ' + sentence;
          }
        }
      }
    } else {
      // Add paragraph if it fits, otherwise start a new chunk
      if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
} 