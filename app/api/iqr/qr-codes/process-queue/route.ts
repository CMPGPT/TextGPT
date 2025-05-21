import { NextRequest, NextResponse } from 'next/server';
import { updateEmptyQRCodeImages } from '@/utils/qrcode-helpers';

// This route processes the queue of QR codes with empty image URLs
// It can be called by a scheduled function or manually
export async function GET(req: NextRequest) {
  try {
    // Support both auth header and query param for Vercel cron
    const authHeader = req.headers.get('authorization');
    const url = new URL(req.url);
    const secretParam = url.searchParams.get('secret');
    
    const isAuthorized = 
      (authHeader && authHeader.startsWith('Bearer ') && 
       authHeader.replace('Bearer ', '') === process.env.QR_CODE_UPDATE_SECRET) ||
      (secretParam && secretParam === process.env.QR_CODE_UPDATE_SECRET);
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    console.log('Processing QR code image queue');
    
    // Update all QR codes with empty images
    const result = await updateEmptyQRCodeImages();
    
    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      failed: result.failed,
      message: `Processed ${result.updated + result.failed} QR codes, ${result.updated} updated successfully`
    });
  } catch (error: any) {
    console.error('Error processing QR code queue:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 