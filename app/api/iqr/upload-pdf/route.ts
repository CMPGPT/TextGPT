import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/utils/logger';
import { S3Client } from '@aws-sdk/client-s3';

// Initialize logger
const logger = getLogger('api:iqr:upload-pdf');

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Initialize S3 client with the provided credentials
const _s3Client = new S3Client({
  region: 'us-east-1', // Adjust to your region
  credentials: {
    accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY || '',
  }
});

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  logger.info('OPTIONS request received');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  logger.info('POST request received', { 
    contentType: request.headers.get('content-type'),
  });
  
  try {
    // Check S3 credentials
    if (!process.env.SUPABASE_ACCESS_KEY_ID || !process.env.SUPABASE_SECRET_ACCESS_KEY) {
      logger.error('S3 credentials missing');
      return NextResponse.json(
        { error: 'S3 configuration error: missing credentials' },
        { status: 500, headers: corsHeaders }
      );
    }

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
      logger.error('Failed to parse form data', { error });
      return NextResponse.json(
        { error: 'Failed to parse form data' },
        { status: 400, headers: corsHeaders }
      );
    }

    const file = formData.get('file') as File;
    const serviceType = formData.get('serviceType') as string;
    const businessId = formData.get('businessId') as string;
    const productId = formData.get('productId') as string;

    logger.info('File upload request received', { 
      fileName: file?.name, 
      serviceType,
      businessId,
      productId,
      fileSize: file?.size
    });

    if (!file) {
      logger.warn('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (serviceType !== 'iqr') {
      logger.warn('Invalid service type', { serviceType });
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400, headers: corsHeaders }
      );
    }

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

    // Generate a unique file ID
    const fileId = uuidv4();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Define the storage path
    let storagePath;
    if (productId) {
      storagePath = `products/${productId}/${fileId}_${fileName}`;
    } else if (businessId) {
      storagePath = `businesses/${businessId}/${fileId}_${fileName}`;
    } else {
      storagePath = `uploads/${serviceType}/${fileId}_${fileName}`;
    }

    try {
      // Get the file buffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Direct upload to Supabase storage
      const { error: uploadError, data: _data } = await supabaseAdmin.storage
        .from('product-pdfs')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        logger.error('Supabase upload failed', { error: uploadError });
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500, headers: corsHeaders }
        );
      }

      // Get the public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('product-pdfs')
        .getPublicUrl(storagePath);

      logger.info('File uploaded successfully', { 
        path: storagePath, 
        publicUrl: urlData.publicUrl 
      });

      // If productId is provided, update the product with the PDF URL
      if (productId) {
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            pdf_url: urlData.publicUrl,
            pdf_path: storagePath
          })
          .eq('id', productId);

        if (updateError) {
          logger.error('Failed to update product with PDF URL', { error: updateError });
          // Continue anyway since the file was uploaded
        }
      }

      return NextResponse.json({
        success: true,
        fileUrl: urlData.publicUrl,
        filePath: storagePath
      }, { headers: corsHeaders });

    } catch (error) {
      logger.error('File upload failed', { error });
      return NextResponse.json(
        { error: 'File upload failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    logger.error('Unexpected error in upload-pdf API', { error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
} 