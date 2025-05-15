import { splitIntoChunks } from '@/utils/pdfChunkUtils';

interface MistralDocumentResponse {
  text: string;
  pages: {
    page_num: number;
    text: string;
  }[];
}

// Define the structure of Mistral OCR API response
interface MistralOcrPage {
  index: number;
  markdown: string;
  [key: string]: any; // For any other properties in the response
}

interface MistralOcrResponse {
  pages: MistralOcrPage[];
  [key: string]: any; // For any other properties in the response
}

/**
 * Extract text from a PDF using Mistral OCR API
 * @param pdfBuffer - Buffer containing PDF data
 * @param retries - Number of retries for the API call
 * @returns Extracted text content with page information
 */
export async function extractTextFromMistral(pdfBuffer: Buffer, retries = 2): Promise<MistralDocumentResponse> {
  try {
    // Check if Mistral API key is available
    if (!process.env.MISTRAL_API_KEY) {
      console.warn('MISTRAL_API_KEY is not set - returning fallback response');
      return {
        text: "PDF processing requires Mistral API Key. Please configure the environment variable.",
        pages: [{
          page_num: 1,
          text: "PDF processing requires Mistral API Key. Please configure the environment variable."
        }]
      };
    }
    
    // Convert buffer to base64
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Create the request payload for OCR API
    const payload = {
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${base64Pdf}`
      }
    };

    // Log Mistral API request
    console.log('Sending request to Mistral OCR API');

    // Call Mistral OCR API
    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    // Log response status
    console.log(`Mistral API response status: ${response.status}`);

    // Handle rate limiting (429) with retries
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      const waitTime = parseInt(retryAfter, 10) * 1000 || 2000;
      console.log(`Rate limited by Mistral API. Retrying after ${waitTime}ms`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return extractTextFromMistral(pdfBuffer, retries - 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error response:', errorText);
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const ocrResult: MistralOcrResponse = await response.json();
    console.log('Mistral OCR API response received');
    
    // Process OCR result into the expected format
    if (!ocrResult || !ocrResult.pages || !Array.isArray(ocrResult.pages)) {
      console.error('Mistral API response:', JSON.stringify(ocrResult).substring(0, 500) + '...');
      throw new Error('Invalid structure in Mistral OCR API response');
    }

    // Extract full text and process page content
    const fullText = ocrResult.pages.map((page: MistralOcrPage) => page.markdown).join('\n\n');
    const pages = ocrResult.pages.map((page: MistralOcrPage, index: number) => ({
      page_num: page.index + 1, // OCR API uses 0-based indexing, convert to 1-based
      text: page.markdown
    }));

    return {
      text: fullText,
      pages: pages
    };
  } catch (error) {
    console.error('Error extracting text using Mistral:', error);
    throw error;
  }
}

/**
 * Process PDF buffer using Mistral API and split into chunks with metadata
 * @param pdfBuffer - Buffer with PDF data
 * @param fileName - Original file name for reference
 * @returns Array of chunks with content and metadata
 */
export async function processPdfToChunks(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ content: string; metadata: { page: number; section: string } }[]> {
  try {
    // Check if Mistral API key is available
    if (!process.env.MISTRAL_API_KEY) {
      console.warn('MISTRAL_API_KEY is not set - creating placeholder chunk');
      return [{
        content: `PDF processing requires Mistral API Key. The file "${fileName}" was uploaded but text extraction was skipped. Please configure the MISTRAL_API_KEY environment variable.`,
        metadata: { page: 1, section: 'Configuration Required' }
      }];
    }
    
    // Extract text from PDF using Mistral
    console.log(`Extracting text from ${fileName} using Mistral OCR API`);
    const extractionResult = await extractTextFromMistral(pdfBuffer);
    console.log(`Successfully extracted ${extractionResult.text.length} characters of text from ${fileName}`);
    
    if (!extractionResult.text.trim()) {
      console.log(`No text extracted from ${fileName}, adding fallback message`);
      return [{
        content: `Unable to extract text from "${fileName}". The PDF may be corrupted or contain only images that couldn't be processed.`,
        metadata: { page: 1, section: 'Error' }
      }];
    }
    
    // If we have pages, process by page
    if (extractionResult.pages && extractionResult.pages.length > 0) {
      const allChunks: { content: string; metadata: { page: number; section: string } }[] = [];
      
      // Process each page separately to maintain page metadata
      for (const page of extractionResult.pages) {
        if (!page.text.trim()) continue;
        
        // Create chunks from the page text
        const pageChunks = splitIntoChunks(page.text);
        
        // Add page information to each chunk
        const pageChunksWithMetadata = pageChunks.map((chunkText, index) => ({
          content: chunkText,
          metadata: { 
            page: page.page_num, 
            section: `Page ${page.page_num} - Section ${index + 1}` 
          }
        }));
        
        allChunks.push(...pageChunksWithMetadata);
      }
      
      console.log(`Created ${allChunks.length} chunks with page metadata from ${fileName}`);
      return allChunks;
    } 
    else {
      // No page information, process the full text
      const textChunks = splitIntoChunks(extractionResult.text);
      console.log(`Created ${textChunks.length} chunks from ${fileName}`);
      
      // Create a chunk object for each text segment
      return textChunks.map((chunkText, index) => ({
        content: chunkText,
        metadata: { 
          page: Math.floor(index / 5) + 1, // Estimate page numbers (5 chunks per page)
          section: `Chunk ${index + 1}` 
        }
      }));
    }
  } catch (error) {
    console.error(`Error processing PDF ${fileName}:`, error);
    return [{
      content: `Error processing PDF "${fileName}": ${(error as Error).message}`,
      metadata: { page: 0, section: 'Error' }
    }];
  }
} 