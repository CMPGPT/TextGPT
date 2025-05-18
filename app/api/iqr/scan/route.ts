import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/utils/logger';

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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  logger.info('POST request received', { 
    contentType: request.headers.get('content-type'),
    memory: getMemoryUsage()
  });
  
  try {
    // Validate Supabase connection early
    if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
      logger.error('Supabase client initialization failed');
      return NextResponse.json(
        { error: 'Database connection error.', details: 'Supabase client initialization failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    let formData;
    try {
      formData = await request.formData();
      logger.info('Form data successfully parsed');
    } catch (error) {
      return handleApiError(error, 'Failed to parse form data');
    }

    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const file = formData.get('file') as File;
    const skipPdfCheck = formData.get('skipPdfCheck') === 'true';

    logger.info('Request parameters', { 
      businessId, 
      productName, 
      hasFile: !!file,
      skipPdfCheck,
      memory: getMemoryUsage()
    });

    if (!businessId || !productName) {
      logger.warn('Missing required fields', { businessId, productName });
      return NextResponse.json(
        { error: 'Missing required fields: businessId, productName' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    logger.info('Generated IDs', { productId, qrTextTag });

    // Create product entry
    let productError = null;
    
    try {
      logger.info('Creating product entry in database');
      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          id: productId,
          business_id: businessId,
          name: productName,
          description: productDescription || null,
          system_prompt: systemPrompt || null,
          qr_text_tag: qrTextTag,
          status: 'ready'
        });
      
      productError = error;
      
      if (error) {
        logger.error(`Product creation error`, { message: error.message });
      } else {
        logger.info(`Product created successfully`, { productId });
      }
    } catch (error) {
      logger.error('Error creating product', { error, memory: getMemoryUsage() });
      productError = error;
    }

    if (productError) {
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message || 'Database error'}` },
        { status: 500, headers: corsHeaders }
      );
    }

    // Upload PDF if provided
    let pdfUrl = null;
    let pdfPath = null;

    if (file && !skipPdfCheck) {
      try {
        // Check file type
        if (!file.type.includes('pdf')) {
          logger.warn('Invalid file type', { fileType: file.type });
          return NextResponse.json(
            { error: 'Only PDF files are allowed' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Check file size (max 10MB)
        const maxSizeMB = 10;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          logger.warn('File too large', { size: file.size, maxSize: maxSizeBytes });
          return NextResponse.json(
            { error: `File size exceeds maximum of ${maxSizeMB}MB` },
            { status: 400, headers: corsHeaders }
          );
        }

        // Generate a unique file name
        const fileId = uuidv4();
        const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        pdfPath = `products/${productId}/${fileId}_${fileName}`;

        // Get the file buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        logger.info('Uploading file to Supabase Storage', { pdfPath });
        const { error: uploadError } = await supabaseAdmin.storage
          .from('product-pdfs')
          .upload(pdfPath, fileBuffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          logger.error('File upload failed', { error: uploadError });
          // Continue without PDF as we've already created the product
        } else {
          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from('product-pdfs')
            .getPublicUrl(pdfPath);

          pdfUrl = urlData.publicUrl;
          
          // Update product with PDF URL
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({
              pdf_url: pdfUrl,
              pdf_path: pdfPath
            })
            .eq('id', productId);

          if (updateError) {
            logger.error('Failed to update product with PDF URL', { error: updateError });
            // Continue anyway, the PDF was uploaded
          }
          
          logger.info('PDF uploaded and linked to product', { productId, pdfUrl });
        }
      } catch (uploadError) {
        logger.error('Error processing PDF upload', { error: uploadError, memory: getMemoryUsage() });
        // Continue without PDF as we've already created the product
      }
    }

    // Determine the base URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? 'https://textg.pt' 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate the dynamic URL with product information and appropriate domain
    const encodedProductName = encodeURIComponent(productName);
    const chatUrl = `${baseUrl}/iqr/chat/${businessId}?sent=${encodedProductName}_describe`;

    logger.info(`Generated chat URL`, { chatUrl });

    // Create default QR code with dynamic URL
    let qrCreated = false;
    
    try {
      logger.info('Creating QR code entry');
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .insert({
          product_id: productId,
          image_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(chatUrl)}`,
          data: chatUrl
        });
      
      if (error) {
        logger.warn(`Failed to create QR code`, { error: error.message });
      } else {
        logger.info(`QR code created successfully`, { productId });
        qrCreated = true;
      }
    } catch (error) {
      logger.error('Error creating QR code', { error, memory: getMemoryUsage() });
    }

    // Always return a success response if we've made it this far
    logger.info('Sending successful response to client');
    return NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      qrCreated,
      pdfUploaded: !!pdfUrl,
      pdfUrl,
      message: 'Product and QR code created successfully.'
    }, { headers: corsHeaders });
    
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in scan API');
  }
} 