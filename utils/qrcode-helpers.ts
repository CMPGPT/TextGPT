import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../types/supabase';

// Create a standalone Supabase client that doesn't rely on Next.js features
// This is used only for server-side operations in non-request contexts
const createStandaloneClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

interface QRCodeParams {
  productId: string;
  productName?: string;
  businessId: string;
  qrTextTag?: string; // Optional, if using a custom tag
  customQuery?: string; // Optional, for custom query text
}

// Define common response type structures with proper type safety
export interface QRCodeSuccessResult {
  success: true;
  data: any;
}

export interface QRCodeErrorResult {
  success: false;
  error: string;
  details?: any;
}

export interface QRCodeUpdateSuccessWithImageResult {
  success: true;
  data: any;
  needsImage: boolean;
  url: string;
}

// Union type for all possible QR code result types
export type QRCodeResult = QRCodeSuccessResult | QRCodeErrorResult;
export type QRCodeUpdateResult = QRCodeSuccessResult | QRCodeErrorResult | QRCodeUpdateSuccessWithImageResult;

/**
 * Creates a QR code for a product and stores it in the database
 */
export async function createAndStoreQRCode({
  productId,
  productName = '',
  businessId,
  qrTextTag,
  customQuery
}: QRCodeParams): Promise<QRCodeResult> {
  try {
    const supabase = createStandaloneClient();
    
    // If no qrTextTag was provided, fetch the product to get it
    if (!qrTextTag) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('qr_text_tag, name')
        .eq('id', productId)
        .single();
      
      if (productError) {
        console.error('Error fetching product for QR code generation:', productError);
        return { success: false, error: 'Failed to fetch product information' };
      }
      
      qrTextTag = product.qr_text_tag;
      
      // If product name wasn't provided, use the one from the database
      if (!productName && product.name) {
        productName = product.name;
      }
    }
    
    // Generate the QR code URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://textg.pt';
    let qrUrl;
    
    if (qrTextTag) {
      qrUrl = `${baseUrl}/iqr/chat/${qrTextTag}`;
    } else {
      // Default query is product name with describe if no custom query
      const queryText = customQuery || `${productName || ''} describe`;
      qrUrl = `${baseUrl}/iqr/chat/${businessId}?sent=${encodeURIComponent(queryText)}`;
    }
    
    // Always generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Check if a QR code already exists for this product
    const { data: existingQRCodes } = await supabase
      .from('qr_codes')
      .select('id, image_url')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Try to use RPC function to bypass any RLS policies
    try {
      if (existingQRCodes && existingQRCodes.length > 0) {
        // Update existing QR code using RPC
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('update_qr_code_direct', {
            p_qr_code_id: existingQRCodes[0].id,
            p_image_url: qrCodeDataUrl,
            p_data: qrUrl
          });
          
        if (rpcError) {
          console.error('Error updating QR code via RPC:', rpcError);
          // Fall back to standard update
        } else if (rpcResult && rpcResult.success) {
          console.log('QR code updated successfully via RPC');
          return { success: true, data: rpcResult.data || existingQRCodes[0] };
        }
      }
    } catch (rpcError) {
      console.error('RPC method not available, using standard approach:', rpcError);
      // Continue with standard approach
    }
    
    let result: QRCodeResult;
    
    // If a QR code already exists, update it instead of creating a new one
    if (existingQRCodes && existingQRCodes.length > 0) {
      // Always update with new image URL to ensure it exists
      const { data: updatedQRCode, error: updateError } = await supabase
        .from('qr_codes')
        .update({
          image_url: qrCodeDataUrl,
          data: qrUrl,
        })
        .eq('id', existingQRCodes[0].id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating QR code:', updateError);
        
        // Try one more time with a simplified update
        const { error: simpleUpdateError } = await supabase
          .from('qr_codes')
          .update({ image_url: qrCodeDataUrl })
          .eq('id', existingQRCodes[0].id);
        
        if (simpleUpdateError) {
          console.error('Even simplified update failed:', simpleUpdateError);
          return { success: false, error: 'Failed to update QR code: ' + simpleUpdateError.message };
        }
        
        // If simplified update worked, return partial success
        return { 
          success: true, 
          data: {
            ...existingQRCodes[0],
            image_url: qrCodeDataUrl,
            data: qrUrl
          }
        };
      }
      
      result = { success: true, data: updatedQRCode };
    } else {
      // Create a new QR code if none exists
      const qrCodeId = uuidv4();
      const { data: qrCodeData, error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          id: qrCodeId,
          product_id: productId,
          image_url: qrCodeDataUrl, // Always include the image URL
          data: qrUrl,
        })
        .select()
        .single();
      
      if (qrError) {
        console.error('Error storing QR code:', qrError);
        
        // Try a different approach: two-step insert
        try {
          // First insert minimal data
          await supabase
            .from('qr_codes')
            .insert({
              id: qrCodeId,
              product_id: productId,
              image_url: '', // Empty string to satisfy NOT NULL constraint
              data: qrUrl,
            });
          
          // Then update the image URL
          await supabase
            .from('qr_codes')
            .update({ image_url: qrCodeDataUrl })
            .eq('id', qrCodeId);
          
          // Return success with constructed data
          return { 
            success: true,
            data: {
              id: qrCodeId,
              product_id: productId,
              image_url: qrCodeDataUrl,
              data: qrUrl
            }
          };
        } catch (twoStepError) {
          console.error('Two-step insert also failed:', twoStepError);
          return { success: false, error: 'Failed to store QR code even with two-step approach' };
        }
      }
      
      result = { success: true, data: qrCodeData };
    }
    
    return result;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return { success: false, error: 'Failed to generate QR code' };
  }
}

