// PDF processing utilities using pdf-parse library
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';

/**
 * Extract text content from PDF buffer using pdf-parse
 * @param pdfBuffer - Buffer containing PDF data
 * @returns Array of pages with text content and page numbers
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<{ text: string; pageNumber: number }[]> {
  try {
    const data = await pdfParse(pdfBuffer);
    
    // pdf-parse doesn't natively provide per-page extraction
    // we'll try to split by page markers or just return the full text as one page
    const fullText = data.text || '';
    
    if (!fullText.trim()) {
      throw new Error('No text content extracted from PDF');
    }
    
    // Simple approach: return all content as one "page"
    // In a more advanced implementation, you could split by page boundaries
    return [{
      text: fullText,
      pageNumber: 1
    }];
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return [{
      text: 'Error extracting text from PDF. The file may be corrupt, password-protected, or in an unsupported format.',
      pageNumber: 0
    }];
  }
}

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

/**
 * Process PDF buffer and split into chunks with metadata
 * @param pdfBuffer - Buffer with PDF data
 * @param fileName - Original file name for reference
 * @returns Array of chunks with content and metadata
 */
export async function processPdfToChunks(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ content: string; metadata: { page: number; section: string } }[]> {
  // Extract text from PDF
  const pdfTextContent = await extractTextFromPdf(pdfBuffer);
  console.log(`Extracted text from ${fileName}`);
  
  // Create chunks from the text
  const pdfChunks = [];
  
  for (const pageContent of pdfTextContent) {
    // Skip pages with no content
    if (!pageContent.text.trim()) {
      console.log(`Skipping empty page ${pageContent.pageNumber}`);
      continue;
    }
    
    // Split page text into appropriate chunks
    const pageChunks = splitIntoChunks(pageContent.text);
    console.log(`Created ${pageChunks.length} chunks from page ${pageContent.pageNumber}`);
    
    // Create a chunk object for each text segment
    for (let i = 0; i < pageChunks.length; i++) {
      pdfChunks.push({
        content: pageChunks[i],
        metadata: { 
          page: pageContent.pageNumber, 
          section: `Chunk ${i + 1} of page ${pageContent.pageNumber}` 
        }
      });
    }
  }
  
  // If no text was extracted, add a fallback message
  if (pdfChunks.length === 0) {
    console.log(`No text extracted from ${fileName}, adding fallback message`);
    pdfChunks.push({
      content: `Unable to extract text from "${fileName}". The PDF may be scanned or contain only images.`,
      metadata: { page: 1, section: 'Error' }
    });
  }
  
  return pdfChunks;
}
