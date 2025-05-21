import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateEmptyQRCodeImages } from '@/utils/qrcode-helpers';

// This route handles updating QR codes with missing images
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Simple API key check for security
    if (!authHeader || !authHeader.startsWith('Bearer ') || 
        authHeader.replace('Bearer ', '') !== process.env.QR_CODE_UPDATE_SECRET) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const body = await req.json();
    const { productId } = body;
    
    // If a product ID is provided, only update that specific product
    if (productId) {
      const supabase = createClient();
      
      // Find QR codes with empty image URLs for this product
      const { data: qrCodes, error } = await supabase
        .from('qr_codes')
        .select('id, data')
        .eq('product_id', productId)
        .eq('image_url', '');
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
      
      // If no QR codes need updating, return success
      if (!qrCodes || qrCodes.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No QR codes with empty images found for this product',
          updated: 0
        });
      }
      
      // Call the helper function to update QR codes
      const result = await updateEmptyQRCodeImages();
      
      return NextResponse.json({
        success: result.success,
        updated: result.updated,
        failed: result.failed,
        product_id: productId
      });
    }
    
    // Update all QR codes with empty images
    const result = await updateEmptyQRCodeImages();
    
    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      failed: result.failed
    });
  } catch (error: any) {
    console.error('Error updating QR codes:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 