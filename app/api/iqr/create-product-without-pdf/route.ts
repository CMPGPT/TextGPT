import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  console.log('OPTIONS request received for /api/iqr/create-product-without-pdf');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Helper function to log errors and return a consistent response
function handleApiError(error: any, message: string) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
  console.error(`${message}: ${errorMsg}`);
  console.error(`Stack trace: ${stackTrace}`);
  return NextResponse.json(
    { error: message, details: errorMsg },
    { status: 500, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  console.log('POST request received for /api/iqr/create-product-without-pdf');
  
  try {
    // Validate Supabase connection early
    if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
      console.error('Supabase client is not properly initialized');
      return NextResponse.json(
        { error: 'Database connection error', details: 'Supabase client initialization failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { businessId, productName, productDescription, systemPrompt } = body;

    console.log(`Received product creation request for business: ${businessId}, product: ${productName}`);

    if (!businessId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, productName' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    console.log(`Generated product ID: ${productId}, QR tag: ${qrTextTag}`);

    // Create placeholder URL (no actual PDF)
    const publicUrl = `https://placeholder-for-no-upload/${businessId}/${productId}/no-file`;

    // Create product entry without PDF
    let productError = null;
    
    try {
      console.log('Creating product entry in database');
      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          id: productId,
          business_id: businessId,
          name: productName,
          description: productDescription || null,
          system_prompt: systemPrompt || null,
          pdf_url: publicUrl,
          qr_text_tag: qrTextTag,
          status: 'ready' // Product is immediately ready since there's no PDF to process
        });
      
      productError = error;
      
      if (error) {
        console.error(`Product creation error: ${error.message}`);
      } else {
        console.log(`Product created successfully with ID: ${productId}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
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

    console.log(`Generated chat URL: ${chatUrl}`);

    // Create default QR code with dynamic URL
    let qrCreated = false;
    
    try {
      console.log('Creating QR code entry');
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .insert({
          product_id: productId,
          image_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(chatUrl)}`,
          data: chatUrl
        });
      
      if (error) {
        console.warn(`Failed to create QR code: ${error.message}`);
      } else {
        console.log(`QR code created successfully for product: ${productId}`);
        qrCreated = true;
      }
    } catch (error) {
      console.error('Error creating QR code:', error);
    }

    // Return success response
    console.log('Sending successful response to client');
    return NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      qrCreated,
      skipPdfCheck: true,
      message: 'Product created without PDF.'
    }, { headers: corsHeaders });
    
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in create-product-without-pdf API');
  }
} 