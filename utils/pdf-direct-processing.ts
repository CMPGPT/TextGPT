import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { MistralClient } from './mistral';
import { TokenTextSplitter } from '@langchain/textsplitters';
import { encode } from 'gpt-tokenizer';

// Configure clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[utils:pdf-direct] Missing Supabase credentials', {
    supabaseUrlExists: !!supabaseUrl,
    supabaseKeyExists: !!supabaseKey
  });
  throw new Error('[utils:pdf-direct] Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  console.error('[utils:pdf-direct] Missing Mistral API key');
  throw new Error('[utils:pdf-direct] Missing Mistral API key');
}
const mistralClient = new MistralClient({ apiKey: mistralApiKey });

// Bucket mapping: Display Name -> Bucket ID
// In Supabase, bucket IDs (not display names) must be used for API operations
const BUCKET_MAPPING: Record<string, string> = {
  'PDF Documents': 'pdfs',            // Primary bucket
  'product-pdfs': 'product-pdfs',     // Fallback option
  'IQR PDF Documents': 'iqr_documents', // Another fallback
  'iqr-pdfs': 'iqr-pdfs'             // Final fallback
};

// Bucket preference order (by display name)
const BUCKET_PREFERENCES = [
  'PDF Documents',   // Try this first
  'product-pdfs',    // Then this one
  'iqr-pdfs',        // Then this one
  'IQR PDF Documents' // Last resort
];

// Type definitions
export interface PdfProcessingOptions {
  productId: string;
  businessId: string;
  serviceType: string;
  chunkSize?: number;
  overlap?: number;
  productName?: string;
  productDescription?: string;
  systemPrompt?: string;
  updateProgress?: (stage: string, percent: number) => Promise<void>;
}

export interface PdfProcessingResult {
  success: boolean;
  fileUrl?: string;
  path?: string;
  status?: string;
  error?: string;
  extractedTextId?: number;
  chunkCount?: number;
  bucketId?: string;
}

interface EmbeddingResult {
  success: boolean;
  chunkCount?: number;
  error?: string;
}

/**
 * Maps a bucket display name to its ID for use with Supabase Storage API
 * If exact match not found, returns the input (which might be an ID already)
 */
function getBucketId(displayNameOrId: string): string {
  return displayNameOrId in BUCKET_MAPPING ? BUCKET_MAPPING[displayNameOrId] : displayNameOrId;
}

/**
 * Uploads a PDF file to Supabase Storage only (no text extraction)
 * This function should be called during the Upload step
 */
