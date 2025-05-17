import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { processPdfToChunks } from '@/utils/mistralDocUtils';
import { countTokens } from '@/utils/vectorDB';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:process-pdf');

// Helper for memory usage tracking
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    return {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };
  }
  return { rss: 'n/a', heapTotal: 'n/a', heapUsed: 'n/a', external: 'n/a' };
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Add GET method to check API status (helpful for debugging)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get('cron') === 'true';
  
  if (isCron) {
    logger.info('Cron job triggered for PDF processing');
    
    try {
      // Fetch queued items
      const { data: queuedItems, error } = await supabaseAdmin
        .from('processing_queue')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(2); // Process only 2 items per cron run to avoid timeouts
      
      if (error) {
        logger.error('Error fetching queued items', { error: error.message });
        return NextResponse.json(
          { error: 'Failed to fetch queue items', details: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
      
      if (!queuedItems || queuedItems.length === 0) {
        logger.info('No items in queue to process');
        return NextResponse.json(
          { message: 'No items in queue to process' },
          { status: 200, headers: corsHeaders }
        );
      }
      
      logger.info(`Found ${queuedItems.length} items to process`);
      
      // Process only the first item through the API endpoint
      // This prevents running out of execution time on Vercel
      const item = queuedItems[0];
      
      // Check if there's actually a file path to process
      if (!item.file_path || item.file_path.trim() === '') {
        logger.info(`Item ${item.id} has no file path, marking as completed without processing`, { productId: item.product_id });
        
        // Update queue item to completed
        await supabaseAdmin
          .from('processing_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            notes: 'PDF processing skipped - no file provided'
          })
          .eq('id', item.id);
        
        // Set product status to ready
        await supabaseAdmin
          .from('products')
          .update({ status: 'ready' })
          .eq('id', item.product_id);
        
        return NextResponse.json(
          { 
            message: 'Skipped processing item with no file path', 
            itemId: item.id,
            productId: item.product_id
          },
          { status: 200, headers: corsHeaders }
        );
      }
      
      // Update status to processing
      await supabaseAdmin
        .from('processing_queue')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString() 
        })
        .eq('id', item.id);
      
      await supabaseAdmin
        .from('products')
        .update({ status: 'processing' })
        .eq('id', item.product_id);
      
      // Start processing in a non-awaited fashion so we can return quickly
      // This approach is a compromise for Vercel's limitations
      processPdf(item.product_id, item.file_path, item.id)
        .catch(error => {
          logger.error('Unhandled error in cron job PDF processing', { 
            error: error instanceof Error ? error.message : String(error),
            productId: item.product_id
          });
        });
      
      return NextResponse.json(
        { 
          message: 'PDF processing started via cron', 
          queueItems: queuedItems.length,
          processingItem: item.product_id
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      logger.error('Error in cron job processing', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return NextResponse.json(
        { error: 'Cron job processing failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500, headers: corsHeaders }
      );
    }
  }
  
  // Normal GET request (not a cron job)
  return NextResponse.json(
    { status: 'online', message: 'PDF Processing API is running' },
    { status: 200, headers: corsHeaders }
  );
}

// Helper function to log errors and return a consistent response
function handleApiError(error: any, message: string) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
  logger.error(message, { error: errorMsg, stack: stackTrace, memory: getMemoryUsage() });
  
  return NextResponse.json(
    { error: message, details: errorMsg },
    { status: 500, headers: corsHeaders }
  );
}

/**
 * Process a single PDF chunk with embedding
 */
async function processChunk(chunk: { content: string; metadata: any }, productId: string) {
  try {
    // Calculate chunk hash
    const chunkHash = Buffer.from(chunk.content.substring(0, 100)).toString('base64');
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not available for embedding generation');
      await supabaseAdmin.from('pdf_chunks').insert({
        product_id: productId,
        chunk_hash: chunkHash,
        content: chunk.content,
        token_start: 0,
        token_end: chunk.content.length,
        metadata: chunk.metadata
      });
      return false;
    }
    
    // Generate embedding using OpenAI
    logger.info('Generating embedding', { 
      contentLength: chunk.content.length,
      memory: getMemoryUsage()
    });
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk.content,
    });
    
    // Get the embedding vector
    const embedding = embeddingResponse.data[0].embedding;
    
    // Count tokens properly
    const tokenCount = countTokens(chunk.content);
    
    // Store chunk with embedding
    logger.info('Storing chunk with embedding', { tokenCount });
    const { error: insertError } = await supabaseAdmin.from('pdf_chunks').insert({
      product_id: productId,
      chunk_hash: chunkHash,
      content: chunk.content,
      embedding: embedding,
      token_start: 0,
      token_end: tokenCount,
      metadata: chunk.metadata
    });
    
    if (insertError) {
      logger.error(`Error storing chunk`, { error: insertError.message });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error processing chunk', { error });
    
    // Store chunk without embedding on error
    try {
      const chunkHash = Buffer.from(chunk.content.substring(0, 100)).toString('base64');
      await supabaseAdmin.from('pdf_chunks').insert({
        product_id: productId,
        chunk_hash: chunkHash,
        content: chunk.content,
        token_start: 0,
        token_end: chunk.content.length,
        metadata: chunk.metadata
      });
    } catch (insertError) {
      logger.error('Failed to store chunk without embedding', { error: insertError });
    }
    
    return false;
  }
}

