import { fetchQRCodesForProduct } from '@/lib/iqr/qrcode';
import { NextResponse } from 'next/server';

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  const productId = params.productId;
  
  if (!productId) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    console.log(`API: Fetching QR codes for product ID: ${productId}`);
    
    // Use our helper function to fetch QR codes
    const result = await fetchQRCodesForProduct(productId);
    
    if (!result.success) {
      console.error('API: Error fetching QR codes:', result.error);
      return NextResponse.json(
        { error: 'Failed to fetch QR codes' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log(`API: Found ${result.data?.length || 0} QR codes for product ID: ${productId}`);
    
    return NextResponse.json({
      success: true,
      data: result.data || []
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('API: Unexpected error fetching QR codes:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
} 