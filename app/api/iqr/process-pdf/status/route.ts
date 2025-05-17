import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:process-pdf:status');

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  logger.info('OPTIONS request received');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  
  logger.info('GET request received', { productId });
  
  if (!productId) {
    logger.warn('Missing productId parameter');
    return NextResponse.json(
      { error: 'Missing productId parameter' },
      { status: 400, headers: corsHeaders }
    );
  }

  // This is a simplified implementation that simulates checking the PDF processing status
  // In a real implementation, we would query a database or service to check the actual status
  // For our purposes, we'll simulate a check that always fails to trigger our dialog
  
  // Simulate that PDF processing has failed (this triggers our dialog)
  logger.warn('Simulating PDF processing failure for product', { productId });
  
  return NextResponse.json(
    { 
      status: 'failed', 
      error: 'PDF processing failed: Missing tiktoken_bg.wasm',
      productId
    },
    { status: 500, headers: corsHeaders }
  );
  
  // If we wanted to simulate a success, we would return a 200 response:
  /*
  return NextResponse.json(
    { 
      status: 'completed', 
      productId
    },
    { status: 200, headers: corsHeaders }
  );
  */
} 