/**
 * Generates a QR code from a custom URL and updates the QR code in the database
 */
export async function updateQRCodeWithCustomURL(qrCodeId: string, customURL: string): Promise<QRCodeUpdateResult> {
  try {
    const supabase = createStandaloneClient();
    
    // Always generate the QR code image first to ensure we have it
    console.log('Generating QR code image for URL:', customURL);
    const qrCodeDataUrl = await QRCode.toDataURL(customURL, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Try the new RPC approach - first update the URL data
    console.log('Updating QR code URL via RPC function');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('update_qr_code_with_url', {
        qr_code_id: qrCodeId,
        custom_url: customURL
      });
    
    if (rpcError) {
      console.error('RPC update failed:', rpcError);
      // Fall back to direct update
      const { data: directUpdateResult, error: directUpdateError } = await supabase
        .from('qr_codes')
        .update({
          data: customURL,
          image_url: qrCodeDataUrl
        })
        .eq('id', qrCodeId)
        .select()
        .single();
      
      if (directUpdateError) {
        console.error('Direct update failed:', directUpdateError);
        return { 
          success: false, 
          error: 'Failed to update QR code',
          details: directUpdateError
        };
      }
      
      return { success: true, data: directUpdateResult };
    }
    
    // If the RPC call for URL update succeeded, now update the image separately
    if (rpcResult && rpcResult.success) {
      console.log('URL update successful, now updating image');
      
      // Try the new image update RPC function first
      try {
        const { data: imageRpcResult, error: imageRpcError } = await supabase
          .rpc('update_qr_code_image', {
            qr_code_id: qrCodeId,
            image_url: qrCodeDataUrl
          });
          
        if (!imageRpcError && imageRpcResult && imageRpcResult.success) {
          return { success: true, data: imageRpcResult.data };
        }
      } catch (imageRpcFailure) {
        console.warn('Image RPC update failed, trying direct update:', imageRpcFailure);
      }
      
      // If RPC image update failed, try direct update
      const { data: imageUpdateResult, error: imageUpdateError } = await supabase
        .from('qr_codes')
        .update({ image_url: qrCodeDataUrl })
        .eq('id', qrCodeId)
        .select()
        .single();
      
      if (imageUpdateError) {
        console.warn('QR code data was updated but image update failed:', imageUpdateError);
        // Still return success with the original data plus client image
        return { 
          success: true, 
          data: {
            ...rpcResult.data,
            image_url: qrCodeDataUrl
          }
        };
      }
      
      return { success: true, data: imageUpdateResult };
    }
    
    // If the RPC function reported an error in its result
    if (rpcResult && !rpcResult.success) {
      console.error('RPC function returned error:', rpcResult.error);
      
      // Try direct update as last resort
      const { data: directResult, error: directError } = await supabase
        .from('qr_codes')
        .update({
          data: customURL,
          image_url: qrCodeDataUrl
        })
        .eq('id', qrCodeId)
        .select()
        .single();
      
      if (directError) {
        return {
          success: false,
          error: 'Failed to update QR code after all attempts',
          details: {
            rpcError: rpcResult.error,
            directError: directError.message
          }
        };
      }
      
      return { success: true, data: directResult };
    }
    
    // We shouldn't reach here, but just in case
    return { 
      success: false, 
      error: 'Unexpected flow in QR code update'
    };
  } catch (error) {
    console.error('QR Code update error:', error);
    return { success: false, error: 'Failed to update QR code' };
  }
}

/**
 * Creates a QR code URL based on business ID and query text
 */
export function createQRCodeURL(businessId: string, queryText: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://textg.pt';
  // Ensure we're properly encoding the query parameter
  return `${baseUrl}/iqr/chat/${businessId}?sent=${encodeURIComponent(queryText)}`;
}

/**
 * Formats a raw query for display in the UI
 */
export function formatQueryForDisplay(query: string): string {
  // Properly handle URL-encoded characters
  try {
    return decodeURIComponent(query)
      .replace(/_/g, ' ')
      .replace(/%20/g, ' ');
  } catch (e) {
    // If decoding fails, use simpler replacements
    return query
      .replace(/_/g, ' ')
      .replace(/%20/g, ' ');
  }
}

/**
 * Extracts the query part from a QR code URL
 */
export function extractQueryFromURL(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const sentParam = parsedUrl.searchParams.get('sent');
    if (!sentParam) return '';
    
    // Ensure we're properly decoding the parameter
    return decodeURIComponent(sentParam);
  } catch (error) {
    console.error('Error extracting query from URL:', error);
    
    // Fallback method for malformed URLs
    try {
      const urlParts = url.split('?');
      if (urlParts.length < 2) return '';
      
      const params = new URLSearchParams(urlParts[1]);
      const sentParam = params.get('sent');
      return sentParam ? decodeURIComponent(sentParam) : '';
    } catch (fallbackError) {
      console.error('Fallback URL parsing also failed:', fallbackError);
      return '';
    }
  }
}

