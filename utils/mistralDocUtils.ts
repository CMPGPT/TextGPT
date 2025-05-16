import { splitIntoChunks } from '@/utils/pdfChunkUtils';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('utils:mistralDoc');

// Get memory limits from environment
const MAX_PDF_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '10', 10);
const MAX_CONTENT_LENGTH = MAX_PDF_SIZE_MB * 1024 * 1024; // Convert to bytes

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
    // Check PDF size
    if (pdfBuffer.length > MAX_CONTENT_LENGTH) {
      logger.warn('PDF exceeds size limit', { 
        size: `${Math.round(pdfBuffer.length / 1024 / 1024)}MB`, 
        limit: `${MAX_PDF_SIZE_MB}MB` 
      });
      return {
        text: `PDF is too large for processing. Maximum allowed size is ${MAX_PDF_SIZE_MB}MB.`,
        pages: [{
          page_num: 1,
          text: `PDF is too large for processing. Maximum allowed size is ${MAX_PDF_SIZE_MB}MB.`
        }]
      };
    }
    
    // Check if Mistral API key is available
    if (!process.env.MISTRAL_API_KEY) {
      logger.warn('MISTRAL_API_KEY is not set - returning fallback response');
      return {
        text: "PDF processing requires Mistral API Key. Please configure the environment variable.",
        pages: [{
          page_num: 1,
          text: "PDF processing requires Mistral API Key. Please configure the environment variable."
        }]
      };
    }
    
    // Convert buffer to base64
    logger.info('Converting PDF to base64', { 
      bufferSize: `${Math.round(pdfBuffer.length / 1024)}KB` 
    });
    
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
    logger.info('Sending request to Mistral OCR API', {
      modelName: "mistral-ocr-latest",
      payloadSize: `${Math.round(base64Pdf.length / 1024)}KB`
    });

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
    logger.info(`Mistral API response received`, { status: response.status });

    // Handle rate limiting (429) with retries
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      const waitTime = parseInt(retryAfter, 10) * 1000 || 2000;
      logger.warn(`Rate limited by Mistral API, retrying`, { waitTime: `${waitTime}ms` });
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return extractTextFromMistral(pdfBuffer, retries - 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Mistral API error response', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const ocrResult: MistralOcrResponse = await response.json();
    logger.info('Mistral OCR API response processed', { 
      pageCount: ocrResult?.pages?.length || 0 
    });
    
    // Process OCR result into the expected format
    if (!ocrResult || !ocrResult.pages || !Array.isArray(ocrResult.pages)) {
      logger.error('Invalid structure in Mistral OCR API response', { 
        responsePreview: JSON.stringify(ocrResult).substring(0, 500) + '...' 
      });
      throw new Error('Invalid structure in Mistral OCR API response');
    }

    // Extract full text and process page content
    const fullText = ocrResult.pages.map((page: MistralOcrPage) => page.markdown).join('\n\n');
    const pages = ocrResult.pages.map((page: MistralOcrPage, index: number) => ({
      page_num: page.index + 1, // OCR API uses 0-based indexing, convert to 1-based
      text: page.markdown
    }));

    logger.info('Text extraction complete', { 
      textLength: fullText.length,
      pageCount: pages.length
    });

    return {
      text: fullText,
      pages: pages
    };
  } catch (error) {
    logger.error('Error extracting text using Mistral', { error });
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
    // Check PDF size limit
    if (pdfBuffer.length > MAX_CONTENT_LENGTH) {
      logger.warn('PDF exceeds size limit for processing', { 
        fileName,
        size: `${Math.round(pdfBuffer.length / 1024 / 1024)}MB`, 
        limit: `${MAX_PDF_SIZE_MB}MB` 
      });
      
      return [{
        content: `The PDF "${fileName}" exceeds the maximum allowed size of ${MAX_PDF_SIZE_MB}MB for processing. Please upload a smaller file or optimize the current one.`,
        metadata: { page: 1, section: 'Size Limit Exceeded' }
      }];
    }
    
    // Check if Mistral API key is available
    if (!process.env.MISTRAL_API_KEY) {
      logger.warn('MISTRAL_API_KEY is not set - creating placeholder chunk', { fileName });
      return [{
        content: `PDF processing requires Mistral API Key. The file "${fileName}" was uploaded but text extraction was skipped. Please configure the MISTRAL_API_KEY environment variable.`,
        metadata: { page: 1, section: 'Configuration Required' }
      }];
    }
    
    // Extract text from PDF using Mistral
    logger.info(`Extracting text from PDF`, { fileName });
    const extractionResult = await extractTextFromMistral(pdfBuffer);
    logger.info(`Text extraction complete`, { 
      fileName,
      textLength: extractionResult.text.length,
      pageCount: extractionResult.pages?.length || 0
    });
    
    if (!extractionResult.text.trim()) {
      logger.warn(`No text extracted from PDF`, { fileName });
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
      
      logger.info(`Chunking complete`, { 
        fileName,
        chunkCount: allChunks.length,
        pageCount: extractionResult.pages.length
      });
      
      return allChunks;
    } 
    else {
      // No page information, process the full text
      const textChunks = splitIntoChunks(extractionResult.text);
      logger.info(`Chunking complete`, { 
        fileName,
        chunkCount: textChunks.length
      });
      
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
    logger.error(`Error processing PDF`, { fileName, error });
    return [{
      content: `Error processing PDF "${fileName}": ${(error as Error).message}`,
      metadata: { page: 0, section: 'Error' }
    }];
  }
} 