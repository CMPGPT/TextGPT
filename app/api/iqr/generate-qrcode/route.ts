import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createQRCodeURL } from '@/utils/qrcode-helpers';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { productId, productName, businessId } = await req.json();
    
    if (!productId || !businessId) {
      return NextResponse.json(
        { error: 'Product ID and Business ID are required' },
        { status: 400 }
      );
    }

    // Format the QR code URL using our utility function
    const queryText = `${productName || ''} describe`;
    const qrUrl = createQRCodeURL(businessId, queryText);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Create a unique ID for the QR code
    const qrCodeId = uuidv4();
    
    // Store the QR code in the database
    const { data: qrCodeData, error: qrError } = await supabase
      .from('qr_codes')
      .insert({
        id: qrCodeId,
        product_id: productId,
        image_url: qrCodeDataUrl, // Ensure we set the image URL directly
        data: qrUrl,
      })
      .select()
      .single();
    
    if (qrError) {
      console.error('Error storing QR code:', qrError);
      
      // Try a two-step approach if the first one fails
      try {
        // First insert with an empty image URL
        await supabase
          .from('qr_codes')
          .insert({
            id: qrCodeId,
            product_id: productId,
            image_url: '', // The trigger will handle this
            data: qrUrl,
          });
        
        // Then immediately update with the image URL
        const { data: updatedQrCode, error: updateError } = await supabase
          .from('qr_codes')
          .update({ image_url: qrCodeDataUrl })
          .eq('id', qrCodeId)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        return NextResponse.json({
          success: true,
          qrCode: updatedQrCode || {
            id: qrCodeId,
            product_id: productId,
            image_url: qrCodeDataUrl,
            data: qrUrl
          }
        });
      } catch (fallbackError) {
        console.error('Fallback QR code insertion failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to store QR code even with fallback approach' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      qrCode: qrCodeData
    });
    
  } catch (error) {
    console.error('QR Code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
} 