export async function uploadPdfToStorage(
  file: File | Blob,
  options: PdfProcessingOptions
): Promise<PdfProcessingResult> {
  try {
    console.log(`[utils:pdf-direct] Starting PDF direct processing`, {
      fileSize: file.size,
      productId: options.productId,
      businessId: options.businessId,
      serviceType: options.serviceType,
    });

    // 1. Find an available bucket from our options
    let selectedBucketName = null; // Display name of bucket
    let selectedBucketId = null;   // ID of bucket (used for API calls)
    let availableBuckets = [];
    
    try {
      const { data: buckets, error: bucketError } = await supabase
        .storage
        .listBuckets();
      
      if (bucketError) {
        console.error(`[utils:pdf-direct] Error listing buckets: ${bucketError.message}`);
        await updateProductStatus(options.productId, 'failed');
        return { 
          success: false, 
          error: `Error listing buckets: ${bucketError.message}`,
          status: 'failed'
        };
      }
      
      if (!buckets || buckets.length === 0) {
        console.error('[utils:pdf-direct] No storage buckets found in Supabase project');
        await updateProductStatus(options.productId, 'failed');
        return {
          success: false,
          error: 'No storage buckets found in Supabase project',
          status: 'failed'
        };
      }
      
      // Store the complete bucket information for reference
      console.log('[utils:pdf-direct] Available buckets:', buckets.map(b => `${b.name} (ID: ${b.id})`));
      
      // Try to find a bucket from our preference list
      for (const bucketName of BUCKET_PREFERENCES) {
        const matchedBucket = buckets.find(b => b.name === bucketName);
        if (matchedBucket) {
          selectedBucketName = matchedBucket.name;
          selectedBucketId = matchedBucket.id;
          console.log(`[utils:pdf-direct] Selected bucket: ${selectedBucketName} (ID: ${selectedBucketId})`);
          break;
        }
      }
      
      // If none of our preferred buckets exists, use the first available bucket
      if (!selectedBucketId && buckets.length > 0) {
        selectedBucketName = buckets[0].name;
        selectedBucketId = buckets[0].id;
        console.log(`[utils:pdf-direct] Using fallback bucket: ${selectedBucketName} (ID: ${selectedBucketId})`);
      }
      
      if (!selectedBucketId) {
        console.error('[utils:pdf-direct] No suitable storage bucket found');
        await updateProductStatus(options.productId, 'failed');
        return {
          success: false,
          error: 'No suitable storage bucket found',
          status: 'failed'
        };
      }
    } catch (bucketCheckError: any) {
      console.error(`[utils:pdf-direct] Error checking buckets: ${bucketCheckError.message}`);
      await updateProductStatus(options.productId, 'failed');
      return { 
        success: false, 
        error: `Error checking buckets: ${bucketCheckError.message}`,
        status: 'failed'
      };
    }

    // 2. Update status to processing
    await updateProductStatus(options.productId, 'processing');
    
    // Update progress if callback provided
    if (options.updateProgress) {
      await options.updateProgress('uploading', 5);
    }

    // 3. Upload the PDF to Supabase Storage using the bucket ID (not display name)
    const storagePath = `products/${options.productId}/document.pdf`;
    console.log(`[utils:pdf-direct] Uploading PDF to ${selectedBucketName} (ID: ${selectedBucketId})/${storagePath}`);
    
    let uploadResult;
    try {
      // IMPORTANT: We use selectedBucketId (not name) for all Supabase Storage API calls
      uploadResult = await supabase
        .storage
        .from(selectedBucketId) // Using bucket ID for the API call
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadResult.error) {
        console.error(`[utils:pdf-direct] Upload error: ${uploadResult.error.message}`);
        await updateProductStatus(options.productId, 'failed');
        return { 
          success: false, 
          error: `Upload failed: ${uploadResult.error.message}`,
          status: 'failed'
        };
      }
      
      console.log(`[utils:pdf-direct] File uploaded successfully to ${selectedBucketName} (ID: ${selectedBucketId})`);
    } catch (uploadError: any) {
      console.error(`[utils:pdf-direct] Upload error:`, uploadError);
      await updateProductStatus(options.productId, 'failed');
      return { 
        success: false, 
        error: `Upload failed: ${uploadError.message || JSON.stringify(uploadError)}`,
        status: 'failed'
      };
    }
    
    // Update progress after successful upload
    if (options.updateProgress) {
      await options.updateProgress('uploading', 20);
    }
    
    // 4. Get the public URL from Supabase
    const publicUrlResult = await supabase
      .storage
      .from(selectedBucketId) // Using bucket ID
      .getPublicUrl(storagePath);
    
    if (!publicUrlResult.data) {
      console.error(`[utils:pdf-direct] Error getting public URL`);
      await updateProductStatus(options.productId, 'failed');
      return { 
        success: false, 
        error: 'Failed to get public URL for uploaded file',
        status: 'failed'
      };
    }
    
    const fileUrl = publicUrlResult.data.publicUrl;
    console.log(`[utils:pdf-direct] File URL: ${fileUrl}`);
    
    // Update product status to uploaded (but not processed yet)
    await updateProductStatus(options.productId, 'uploaded');
    
    // Return successful upload result with file URL
    return {
      success: true,
      fileUrl,
      path: storagePath,
      status: 'uploaded'
    };
  } catch (err: any) {
    console.error(`[utils:pdf-direct] PDF upload failed: ${err.message}`);
    await updateProductStatus(options.productId, 'failed');
    return {
      success: false,
      error: `PDF upload failed: ${err.message}`,
      status: 'failed'
    };
  }
}

/**
 * Extracts text from a previously uploaded PDF using Mistral AI's OCR API.
 * This function should be called during the Extract step after upload is complete.
 */