/**
 * Process a PDF file asynchronously
 */
async function processPdf(productId: string, filePath: string, queueItemId: string) {
  logger.info('Processing PDF in background', { productId, queueItemId });
  
  try {
    // Verify if the filePath is a valid URL
    if (!filePath || filePath.trim() === '') {
      logger.info('No file path provided, skipping PDF processing', { productId });
      
      // Update product status to ready since there's no PDF to process
      await supabaseAdmin
        .from('products')
        .update({ status: 'ready' })
        .eq('id', productId);
        
      await supabaseAdmin
        .from('processing_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          notes: 'PDF processing skipped - no file provided'
        })
        .eq('id', queueItemId);
        
      return;
    }
    
    // Fetch file from URL
    let fileResponse;
    try {
      fileResponse = await fetch(filePath);
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      
      logger.info('Fetched PDF file');
    } catch (error) {
      const fetchError = error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching PDF file', { error: fetchError });
      
      // Update status to failed
      await supabaseAdmin
        .from('products')
        .update({ status: 'failed' })
        .eq('id', productId);
        
      await supabaseAdmin
        .from('processing_queue')
        .update({ status: 'failed', error: `Fetch error: ${fetchError.message}`, completed_at: new Date().toISOString() })
        .eq('id', queueItemId);
        
      return;
    }
    
    // Get file buffer
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    logger.info('Converted PDF to buffer', { size: `${Math.round(fileBuffer.length / 1024)}KB` });
    
    try {
      // Extract file name from URL
      const fileName = filePath.split('/').pop() || 'document.pdf';
      
      // Process the PDF into chunks
      logger.info('Processing PDF into chunks', { memory: getMemoryUsage() });
      const pdfChunks = await processPdfToChunks(fileBuffer, fileName);
      
      logger.info('Processed PDF into chunks', { 
        count: pdfChunks.length,
        memory: getMemoryUsage()
      });
      
      if (pdfChunks.length === 0) {
        throw new Error('No chunks were extracted from the PDF');
      }
      
      // Process chunks in smaller batches
      const batchSize = 2; // Reduced batch size for Vercel
      let successfulChunks = 0;
      
      for (let i = 0; i < pdfChunks.length; i += batchSize) {
        const batch = pdfChunks.slice(i, i + batchSize);
        logger.info('Processing batch', { 
          batchIndex: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(pdfChunks.length / batchSize),
          memory: getMemoryUsage()
        });
        
        // Process chunks in sequence to avoid memory spikes
        for (const chunk of batch) {
          const success = await processChunk(chunk, productId);
          if (success) successfulChunks++;
        }
        
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      logger.info('PDF processing complete', {
        productId,
        successfulChunks,
        totalChunks: pdfChunks.length
      });
      
      // Update product status to ready
      await supabaseAdmin
        .from('products')
        .update({ status: 'ready' })
        .eq('id', productId);
        
      // Update queue item status  
      await supabaseAdmin
        .from('processing_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          processed_chunks: successfulChunks,
          total_chunks: pdfChunks.length
        })
        .eq('id', queueItemId);
    } catch (processingError: any) {
      logger.error('Error processing PDF', { 
        error: processingError.message,
        stack: processingError.stack,
        memory: getMemoryUsage()
      });
      
      // Store a single error chunk
      try {
        const errorContent = `Error processing PDF: ${processingError.message || 'Unknown error'}`;
        
        if (process.env.OPENAI_API_KEY) {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: errorContent,
          });
          
          const errorChunkHash = Buffer.from(errorContent.substring(0, 100)).toString('base64');
          const tokenCount = countTokens(errorContent);
          
          await supabaseAdmin.from('pdf_chunks').insert({
            product_id: productId,
            chunk_hash: errorChunkHash,
            content: errorContent,
            embedding: embeddingResponse.data[0].embedding,
            token_start: 0,
            token_end: tokenCount,
            metadata: { page: 0, section: 'Error' }
          });
        } else {
          await supabaseAdmin.from('pdf_chunks').insert({
            product_id: productId,
            chunk_hash: Buffer.from(errorContent.substring(0, 100)).toString('base64'),
            content: errorContent,
            token_start: 0,
            token_end: errorContent.length,
            metadata: { page: 0, section: 'Error' }
          });
        }
      } catch (chunkError) {
        logger.error('Failed to store error chunk', { error: chunkError });
      }
      
      // Update product status to error
      await supabaseAdmin
        .from('products')
        .update({ status: 'error' })
        .eq('id', productId);
        
      // Update queue item status
      await supabaseAdmin
        .from('processing_queue')
        .update({ 
          status: 'error', 
          error: processingError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItemId);
    }
  } catch (error) {
    logger.error('Unhandled error in PDF processing', { 
      error: error instanceof Error ? error.message : String(error),
      productId
    });
    
    // Ensure product and queue are updated even in case of unexpected errors
    try {
      await supabaseAdmin
        .from('products')
        .update({ status: 'failed' })
        .eq('id', productId);
        
      await supabaseAdmin
        .from('processing_queue')
        .update({ 
          status: 'failed', 
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItemId);
    } catch (updateError) {
      logger.error('Failed to update statuses after error', { error: updateError });
    }
  }
}

