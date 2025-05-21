import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/utils/logger';
import { uploadPdfToStorage } from '@/utils/pdf-direct-processing';
import { createAndStoreQRCode } from '@/utils/qrcode-helpers';

// Initialize logger
const logger = getLogger('api:iqr:scan');

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Add GET method to check API status (helpful for debugging)
export async function GET() {
  logger.info('GET request received');
  return NextResponse.json(
    { status: 'online', message: 'API is running' },
    { status: 200, headers: corsHeaders }
  );
}

// Helper function to log errors and return a consistent response
function _handleApiError(error: any, message: string) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
  logger.error(message, { error: errorMsg, stack: stackTrace, memory: getMemoryUsage() });
  
  return NextResponse.json(
    { error: message, details: errorMsg },
    { status: 500, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  logger.info('POST request received', {
    contentType: request.headers.get('content-type'),
    memory: getMemoryUsage(),
  });

  try {
    // Parse the form data
    const formData = await request.formData();
    logger.info('Form data successfully parsed');

    // Extract parameters from the form data
    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string || '';
    const systemPrompt = formData.get('systemPrompt') as string || '';
    const file = formData.get('file') as File;
    const skipPdfCheck = formData.get('skipPdfCheck') === 'true';

    // Validate required parameters
    logger.info('Request parameters', {
      businessId,
      productName,
      hasDescription: !!productDescription,
      hasSystemPrompt: !!systemPrompt,
      hasFile: !!file,
      skipPdfCheck,
      memory: getMemoryUsage(),
    });

    if (!businessId || (!file && !skipPdfCheck)) {
      logger.warn('Missing required parameters', { businessId, hasFile: !!file, skipPdfCheck });
      return NextResponse.json(
        { error: 'Business ID and PDF file are required (unless skipPdfCheck is true)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')}`;

    logger.info('Generated IDs', { productId, qrTextTag });

    // Create product entry in database
    logger.info('Creating product entry in database');
    
    const { error: productError } = await supabaseAdmin.from('products').insert({
      id: productId,
      business_id: businessId,
      name: productName,
      description: productDescription,
      system_prompt: systemPrompt,
      qr_text_tag: qrTextTag,
      pdf_processing_status: 'pending', // Initial status for PDF processing
    });

    if (productError) {
      logger.error('Product creation error', { message: productError.message });
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    // If file is provided, upload it to storage
    if (file) {
      logger.info('File provided, uploading to storage', { fileName: file.name, fileSize: file.size });

      const uploadResult = await uploadPdfToStorage(file, {
        productId,
        businessId,
        serviceType: 'iqr_scan',
      });

      logger.info('Upload result details', { 
        success: uploadResult.success, 
        fileUrl: uploadResult.fileUrl,
        path: uploadResult.path,
        status: uploadResult.status
      });

      if (!uploadResult.success) {
        logger.error('File upload error', { error: uploadResult.error });
        
        // Update product status to failed
        await supabaseAdmin
          .from('products')
          .update({ pdf_processing_status: 'upload_failed' })
          .eq('id', productId);
          
        return NextResponse.json(
          { error: `File upload failed: ${uploadResult.error}` },
          { status: 500, headers: corsHeaders }
        );
      }

      logger.info('File uploaded successfully', { path: uploadResult.path });

      // Update product with PDF URL and path
      const { data: updatedProduct, error: updateError } = await supabaseAdmin
        .from('products')
        .update({ 
          pdf_url: uploadResult.fileUrl,
          pdf_path: uploadResult.path,
          pdf_processing_status: 'uploaded' // Explicitly set status to uploaded
        })
        .eq('id', productId)
        .select('id, pdf_url, pdf_path')
        .single();

      if (updateError) {
        logger.error('Error updating product with PDF info', { error: updateError.message });
        // Continue anyway since the file was uploaded
      } else {
        logger.info('Product updated with PDF info', { 
          productId, 
          updatedUrl: updatedProduct?.pdf_url,
          updatedPath: updatedProduct?.pdf_path 
        });
      }
    }

    // Create QR code entry
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://textg.pt';
    const qrLink = `${baseUrl}/iqr/chat/${qrTextTag}`;
    
    const qrCodeResult = await createAndStoreQRCode({
      productId,
      productName,
      businessId,
      qrTextTag
    });
    
    if (!qrCodeResult.success) {
      logger.error('QR code creation error', { error: qrCodeResult.error });
      // Continue anyway since the product was created successfully
    } else {
      logger.info('QR code created successfully', { 
        qrCodeId: qrCodeResult.data?.id,
        qrUrl: qrCodeResult.data?.data
      });
    }

    // Return success response
    logger.info('Product and QR code created successfully', { 
      productId, 
      qrTextTag,
      hasDescription: !!productDescription,
      hasSystemPrompt: !!systemPrompt
    });
    
    return NextResponse.json(
      {
        success: true,
        productId,
        qrCodeUrl: qrCodeResult.success ? qrCodeResult.data?.image_url : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrLink)}`,
        qrTextTag,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Unexpected error in scan API', { error });
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
} 