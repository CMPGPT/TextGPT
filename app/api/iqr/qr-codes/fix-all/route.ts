import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';

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
    
    const supabase = createClient();
    
    // Find QR codes with empty image URLs
    const { data: qrCodes, error: fetchError } = await supabase
      .from('qr_codes')
      .select('id, data')
      .eq('image_url', '')
      .limit(100); // Process in batches to avoid timeouts
    
    if (fetchError) {
      console.error('Error fetching empty QR codes:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 });
    }
    
    if (!qrCodes || qrCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No QR codes with empty images found',
        updated: 0
      });
    }
    
    console.log(`Found ${qrCodes.length} QR codes with empty images to fix`);
    
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as any[]
    };
    
    // Generate and update images for each QR code
    for (const qrCode of qrCodes) {
      try {
        if (!qrCode.data) {
          results.failed++;
          results.errors.push({
            id: qrCode.id,
            error: 'Missing data URL'
          });
          continue;
        }
        
        // Generate QR code image
        const qrCodeDataUrl = await QRCode.toDataURL(qrCode.data, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        
        // Update the QR code image directly in the database
        const { error: updateError } = await supabase
          .from('qr_codes')
          .update({ image_url: qrCodeDataUrl })
          .eq('id', qrCode.id);
        
        if (updateError) {
          console.error(`Error updating QR code image for ID ${qrCode.id}:`, updateError);
          results.failed++;
          results.errors.push({
            id: qrCode.id,
            error: updateError
          });
        } else {
          console.log(`Fixed QR code image for ID ${qrCode.id}`);
          results.updated++;
        }
      } catch (error) {
        console.error(`Error processing QR code ID ${qrCode.id}:`, error);
        results.failed++;
        results.errors.push({
          id: qrCode.id,
          error
        });
      }
    }
    
    // If there are still more QR codes to process, send a follow-up request
    if (qrCodes.length === 100) {
      try {
        // Make a self-request to continue processing
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        await fetch(`${baseUrl}/api/iqr/qr-codes/fix-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.QR_CODE_UPDATE_SECRET}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Sent follow-up request to continue processing QR codes');
      } catch (error) {
        console.error('Error sending follow-up request:', error);
      }
    }
    
    return NextResponse.json({
      success: results.failed === 0,
      updated: results.updated,
      failed: results.failed,
      remaining: qrCodes.length === 100 ? 'more' : 0,
      errors: results.errors.length > 0 ? results.errors.slice(0, 5) : undefined // Only show first 5 errors
    });
  } catch (error: any) {
    console.error('Error fixing QR codes:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 