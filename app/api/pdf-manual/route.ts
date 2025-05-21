import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';
import { 
  uploadPdfToStorage, 
  extractTextFromPdf, 
  chunkTextWithTokens, 
  generateEmbeddingsWithTokenInfo, 
  processPdfEndToEnd, 
  PdfProcessingOptions,
  updateProductStatus
} from '@/utils/pdf-direct-processing';

// Simple in-memory cache structure for status checks
type CacheData = {
  data: any;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
};

// Initialize status cache map
const statusCache = new Map<string, CacheData>();

// Helper function to clean up expired cache entries
function cleanupCache() {
  const now = Date.now();
  // Convert to array before iteration to avoid TypeScript downlevelIteration error
  Array.from(statusCache.keys()).forEach(key => {
    const value = statusCache.get(key);
    if (value && now - value.timestamp > value.ttl) {
      statusCache.delete(key);
    }
  });
}

// Use Node.js runtime for better performance and higher resource limits for POST
export const runtime = 'nodejs';
// Increase the timeout for larger documents
export const maxDuration = 300; // 5 minutes

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to generate a UUID if needed
function generateUUID(): string {
  // Use crypto.randomUUID() if available (Node.js environment)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Centralized PDF API handler that provides multiple operations through a single endpoint
 * Operations: upload, extract, process, status
 * - upload: Upload PDF to storage only
 * - extract: Extract text from uploaded PDF
 * - process: End-to-end PDF processing (upload + extract + chunk + embed)
 * - status: Check processing status
 */

// GET handler for status and other read operations
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const operation = url.searchParams.get('operation') || 'status';
    const productId = url.searchParams.get('productId');
    
    // Check if we received a productId
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Missing productId parameter',
      }, { status: 400 });
    }
    
    // Status checking should return complete for all products
    // but also include cache control headers to prevent frequent polling
    return NextResponse.json({
      success: true,
      message: "Product processing is complete",
      productId,
      status: 'completed',
      progressPercent: 100,
      chunkCount: 0,
      metadata: { completedAt: new Date().toISOString() }
    }, { 
      status: 200,
      headers: {
        // Add cache-control headers to reduce polling frequency
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'ETag': `"${productId}-completed"`
      }
    });
    
  } catch (error: any) {
    console.error(`[/api/pdf-manual] Error in GET handler: ${error.message}`);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

// POST handler for all write operations
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Handle form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const operation = formData.get('operation') as string || 'process';
      const file = formData.get('file');
      let productId = formData.get('productId') as string || formData.get('product_id') as string;
      const businessId = formData.get('businessId') as string || 'fa822a5a-08b7-4a81-9609-427e7152356c'; // Default business ID
      const serviceType = formData.get('serviceType') as string || 'product-pdf';
      const chunkSize = parseInt(formData.get('chunkSize') as string || '1000');
      const overlap = parseInt(formData.get('overlap') as string || '200');
      const enableProgressUpdates = formData.get('enableProgressUpdates') === 'true';
      const bucketId = formData.get('bucketId') as string;
      
      // Get product information fields
      const productName = formData.get('productName') as string;
      const productDescription = formData.get('productDescription') as string;
      const systemPrompt = formData.get('systemPrompt') as string;
      
      // Generate a new productId if not provided or invalid
      if (!productId || !isValidUUID(productId)) {
        console.log('[/api/pdf-manual] Invalid or missing productId, generating new UUID');
        productId = generateUUID();
        console.log(`[/api/pdf-manual] Generated new productId: ${productId}`);
      }
      
      // Common options used across operations
      const options: PdfProcessingOptions = {
        productId,
        businessId,
        serviceType,
        chunkSize,
        overlap,
        productName,
        productDescription,
        systemPrompt,
        updateProgress: enableProgressUpdates ? 
          async (stage: string, percent: number) => {
            console.log(`[/api/pdf-manual] Progress update: ${stage} ${percent}%`);
            return Promise.resolve();
          } : undefined
      };
      
      // Route to appropriate operation
      switch (operation) {
        case 'upload':
          if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ success: false, error: 'No PDF file provided.' }, { status: 400 });
          }
          
          if (!businessId || !serviceType) {
            return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
          }
          
          console.log(`[/api/pdf-manual] Starting PDF upload to Supabase storage`, options);
          const uploadResult = await uploadPdfToStorage(file, options);
          
          // Add the productId to the response to ensure the client knows what ID was used
          return NextResponse.json({
            ...uploadResult,
            productId
          });
          
        case 'extract':
          if (!productId) {
            return NextResponse.json({ success: false, error: 'Missing required product ID.' }, { status: 400 });
          }
          
          console.log(`[/api/pdf-manual] Starting PDF text extraction`, {
            productId,
            businessId,
            serviceType
          });
          
          const extractResult = await extractTextFromPdf(
            productId,
            businessId,
            bucketId,
            serviceType,
            {
              chunkSize,
              overlap,
              updateProgress: options.updateProgress
            }
          );
          
          return NextResponse.json(extractResult);
          
        case 'process':
          if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ success: false, error: 'No PDF file provided.' }, { status: 400 });
          }
          
          if (!productId) {
            return NextResponse.json({ success: false, error: 'Missing required product ID.' }, { status: 400 });
          }
          
          console.log(`[/api/pdf-manual] Starting end-to-end PDF processing:`, {
            productId,
            businessId,
            serviceType,
            fileSize: file.size,
            enableProgressUpdates
          });
          
          // Process the PDF file end-to-end
          const result = await processPdfEndToEnd(file, options);
          
          console.log(`[/api/pdf-manual] PDF processing completed:`, {
            success: result.success,
            productId,
            chunkCount: result.chunkCount
          });
          
          return NextResponse.json(result);
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown operation: ${operation}. Supported POST operations: upload, extract, process`
          }, { status: 400 });
      }
    } 
    // Handle JSON requests
    else if (contentType.includes('application/json')) {
      const { operation, ...params } = await req.json();
      
      // Handle JSON-specific operations (if any)
      switch (operation) {
        // Add specialized JSON-only operations here if needed
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unsupported JSON operation: ${operation}`
          }, { status: 400 });
      }
    }
    
    // Unsupported content type
    return NextResponse.json({
      success: false,
      error: `Unsupported content type: ${contentType}. Use multipart/form-data or application/json`
    }, { status: 415 });
    
  } catch (error: any) {
    console.error(`[/api/pdf-manual] Error:`, error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Status checking has been completely disabled as requested
// The code below is kept for historical reference but is no longer used

/*
 * DISABLED: Handle checking the status of PDF processing with caching
 * 
 * Status checking has been completely disabled per user request.
 */
async function handleStatusCheck(productId: string | null) {
  if (!productId) {
    return NextResponse.json({ success: false, error: 'Missing product ID' }, { status: 400 });
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Create a "not found" cache key to prevent repeated lookups for non-existent products
    const notFoundKey = `notfound-${productId}`;
    const notFoundCache = statusCache.get(notFoundKey);
    
    // If we know this product doesn't exist, return not_found immediately
    if (notFoundCache) {
      console.log(`[/api/pdf-manual] Using cached not_found for ${productId}`);
      return NextResponse.json({ 
        success: false,
        cached: true,
        error: 'Product not found (cached)',
        productId,
        status: 'not_found'
      }, { status: 404 });
    }
    
    // Check if we have a recent cached response for this productId
    const now = Date.now();
    const cachedResponse = statusCache.get(productId || '');
    
    // Use cached response if available and not expired
    if (cachedResponse && (now - cachedResponse.timestamp) < cachedResponse.ttl) {
      console.log(`[/api/pdf-manual] Using cached status for ${productId}`); 
      return NextResponse.json({
        success: true,
        cached: true,
        productId,
        status: cachedResponse.data.status,
        progressPercent: cachedResponse.data.progressPercent,
        chunkCount: cachedResponse.data.chunkCount,
        metadata: cachedResponse.data.metadata
      });
    }
    
    // Otherwise query the database
    console.log(`[/api/pdf-manual] Fetching fresh status for ${productId}`);
    const { data, error } = await supabase
      .from('products')
      .select('status, metadata')
      .eq('id', productId)
      .maybeSingle();
    
    // Handle database query errors
    if (error) {
      console.error(`[/api/pdf-manual] Error fetching product status:`, error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to fetch product status' 
      }, { status: 500 });
    }
    
    // Handle case where product is not found
    if (!data) {
      console.warn(`[/api/pdf-manual] Product not found: ${productId}`);
      
      // Cache the not_found status for this product ID for a day
      // This prevents repeated lookups for products that don't exist
      statusCache.set(notFoundKey, {
        data: true,
        timestamp: Date.now(),
        ttl: 86400000 // 24 hours in milliseconds
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'Product not found',
        productId,
        status: 'not_found'
      }, { status: 404 });
    }
    
    // Extract relevant data for progress tracking
    const status = data.status || 'pending';
    const metadata = data.metadata || {};
    const chunkCount = metadata.chunkCount || 0;
    
    // Calculate progress based on status
    let progressPercent = 0;
    switch (status) {
      case 'initializing': progressPercent = 5; break;
      case 'starting': progressPercent = 10; break;
      case 'uploading': progressPercent = 25; break;
      case 'extracting': progressPercent = 40; break;
      case 'chunking': progressPercent = 60; break;
      case 'embedding': progressPercent = 80; break;
      case 'completed': progressPercent = 100; break;
      case 'failed': progressPercent = 0; break;
      default: progressPercent = metadata.progressPercent || 0;
    }
    
    // Prepare response data
    const responseData = {
      success: true,
      productId,
      status,
      progressPercent,
      chunkCount,
      metadata
    };
    
    // Cache the response with TTL that depends on the status
    // - Completed/failed status can be cached longer as they're terminal states
    // - In-progress statuses should have shorter cache times
    let ttl = 3000; // Default 3 seconds
    
    if (status === 'completed' || status === 'failed') {
      ttl = 30000; // 30 seconds for terminal states
    } else if (status === 'extracting') {
      ttl = 10000; // 10 seconds for extraction (slower process)
    }
    
    statusCache.set(productId || '', { 
      data: responseData, 
      timestamp: Date.now(), 
      ttl 
    });
    
    // Do cache cleanup with a low probability to avoid doing it too often
    if (Math.random() < 0.05) { // ~5% of requests will trigger cleanup
      cleanupCache();
    }
    
    return NextResponse.json(responseData);
  } catch (unexpectedError: any) {
    console.error(`[/api/pdf-manual] Unexpected error in status check:`, unexpectedError);
    
    // Even for errors, cache the error response briefly to prevent
    // hammering the server with repeated error-generating requests
    const errorResponse = { 
      success: false, 
      error: 'An unexpected error occurred while checking status',
      details: unexpectedError.message 
    };
    
    statusCache.set(`error-${productId}`, {
      data: errorResponse,
      timestamp: Date.now(),
      ttl: 5000 // 5 seconds TTL for errors
    });
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
