'use server';

import { createClient } from '@/lib/supabase/server';
import { 
  createAndStoreQRCode, 
  updateQRCodeWithCustomURL, 
  QRCodeResult,
  QRCodeUpdateResult,
  updateEmptyQRCodeImages
} from '@/utils/qrcode-helpers';
import crypto from 'crypto';

interface GenerateQRCodeParams {
  productId: string;
  productName: string;
  businessId: string;
  customQuery?: string;
}

/**
 * Generates a QR code for a product and stores it in the database
 */
export async function generateQRCodeForProduct({
  productId,
  productName,
  businessId,
  customQuery
}: GenerateQRCodeParams): Promise<QRCodeResult> {
  try {
    if (!productId || !businessId) {
      return {
        success: false,
        error: 'Product ID and Business ID are required'
      };
    }

    // Create and store QR code using the helper function
    const result = await createAndStoreQRCode({
      productId,
      productName,
      businessId,
      customQuery
    });

    // If QR code creation wasn't successful, try direct approach via server
    if (!result.success) {
      console.log('QR code creation failed via helper, trying direct server approach');
      
      const supabase = createClient();
      
      // Check if a QR code already exists
      const { data: existingQRCode } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('product_id', productId)
        .limit(1)
        .single();
      
      // Generate the QR code URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://textg.pt';
      const queryText = customQuery || `${productName || ''} describe`;
      const qrUrl = `${baseUrl}/iqr/chat/${businessId}?sent=${encodeURIComponent(queryText)}`;
      
      try {
        if (existingQRCode) {
          // Try to update using the RPC function
          await supabase.rpc('update_qr_code_direct', {
            p_qr_code_id: existingQRCode.id,
            p_image_url: 'pending-regeneration', // Placeholder that will be updated by the image service
            p_data: qrUrl
          });
        } else {
          // Create new QR code using the RPC function
          const qrCodeId = crypto.randomUUID();
          await supabase.rpc('insert_qr_code_direct', {
            p_id: qrCodeId,
            p_product_id: productId,
            p_image_url: 'pending-regeneration', // Placeholder that will be updated by the image service
            p_data: qrUrl
          });
        }
        
        // Call the empty image update function to fill in the image URL
        await updateEmptyQRCodeImages();
        
        return {
          success: true,
          data: {
            message: 'QR code created or updated via direct server method'
          }
        };
      } catch (rpcError) {
        console.error('Error with RPC functions:', rpcError);
        return { success: false, error: 'Failed to generate QR code with direct approach' };
      }
    }

    return result;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return { success: false, error: 'Failed to generate QR code' };
  }
}

/**
 * Fetches QR codes for a product from the database
 */
export async function getQRCodesForProduct(productId: string) {
  try {
    const supabase = createClient();
    
    const { data: qrCodes, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching QR codes:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: qrCodes || [] };
  } catch (error) {
    console.error('QR Code fetch error:', error);
    return { success: false, error: 'Failed to fetch QR codes' };
  }
}

/**
 * Updates a QR code with a custom URL
 */
export async function updateQRCodeWithURL(qrCodeId: string, customURL: string): Promise<QRCodeUpdateResult> {
  try {
    // Check for required parameters
    if (!qrCodeId) {
      return { success: false, error: 'QR code ID is required' };
    }
    
    if (!customURL) {
      return { success: false, error: 'Custom URL is required' };
    }
    
    // Use the helper function from utils/qrcode-helpers.ts
    const result = await updateQRCodeWithCustomURL(qrCodeId, customURL);
    
    // If the helper function succeeded, return its result
    if (result.success) {
      return result;
    }
    
    // Direct approach with server-side client if helper function failed
    console.log('Helper function failed, trying direct update with server client');
    
    const supabase = createClient();
    
    // Generate QR code image
    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(customURL, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Try direct update with both URL and image
    const { data: updateResult, error: updateError } = await supabase
      .from('qr_codes')
      .update({
        data: customURL,
        image_url: qrCodeDataUrl
      })
      .eq('id', qrCodeId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Direct update failed:', updateError);
      return {
        success: false,
        error: 'Failed to update QR code',
        details: updateError
      };
    }
    
    return { 
      success: true, 
      data: updateResult
    };
  } catch (error) {
    console.error('QR Code update error:', error);
    return { success: false, error: 'Failed to update QR code' };
  }
}

/**
 * Checks permissions for a QR code - helpful for debugging access issues
 */
export async function checkQRCodePermissions(qrCodeId: string) {
  try {
    const supabase = createClient();
    
    // First, get the QR code
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*, products:product_id(id, business_id, name)')
      .eq('id', qrCodeId)
      .single();
    
    if (qrError) {
      return { 
        success: false, 
        error: 'Failed to fetch QR code',
        details: qrError
      };
    }
    
    if (!qrCode) {
      return { success: false, error: 'QR code not found' };
    }
    
    // Now check if the logged-in user has access to the business
    const { data: userBusiness, error: userError } = await supabase
      .from('iqr_users')
      .select('business_id, role')
      .eq('business_id', qrCode.products.business_id)
      .single();
    
    if (userError) {
      return { 
        success: false, 
        error: 'Failed to check business access',
        details: userError
      };
    }
    
    const hasPermission = !!userBusiness;
    
    return { 
      success: true, 
      data: {
        hasPermission,
        qrCode,
        userAccess: userBusiness || null
      }
    };
  } catch (error) {
    console.error('QR Code permission check error:', error);
    return { 
      success: false, 
      error: 'Failed to check QR code permissions',
      details: error 
    };
  }
}

/**
 * Updates all QR codes that have empty image URLs
 * Can be called from dashboards or scheduled jobs
 */
export async function updateEmptyQRCodeImagesAction() {
  try {
    return await updateEmptyQRCodeImages();
  } catch (error) {
    console.error('Error updating empty QR code images via server action:', error);
    return { 
      success: false, 
      updated: 0,
      failed: 0,
      errors: [error] 
    };
  }
} 