export async function POST(request: NextRequest) {
  logger.info('PDF processing request received', { memory: getMemoryUsage() });
  
  try {
    // Parse the request body
    const body = await request.json();
    const { productId, filePath } = body;
    
    if (!productId || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, filePath' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if the filePath is a valid URL
    try {
      new URL(filePath);
    } catch (_e) {
      logger.warn('Invalid file path URL provided', { filePath });
      return NextResponse.json(
        { error: 'Invalid file path URL' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    logger.info('Processing PDF', { productId, filePath });
    
    // Get the queue item ID or create one if it doesn't exist
    let queueItemId;
    
    // Check if there's already a queue item for this product
    const { data: existingItems } = await supabaseAdmin
      .from('processing_queue')
      .select('id')
      .eq('product_id', productId)
      .limit(1);
    
    if (existingItems && existingItems.length > 0) {
      queueItemId = existingItems[0].id;
      
      // Update the queue item status
      await supabaseAdmin
        .from('processing_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          file_path: filePath // Update file path in case it changed
        })
        .eq('id', queueItemId);
    } else {
      // Create a new queue item
      const { data: newItem, error: insertError } = await supabaseAdmin
        .from('processing_queue')
        .insert({
          product_id: productId,
          status: 'processing',
          file_path: filePath,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (insertError || !newItem) {
        logger.error('Failed to create queue item', { error: insertError?.message });
        return NextResponse.json(
          { error: 'Failed to create queue item', details: insertError?.message },
          { status: 500, headers: corsHeaders }
        );
      }
      
      queueItemId = newItem.id;
    }
    
    // Start processing
    processPdf(productId, filePath, queueItemId)
      .catch(error => {
        logger.error('Unhandled error in PDF processing', { 
          error: error instanceof Error ? error.message : String(error),
          productId
        });
      });
    
    // Return success immediately
    return NextResponse.json(
      { 
        success: true, 
        productId,
        message: 'PDF processing started in the background'
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in PDF processing API');
  }
} 