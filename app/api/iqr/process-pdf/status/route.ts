import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/utils/logger';
import { supabaseAdmin } from '@/lib/supabase';

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

  try {
    // Fetch the product from the database
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('id, pdf_url, pdf_path, status')
      .eq('id', productId)
      .single();

    if (error) {
      logger.error('Error fetching product', { error: error.message, productId });
      return NextResponse.json(
        { error: 'Failed to fetch product status', message: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!product) {
      logger.warn('Product not found', { productId });
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if the product has a PDF associated with it
    if (!product.pdf_url || !product.pdf_path) {
      logger.info('Product has no PDF associated', { productId });
      return NextResponse.json(
        { 
          status: 'no_pdf', 
          message: 'No PDF associated with this product',
          productId
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Check if the file exists in Supabase storage
    try {
      // Try to get the file metadata from storage
      const { data: fileData, error: fileError } = await supabaseAdmin.storage
        .from('product-pdfs')
        .getPublicUrl(product.pdf_path);

      if (fileError) {
        logger.error('Error checking file in storage', { error: fileError, productId, pdfPath: product.pdf_path });
        return NextResponse.json(
          { 
            status: 'failed', 
            error: 'Failed to verify PDF file',
            productId
          },
          { status: 500, headers: corsHeaders }
        );
      }

      if (!fileData) {
        logger.warn('PDF file not found in storage', { productId, pdfPath: product.pdf_path });
        return NextResponse.json(
          { 
            status: 'failed', 
            error: 'PDF file not found in storage',
            productId
          },
          { status: 404, headers: corsHeaders }
        );
      }

      // File exists and processing completed successfully
      return NextResponse.json(
        { 
          status: 'completed', 
          pdfUrl: product.pdf_url,
          productId
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (storageError) {
      logger.error('Error accessing storage', { error: storageError, productId });
      return NextResponse.json(
        { 
          status: 'failed', 
          error: 'Error verifying PDF file in storage',
          productId
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    logger.error('Unexpected error checking PDF status', { error, productId });
    return NextResponse.json(
      { 
        status: 'failed', 
        error: 'Unexpected error checking PDF status',
        productId
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 