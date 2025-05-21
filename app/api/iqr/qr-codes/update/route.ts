import { NextRequest, NextResponse } from 'next/server';
import { updateEmptyQRCodeImages, updateQRCodeWithCustomURL } from '@/utils/qrcode-helpers';

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { qrCodeId, customURL } = body;
    
    // If a specific QR code ID and URL are provided, update just that one
    if (qrCodeId && customURL) {
      const result = await updateQRCodeWithCustomURL(qrCodeId, customURL);
      
      return NextResponse.json({
        ...result
      }, { headers: corsHeaders });
    }
    
    // If no specific QR code ID is provided, update all QR codes with empty images
    const result = await updateEmptyQRCodeImages();
    
    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      failed: result.failed
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in QR code update API:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error processing QR code update'
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Updates all QR codes that have empty image URLs
 * This is used to fix QR codes created by the database trigger
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check for authentication - optional based on your security model
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const _token = authHeader.substring(7);
      // Validate your token here if needed
    }

    // Update all empty QR code images
    const result = await updateEmptyQRCodeImages();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating empty QR code images:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 