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

    const file = formData.get('file') as File | null;
    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const skipPdfCheck = formData.get('skipPdfCheck') === 'true';

    logger.info('Request parameters', { 
      businessId, 
      productName, 
      hasFile: !!file, 
      skipPdfCheck,
      fileType: file?.type,
      memory: getMemoryUsage()
    });

    if (!businessId || !productName) {
      logger.warn('Missing required fields', { businessId, productName });
      return NextResponse.json(
        { error: 'Missing required fields: businessId, productName' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for file only if skipPdfCheck is false
    if (!skipPdfCheck && !file) {
      logger.warn('Missing required file');
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate the file is a PDF if it exists
    if (file && !file.type.includes('pdf') && !skipPdfCheck) {
      logger.warn(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'Uploaded file must be a PDF' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    logger.info('Generated IDs', { productId, qrTextTag });

    // Variables for file processing
    let uploadError = null;
    let publicUrl = '';
    
    // Only process file upload if a file was provided
    if (file && !skipPdfCheck) {
      // 1. Upload file to Supabase Storage
      try {
        const fileBuffer = await file.arrayBuffer();
        logger.info(`Processing PDF file`, { 
          name: file.name, 
          size: `${Math.round(fileBuffer.byteLength / 1024)}KB`,
          memory: getMemoryUsage()
        });
      
        // Use a simpler approach for storage buckets to reduce potential issues
        const bucketName = 'iqr-pdfs';
        const filePath = `pdfs/${businessId}/${productId}/${file.name}`;
        
        logger.info(`Using storage bucket`, { bucketName, filePath });
        
        try {
          logger.info(`Uploading file`, { bucketName, filePath });
          const { data: _uploadData, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
              contentType: file.type,
              upsert: true,
            });
          
          uploadError = error;
          
          if (!error) {
            logger.info('File upload successful');
            const { data } = supabaseAdmin.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            
            publicUrl = data.publicUrl;
            logger.info(`Generated public URL`, { publicUrl });
          } else {
            logger.error(`Storage upload error`, { message: error.message });
          }
        } catch (error) {
          logger.error('Error during file upload', { error, memory: getMemoryUsage() });
          uploadError = error;
        }
      } catch (fileError) {
        logger.error('Error reading file buffer', { error: fileError, memory: getMemoryUsage() });
        uploadError = fileError;
      }
    } else {
      logger.info('No file provided or PDF check skipped');
      publicUrl = `https://placeholder-for-no-upload/${businessId}/${productId}/no-file`;
    }

    // 2. Create product entry regardless of upload success
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
          pdf_url: publicUrl || null,
          qr_text_tag: qrTextTag,
          status: !file || skipPdfCheck ? 'ready' : (uploadError ? 'error' : 'pending_processing')
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

    // Determine the base URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? 'https://textg.pt' 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate the dynamic URL with product information and appropriate domain
    const encodedProductName = encodeURIComponent(productName);
    const chatUrl = `${baseUrl}/iqr/chat/${businessId}?sent=${encodedProductName}_describe`;

    logger.info(`Generated chat URL`, { chatUrl });

    // 3. Create default QR code with dynamic URL
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

    // 4. Queue PDF processing in background worker instead of processing directly
    if (!uploadError && file && !skipPdfCheck) {
      try {
        // Create an entry in a processing queue to be picked up by a background worker
        await supabaseAdmin
          .from('processing_queue')
          .insert({
            product_id: productId,
            status: 'queued',
            file_path: publicUrl,
            created_at: new Date().toISOString()
          });
          
        logger.info('Added PDF to processing queue', { productId });
        
        // Trigger background processing via a webhook if available
        try {
          const webhookUrl = process.env.PDF_PROCESSING_WEBHOOK_URL;
          if (webhookUrl) {
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId, filePath: publicUrl })
            }).catch(e => logger.warn('Failed to trigger processing webhook', { error: e }));
            logger.info('Triggered PDF processing webhook');
          }
        } catch (webhookError) {
          logger.warn('Error triggering processing webhook', { error: webhookError });
          // Non-critical, so continue
        }
      } catch (queueError) {
        logger.error('Failed to queue PDF processing', { error: queueError });
        // Update product status to indicate queuing failed
        await supabaseAdmin
          .from('products')
          .update({ status: 'queue_failed' })
          .eq('id', productId);
      }
    }

    // Always return a success response if we've made it this far
    logger.info('Sending successful response to client');
    return NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      qrCreated,
      uploadSuccess: !uploadError && !!file,
      skipPdfCheck: skipPdfCheck,
      message: !file || skipPdfCheck 
        ? 'Product created without PDF.' 
        : (uploadError 
          ? 'Product created but file upload failed. PDF processing skipped.' 
          : 'Product created successfully. PDF will be processed in the background.')
    }, { headers: corsHeaders });
    
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in scan API');
  }
} 