export async function extractTextFromPdf(
  productId: string,
  businessId: string,
  bucketId?: string, // Optional: if provided, will use this specific bucket
  serviceType: string = 'product-pdf',
  options: {
    chunkSize?: number;
    overlap?: number;
    productName?: string;
    productDescription?: string;
    systemPrompt?: string;
    updateProgress?: (stage: string, percent: number) => Promise<void>
  } = {}
): Promise<PdfProcessingResult> {
  try {
    console.log(`[utils:pdf-direct] Starting PDF text extraction with Mistral AI OCR API`, {
      productId,
      businessId,
      serviceType
    });
    
    // First, look up the available buckets if bucketId not provided
    let selectedBucketId = bucketId;
    if (!selectedBucketId) {
      try {
        const { data: buckets, error: bucketError } = await supabase
          .storage
          .listBuckets();
        
        if (bucketError) {
          console.error(`[utils:pdf-direct] Error listing buckets: ${bucketError.message}`);
          await updateProductStatus(productId, 'failed');
          return { 
            success: false, 
            error: `Error listing buckets: ${bucketError.message}`,
            status: 'failed'
          };
        }
        
        // Try to find a bucket from our preference list
        for (const bucketName of BUCKET_PREFERENCES) {
          const matchedBucket = buckets.find(b => b.name === bucketName);
          if (matchedBucket) {
            selectedBucketId = matchedBucket.id;
            console.log(`[utils:pdf-direct] Selected bucket for extraction: ${matchedBucket.name} (ID: ${selectedBucketId})`);
            break;
          }
        }
        
        // If none of our preferred buckets exists, use the first available bucket
        if (!selectedBucketId && buckets.length > 0) {
          selectedBucketId = buckets[0].id;
          console.log(`[utils:pdf-direct] Using fallback bucket for extraction: ${buckets[0].name} (ID: ${selectedBucketId})`);
        }
        
        if (!selectedBucketId) {
          console.error('[utils:pdf-direct] No suitable storage bucket found for extraction');
          await updateProductStatus(productId, 'failed');
          return {
            success: false,
            error: 'No suitable storage bucket found for extraction',
            status: 'failed'
          };
        }
      } catch (bucketCheckError: any) {
        console.error(`[utils:pdf-direct] Error checking buckets: ${bucketCheckError.message}`);
        await updateProductStatus(productId, 'failed');
        return { 
          success: false, 
          error: `Error checking buckets: ${bucketCheckError.message}`,
          status: 'failed'
        };
      }
    }
    
    // Update status to processing
    await updateProductStatus(productId, 'processing');
    
    // Update progress if callback provided
    if (options.updateProgress) {
      await options.updateProgress('extracting', 20);
    }
    
    // Define the path to the previously uploaded PDF
    const storagePath = `products/${productId}/document.pdf`;
    
    // Get the public URL
    const publicUrlResult = await supabase
      .storage
      .from(selectedBucketId) // Using bucket ID
      .getPublicUrl(storagePath);
    
    if (!publicUrlResult.data) {
      console.error(`[utils:pdf-direct] Error getting public URL`);
      await updateProductStatus(productId, 'failed');
      return { 
        success: false, 
        error: 'Failed to get public URL for uploaded file',
        status: 'failed'
      };
    }
    
    const fileUrl = publicUrlResult.data.publicUrl;
    
    // Generate a signed URL for PDF download
    console.log(`[utils:pdf-direct] Creating signed URL for PDF download`);
    let signedUrl;
    try {
      // First, create a longer-lived signed URL (30 minutes instead of 10)
      const signedUrlResult = await supabase
        .storage
        .from(selectedBucketId) // Using bucket ID
        .createSignedUrl(storagePath, 60 * 30); // 30 minute expiry
      
      if (signedUrlResult.error || !signedUrlResult.data) {
        console.error(`[utils:pdf-direct] Error creating signed URL: ${signedUrlResult.error?.message}`);
        await updateProductStatus(productId, 'failed');
        return { 
          success: false, 
          error: `Failed to create signed URL: ${signedUrlResult.error?.message}`,
          status: 'failed'
        };
      }
      
      signedUrl = signedUrlResult.data.signedUrl;
      
      console.log(`[utils:pdf-direct] Created signed URL successfully`);
    } catch (signedUrlError: any) {
      console.error(`[utils:pdf-direct] Error creating signed URL: ${signedUrlError.message}`);
      await updateProductStatus(productId, 'failed');
      return { 
        success: false, 
        error: `Failed to create signed URL: ${signedUrlError.message}`,
        status: 'failed'
      };
    }
    
    // Update progress before text extraction
    if (options.updateProgress) {
      await options.updateProgress('extracting', 30);
    }
    
    // Download the PDF and convert to base64 for Mistral
    console.log(`[utils:pdf-direct] Downloading PDF for Mistral OCR processing`);
    let pdfBase64: string;
    
    try {
      // Download the PDF using the signed URL
      const pdfResponse = await fetch(signedUrl);
      
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      
      // Convert PDF to base64
      pdfBase64 = pdfBuffer.toString('base64');
      
      console.log(`[utils:pdf-direct] PDF converted to base64, size: ${Math.round(pdfBase64.length / 1024)}KB`);
      
      // Update progress
      if (options.updateProgress) {
        await options.updateProgress('extracting', 40);
      }
    } catch (downloadError: any) {
      console.error(`[utils:pdf-direct] Error downloading PDF: ${downloadError.message}`);
      await updateProductStatus(productId, 'failed');
      return {
        success: false,
        error: `Error downloading PDF: ${downloadError.message}`,
        status: 'failed'
      };
    }
    
    // Process PDF with Mistral's OCR API
    console.log(`[utils:pdf-direct] Sending PDF to Mistral AI OCR API for text extraction`);
    let extractedText = '';
    let pageCount = 0;
    
    try {
      // Use Mistral OCR API to extract text
      const ocrResponse = await mistralClient.ocr({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${pdfBase64}`
        },
        include_image_base64: false // Set to true if you want image data too
      });
      
      // Extract text from all pages and combine
      extractedText = ocrResponse.pages.map(page => page.markdown).join('\n\n');
      pageCount = ocrResponse.pages.length;
      
      console.log(`[utils:pdf-direct] OCR extraction complete: ${pageCount} pages processed`);
      
      if (!extractedText) {
        console.error(`[utils:pdf-direct] No text extracted from PDF by Mistral OCR`);
        await updateProductStatus(productId, 'failed');
        return { 
          success: false, 
          error: 'No text extracted from PDF by Mistral OCR',
          status: 'failed'
        };
      }
      
      console.log(`[utils:pdf-direct] Text extraction successful with Mistral OCR`, { 
        productId,
        textLength: extractedText.length,
        pageCount
      });
      
      if (options.updateProgress) {
        await options.updateProgress('processing', 80);
      }
      
      // First verify product exists in the database to avoid foreign key constraint error
      const { data: productExists, error: productCheckError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();

      if (productCheckError) {
        console.log(`[utils:pdf-direct] Product does not exist: ${productId}. Creating product record first.`);
        
        // Insert product record using values from options if available
        const { error: productInsertError } = await supabase
          .from('products')
          .insert({
            id: productId,
            business_id: businessId,
            name: options.productName || `Imported PDF ${new Date().toISOString()}`,
            description: options.productDescription || null,
            system_prompt: options.systemPrompt || null,
            status: 'processing',
            pdf_processing_status: 'processing'
          });
          
        if (productInsertError) {
          console.error(`[utils:pdf-direct] Failed to create product record: ${productInsertError.message}`);
          await updateProductStatus(productId, 'failed');
          return { 
            success: false, 
            error: `Failed to create product record: ${productInsertError.message}`,
            status: 'failed'
          };
        }
      }

      // Store extracted text in database
      const { data: textData, error: textError } = await supabase
        .from('extracted_texts')
        .insert({
          product_id: productId,
          business_id: businessId,
          raw_text: extractedText,
          source_url: fileUrl,
          extraction_method: 'mistral_ocr',
          metadata: { 
            timestamp: new Date().toISOString(),
            service_type: serviceType,
            extraction_complete: true,
            needs_chunking: true,
            needs_embedding: true,
            page_count: pageCount
          }
        })
        .select('id')
        .single();
      
      if (textError) {
        console.error(`[utils:pdf-direct] Error saving extracted text: ${textError.message}`);
        await updateProductStatus(productId, 'failed');
        return { 
          success: false, 
          error: `Error saving extracted text: ${textError.message}`,
          status: 'failed'
        };
      }
      
      const extractedTextId = textData.id;
      
      if (options.updateProgress) {
        await options.updateProgress('completed', 100);
      }
      
      // We're skipping chunking and embedding here as they should be separate steps
      // This prevents redundancy since there are dedicated endpoints for these operations
      const embeddingResult: EmbeddingResult = { 
        success: true, 
        chunkCount: 0 // Will be updated by dedicated chunking and embedding endpoints
      };
      
      // Update product status to completed
      await updateProductStatus(productId, 'completed');
      
      return {
        success: true,
        fileUrl,
        path: storagePath,
        extractedTextId,
        chunkCount: 0, // Will be updated after chunking
        status: 'completed'
      };
      
    } catch (extractionError: any) {
      console.error(`[utils:pdf-direct] Mistral OCR extraction failed: ${extractionError.message}`);
      await updateProductStatus(productId, 'failed');
      return { 
        success: false, 
        error: `Mistral OCR extraction failed: ${extractionError.message}`,
        status: 'failed'
      };
    }
  } catch (err: any) {
    console.error(`[utils:pdf-direct] PDF extraction failed: ${err.message}`);
    await updateProductStatus(productId, 'failed');
    return {
      success: false,
      error: `PDF extraction failed: ${err.message}`,
      status: 'failed'
    };
  }
}

/**
 * Chunks text while tracking token positions
 */
export async function chunkTextWithTokens(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<{
  content: string;
  tokenStart: number;
  tokenEnd: number;
  charStart: number;
  charEnd: number;
}[]> {
  if (!text) return [];
  
  // Validate inputs
  chunkSize = Math.max(100, chunkSize);
  overlap = Math.min(Math.max(0, overlap), chunkSize - 50);
  
  console.log(`[utils:pdf-direct] Chunking text with tokens, size=${chunkSize}, overlap=${overlap}`);
  
  try {
    // First tokenize the entire text to keep track of positions
    const allTokens = encode(text);
    const tokenToCharMap: {start: number, end: number}[] = [];
    
    // Build a mapping from token index to character positions
    let currentPos = 0;
    for (let i = 0; i < allTokens.length; i++) {
      const tokenStr = text.substring(currentPos).match(/^\S+|\s+\S+/)?.[0] || "";
      tokenToCharMap.push({
        start: currentPos,
        end: currentPos + tokenStr.length
      });
      currentPos += tokenStr.length;
    }
    
    // Use LangChain's token splitter for proper chunking
    const splitter = new TokenTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
      encodingName: 'cl100k_base',
    });
    
    const chunks = await splitter.splitText(text);
    
    // Map chunks back to token positions
    const result: {
      content: string;
      tokenStart: number;
      tokenEnd: number;
      charStart: number; 
      charEnd: number;
    }[] = [];
    
    let tokenPosition = 0;
    for (const chunk of chunks) {
      // Find this chunk in the original text
      const chunkStart = text.indexOf(chunk);
      if (chunkStart === -1) continue;
      const chunkEnd = chunkStart + chunk.length;
      
      // Find the token indexes that correspond to this character range
      let startTokenIdx = -1;
      let endTokenIdx = -1;
      
      for (let i = 0; i < tokenToCharMap.length; i++) {
        if (startTokenIdx === -1 && tokenToCharMap[i].start >= chunkStart) {
          startTokenIdx = i;
        }
        if (endTokenIdx === -1 && tokenToCharMap[i].end >= chunkEnd) {
          endTokenIdx = i;
          break;
        }
      }
      
      if (startTokenIdx === -1) startTokenIdx = 0;
      if (endTokenIdx === -1) endTokenIdx = allTokens.length - 1;
      
      result.push({
        content: chunk,
        tokenStart: startTokenIdx,
        tokenEnd: endTokenIdx,
        charStart: chunkStart,
        charEnd: chunkEnd
      });
      
      tokenPosition = endTokenIdx;
    }
    
    console.log(`[utils:pdf-direct] Chunking completed: ${result.length} chunks created with token tracking`);
    return result;
  } catch (err: any) {
    console.error(`[utils:pdf-direct] Error during text chunking: ${err.message}`);
    // Return empty array in case of error
    return [];
  }
}

/**
 * Generates embeddings for text chunks with token position information
 */
export async function generateEmbeddingsWithTokenInfo(
  chunks: {
    content: string;
    tokenStart: number;
    tokenEnd: number;
    charStart: number;
    charEnd: number;
  }[],
  productId: string,
  options?: { 
    retries?: number;
    updateProgress?: (stage: string, percent: number) => Promise<void>;
  }
): Promise<{ success: boolean; chunkCount?: number; error?: string }> {
  if (!chunks.length) {
    return { success: false, error: 'No chunks provided for embedding' };
  }
  
  const maxRetries = options?.retries || 3;
  let processedCount = 0;
  
  try {
    console.log(`[utils:pdf-direct] Generating embeddings for ${chunks.length} chunks`, { 
      productId,
      maxRetries
    });
    
    // Update progress if callback provided
    if (options?.updateProgress) {
      await options.updateProgress('embedding', 75); // Starting at 75%
    }
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate hash for the chunk to avoid duplicates
      const encoder = new TextEncoder();
      const data = encoder.encode(chunk.content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const chunkHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Generate embedding with exponential backoff retry
      let embedding = null;
      let retryCount = 0;
      let delay = 1000; // Start with 1s delay
      
      while (!embedding && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`[utils:pdf-direct] Retry ${retryCount}/${maxRetries} for chunk ${i}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }
          
          const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk.content,
            encoding_format: 'float'
          });
          
          embedding = response.data[0].embedding;
        } catch (embeddingError: any) {
          console.error(`[utils:pdf-direct] Embedding error: ${embeddingError.message}`);
          retryCount++;
        }
      }
      
      if (!embedding) {
        console.error(`[utils:pdf-direct] Failed to generate embedding after ${maxRetries} retries`);
        continue; // Skip this chunk but continue with others
      }
      
      // Store chunk and embedding in database with token info
      const { error: insertError } = await supabase
        .from('pdf_chunks')
        .insert({
          product_id: productId,
          chunk_hash: chunkHash,
          content: chunk.content,
          embedding,
          token_start: chunk.tokenStart,
          token_end: chunk.tokenEnd,
          metadata: { 
            chunk_index: i,
            total_chunks: chunks.length,
            char_start: chunk.charStart,
            char_end: chunk.charEnd
          }
        });
      
      if (insertError) {
        console.error(`[utils:pdf-direct] Error storing chunk: ${insertError.message}`);
      } else {
        processedCount++;
      }
      
      // Update progress if callback provided
      if (options?.updateProgress) {
        const percent = Math.round((processedCount / chunks.length) * 25) + 75; // 75-100%
        await options.updateProgress('embedding', percent);
      }
    }
    
    console.log(`[utils:pdf-direct] Embeddings generated successfully`, {
      productId,
      processedChunks: processedCount,
      totalChunks: chunks.length
    });
    
    return {
      success: true,
      chunkCount: processedCount
    };
  } catch (err: any) {
    console.error(`[utils:pdf-direct] Embedding generation failed: ${err.message}`);
    return {
      success: false,
      error: `Embedding generation failed: ${err.message}`,
      chunkCount: processedCount
    };
  }
}

