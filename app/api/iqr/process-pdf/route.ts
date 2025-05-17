import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

// Add GET method to check API status or trigger processing for a specific product
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');
  
  // If no productId is provided, just return API status
  if (!productId) {
    return NextResponse.json(
      { status: 'online', message: 'PDF Processing API is running' },
      { status: 200, headers: corsHeaders }
    );
  }
  
  // If productId is provided, try to find and process the product
  logger.info('Triggered PDF processing for product', { productId });
  
  try {
    // Find the product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('pdf_url, status')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      logger.error('Product not found', { productId, error: productError?.message });
      return NextResponse.json(
        { error: 'Product not found', details: productError?.message },
        { status: 404, headers: corsHeaders }
      );
    }
    
    if (!product.pdf_url) {
      logger.warn('No PDF URL found for product', { productId });
      return NextResponse.json(
        { error: 'Product has no PDF URL', productId },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Create a new queue item
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('processing_queue')
      .insert({
        product_id: productId,
        status: 'queued',
        file_path: product.pdf_url,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (queueError || !queueItem) {
      logger.error('Failed to create queue item', { productId, error: queueError?.message });
      return NextResponse.json(
        { error: 'Failed to create queue item', details: queueError?.message },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Update product status to processing
    await supabaseAdmin
      .from('products')
      .update({ status: 'processing' })
      .eq('id', productId);
    
    // Start processing in the background
    const { processPdf } = await import('./processPdfUtil');
    
    // Process in background without blocking the response
    processPdf(productId, product.pdf_url, queueItem.id)
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
        message: 'PDF processing started in the background',
        queueItemId: queueItem.id
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return handleApiError(error, 'Error triggering PDF processing');
  }
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
    
    // Ensure processing_queue table exists
    try {
      await supabaseAdmin.query(`
        CREATE TABLE IF NOT EXISTS processing_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          product_id UUID NOT NULL REFERENCES products(id),
          status TEXT NOT NULL DEFAULT 'queued',
          file_path TEXT NOT NULL,
          error TEXT,
          processed_chunks INTEGER,
          total_chunks INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_processing_queue_product_id ON processing_queue (product_id);
        CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue (status);
      `);
    } catch (tableError) {
      logger.warn('Error checking processing_queue table', { error: tableError });
      // Continue execution, as the table might already exist
    }
    
    // Get the queue item ID or create one if it doesn't exist
    let queueItemId;
    
    // Check if there's already a queue item for this product
    const { data: existingItems, error: queryError } = await supabaseAdmin
      .from('processing_queue')
      .select('id')
      .eq('product_id', productId)
      .limit(1);
    
    if (queryError) {
      logger.error('Error querying processing_queue', { error: queryError.message });
    }
    
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
    
    // Update product status to processing
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ status: 'processing' })
      .eq('id', productId);
      
    if (updateError) {
      logger.error('Failed to update product status', { error: updateError.message });
    }
    
    // Start processing
    const { processPdf } = await import('./processPdfUtil');
    
    // Process in background without blocking the response
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