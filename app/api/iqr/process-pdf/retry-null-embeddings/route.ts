import { NextRequest, NextResponse } from 'next/server';
import { initVectorDB } from '@/utils/vectorDB';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:retry-null-embeddings');

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export async function GET(request: NextRequest) {
  logger.info('Processing null embeddings request received');
  
  try {
    const batchSizeParam = request.nextUrl.searchParams.get('batchSize');
    const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 10;
    
    // Ensure batch size is reasonable
    const processSize = Math.min(Math.max(batchSize, 1), 50);
    
    // Initialize vector DB
    const vectorDB = initVectorDB();
    
    // Process null embeddings
    const result = await vectorDB.processNullEmbeddings(processSize);
    
    return NextResponse.json(
      { 
        success: result,
        message: result 
          ? `Successfully processed batch of ${processSize} null embeddings` 
          : 'No null embeddings to process or processing failed'
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Error in processing null embeddings', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error processing null embeddings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 