/**
 * Updates the product status in the database
 * This updates both the pdf_processing_status field and the metadata JSON field
 * to ensure compatibility with the status endpoint
 * Also logs updates to a dedicated processing_logs table for audit and tracking
 */
export async function updateProductStatus(
  productId: string,
  status: string,
  progressPercent?: number,
  additionalMetadata: Record<string, any> = {}
): Promise<void> {
  try {
    console.log(`[utils:pdf-direct] Updating product status for product ${productId} to ${status}`);
    
    // Calculate progress based on status if not explicitly provided
    if (progressPercent === undefined) {
      switch (status) {
        case 'starting': progressPercent = 10; break;
        case 'uploading': progressPercent = 25; break;
        case 'extracting': progressPercent = 40; break;
        case 'chunking': progressPercent = 60; break;
        case 'embedding': progressPercent = 80; break;
        case 'completed': progressPercent = 100; break;
        case 'failed': progressPercent = 0; break;
        default: progressPercent = 0;
      }
    }

    // Create metadata object with status information
    const metadata = {
      status,
      progressPercent,
      updatedAt: new Date().toISOString(),
      ...additionalMetadata
    };

    // Extract product information from metadata if provided
    const productName = additionalMetadata.productName;
    const productDescription = additionalMetadata.productDescription;
    const systemPrompt = additionalMetadata.systemPrompt;
    
    // First, update the product record
    const { error } = await supabase
      .from('products')
      .update({
        pdf_processing_status: status,
        status: status === 'completed' ? 'ready' : 'processing',
        metadata: metadata,
        // Only update these fields if they are provided and not null/undefined
        ...(productName ? { name: productName } : {}),
        ...(productDescription ? { description: productDescription } : {}),
        ...(systemPrompt ? { system_prompt: systemPrompt } : {})
      })
      .eq('id', productId);

    // Then, log this status change to the processing_logs table for tracking
    const { error: logError } = await supabase
      .from('processing_logs')
      .insert({
        product_id: productId,
        action: `status_${status}`,
        details: {
          status,
          progressPercent,
          timestamp: new Date().toISOString(),
          ...additionalMetadata
        }
      });

    if (error) {
      console.error(`[utils:pdf-direct] Error updating product status: ${error.message}`);
      
      // Log the error to processing_logs
      await supabase
        .from('processing_logs')
        .insert({
          product_id: productId,
          action: 'status_update_error',
          details: {
            error: error.message,
            attempted_status: status,
            timestamp: new Date().toISOString()
          }
        });
    } else {
      console.log(`[utils:pdf-direct] Updated product status to ${status} with progress ${progressPercent}%`);
    }
    
    if (logError) {
      console.error(`[utils:pdf-direct] Error logging status update: ${logError.message}`);
    }
  } catch (err) {
    console.error(`[utils:pdf-direct] Failed to update product status: ${err}`);
    
    // Attempt to log the error
    try {
      await supabase
        .from('processing_logs')
        .insert({
          product_id: productId,
          action: 'status_update_exception',
          details: {
            error: err instanceof Error ? err.message : String(err),
            attempted_status: status,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logErr) {
      console.error(`[utils:pdf-direct] Failed to log status update error: ${logErr}`);
    }
  }
}

/**
 * End-to-end PDF processing pipeline using direct processing methods
 * This is the main function that should be used to process PDFs from start to finish
 */
export async function processPdfEndToEnd(
  file: File | Blob,
  options: PdfProcessingOptions
): Promise<PdfProcessingResult> {
  // Track processing start time for performance metrics
  const processStartTime = Date.now();
  try {
    console.log(`[utils:pdf-direct] Starting end-to-end PDF processing pipeline`, { 
      productId: options.productId,
      businessId: options.businessId,
      serviceType: options.serviceType
    });

    // Initialize progress at 0%
    if (options.updateProgress) {
      await options.updateProgress('starting', 0);
    }

    // 1. Upload PDF to storage
    console.log(`[utils:pdf-direct] Step 1: Uploading PDF to storage`);
    if (options.updateProgress) {
      await options.updateProgress('uploading', 20);
    }

    // Update status to uploading with file details and product information
    await updateProductStatus(options.productId, 'uploading', 20, {
      fileSize: file.size,
      startedAt: new Date(processStartTime).toISOString(),
      productName: options.productName || null,
      productDescription: options.productDescription || null,
      systemPrompt: options.systemPrompt || null
    });

    const uploadResult = await uploadPdfToStorage(file, options);
    if (!uploadResult.success) {
      await updateProductStatus(options.productId, 'failed', 0, {
        error: uploadResult.error,
        stage: 'uploading'
      });
      return uploadResult;
    }

    // 2. Extract text from PDF using Mistral OCR API
    console.log(`[utils:pdf-direct] Step 2: Extracting text from PDF using Mistral OCR API`);
    if (options.updateProgress) {
      await options.updateProgress('extracting', 40);
    }

    // Update status to extracting with file location information
    await updateProductStatus(options.productId, 'extracting', 40, {
      fileUrl: uploadResult.fileUrl,
      filePath: uploadResult.path,
      bucketId: uploadResult.bucketId || 'unknown'
    });
    const extractionResult = await extractTextFromPdf(
      options.productId,
      options.businessId,
      uploadResult.bucketId,
      options.serviceType,
      { 
        chunkSize: options.chunkSize,
        overlap: options.overlap,
        productName: options.productName,
        productDescription: options.productDescription,
        systemPrompt: options.systemPrompt,
        updateProgress: options.updateProgress 
      }
    );
    
    if (!extractionResult.success) {
      await updateProductStatus(options.productId, 'failed', 0, {
        error: extractionResult.error,
        stage: 'extraction'
      });
      return {
        success: false,
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path,
        error: extractionResult.error,
        status: 'failed'
      };
    }

    // IMPORTANT: Mistral OCR extraction does not handle chunking and embedding
    // We need to explicitly perform these steps for end-to-end processing
    
    // 3. Fetch the extracted text from the database
    if (!extractionResult.extractedTextId) {
      console.error(`[utils:pdf-direct] Missing extracted text ID`);
      await updateProductStatus(options.productId, 'failed', 0, {
        error: 'Missing extracted text ID',
        stage: 'text_validation'
      });
      return {
        success: false,
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path,
        error: 'Missing extracted text ID after extraction',
        status: 'failed'
      };
    }
    
    console.log(`[utils:pdf-direct] Step 3: Fetching extracted text ID: ${extractionResult.extractedTextId}`);
    const { data: extractedTextData, error: fetchError } = await supabase
      .from('extracted_texts')
      .select('raw_text')
      .eq('id', extractionResult.extractedTextId)
      .single();
    
    if (fetchError || !extractedTextData) {
      console.error(`[utils:pdf-direct] Failed to fetch extracted text: ${fetchError?.message || 'Not found'}`);
      await updateProductStatus(options.productId, 'failed');
      return {
        success: false,
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path, 
        error: `Failed to fetch extracted text: ${fetchError?.message || 'Not found'}`,
        status: 'failed'
      };
    }
    
    // 4. Chunk the text with token information
    console.log(`[utils:pdf-direct] Step 4: Chunking text with token information`);
    if (options.updateProgress) {
      await options.updateProgress('chunking', 75);
    }
    
    // Update product status to chunking
    await updateProductStatus(options.productId, 'chunking', 75, {
      extractedTextId: extractionResult.extractedTextId,
      chunkSize: options.chunkSize || 1000,
      overlap: options.overlap || 200
    });
    
    const chunkSize = options.chunkSize || 1000;
    const overlap = options.overlap || 200;
    
    try {
      const chunks = await chunkTextWithTokens(
        extractedTextData.raw_text,
        chunkSize,
        overlap
      );
      
      console.log(`[utils:pdf-direct] Created ${chunks.length} chunks with token information`);
      
      // 5. Generate embeddings for the chunks
      console.log(`[utils:pdf-direct] Step 5: Generating embeddings for ${chunks.length} chunks`);
      if (options.updateProgress) {
        await options.updateProgress('embedding', 85);
      }
      
      // Update product status to embedding
      await updateProductStatus(options.productId, 'embedding', 85, {
        chunkCount: chunks.length,
        totalTokens: chunks.reduce((sum, chunk) => sum + (chunk.tokenEnd - chunk.tokenStart), 0)
      });
      
      const embeddingResult = await generateEmbeddingsWithTokenInfo(
        chunks,
        options.productId,
        {
          retries: 2,
          updateProgress: options.updateProgress ? 
            async (stage, percent) => {
              // Map embedding progress (0-100%) to overall progress (85-95%)
              const mappedPercent = 85 + (percent * 0.1);
              await options.updateProgress!('embedding', mappedPercent);
            } : undefined
        }
      );
      
      if (!embeddingResult.success) {
        console.error(`[utils:pdf-direct] Embedding generation failed: ${embeddingResult.error}`);
        await updateProductStatus(options.productId, 'failed', 0, {
          error: embeddingResult.error,
          stage: 'embedding'
        });
        return {
          success: false,
          fileUrl: uploadResult.fileUrl,
          path: uploadResult.path,
          extractedTextId: extractionResult.extractedTextId,
          error: embeddingResult.error || 'Unknown embedding error',
          status: 'failed'
        };
      }
      
      console.log(`[utils:pdf-direct] PDF processing completed successfully`, {
        productId: options.productId,
        chunkCount: embeddingResult.chunkCount
      });
      
      // Update product status to completed with final metadata
      await updateProductStatus(options.productId, 'completed', 100, {
        chunkCount: embeddingResult.chunkCount || 0,
        extractedTextId: extractionResult.extractedTextId,
        fileUrl: uploadResult.fileUrl,
        filePath: uploadResult.path,
        completedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - processStartTime
      });
      
      if (options.updateProgress) {
        await options.updateProgress('completed', 100);
      }
      
      return {
        success: true,
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path,
        extractedTextId: extractionResult.extractedTextId,
        chunkCount: embeddingResult.chunkCount || 0,
        status: 'completed'
      };
    } catch (processingError: any) {
      console.error(`[utils:pdf-direct] Processing error: ${processingError.message}`);
      await updateProductStatus(options.productId, 'failed', 0, {
        error: processingError.message,
        stage: 'processing'
      });
      return {
        success: false,
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path,
        extractedTextId: extractionResult.extractedTextId,
        error: `Processing error: ${processingError.message}`,
        status: 'failed'
      };
    }
  } catch (err: any) {
    console.error(`[utils:pdf-direct] PDF processing failed: ${err.message}`);
    await updateProductStatus(options.productId, 'failed');
    return {
      success: false,
      error: `PDF processing failed: ${err.message}`,
      status: 'failed'
    };
  }
}