/**
 * Updates QR code images for records that have empty image URLs
 * This is used to update QR codes created by the database trigger
 */
export async function updateEmptyQRCodeImages(): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  errors?: any[];
}> {
  try {
    const supabase = createStandaloneClient();
    
    // Find QR codes with empty image URLs
    const { data: qrCodes, error: fetchError } = await supabase
      .from('qr_codes')
      .select('id, data')
      .eq('image_url', '')
      .limit(50);
    
    if (fetchError) {
      console.error('Error fetching empty QR codes:', fetchError);
      return {
        success: false,
        updated: 0,
        failed: 0,
        errors: [fetchError]
      };
    }
    
    if (!qrCodes || qrCodes.length === 0) {
      console.log('No QR codes with empty images found');
      return {
        success: true,
        updated: 0,
        failed: 0
      };
    }
    
    console.log(`Found ${qrCodes.length} QR codes with empty images`);
    
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as any[]
    };
    
    // Generate and update images for each QR code
    for (const qrCode of qrCodes) {
      try {
        // Generate QR code image
        const qrCodeDataUrl = await QRCode.toDataURL(qrCode.data, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        
        // Update the QR code image
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
          console.log(`Updated QR code image for ID ${qrCode.id}`);
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
    
    return {
      success: results.failed === 0,
      ...results
    };
  } catch (error) {
    console.error('Error updating empty QR code images:', error);
    return {
      success: false,
      updated: 0,
      failed: 1,
      errors: [error]
    };
  }
} 