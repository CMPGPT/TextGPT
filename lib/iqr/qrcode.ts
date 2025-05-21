import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

// Create a standalone Supabase client that doesn't rely on Next.js features
const createStandaloneClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

/**
 * Fetches QR codes for a specific product
 * @param productId The ID of the product to fetch QR codes for
 * @returns Object containing success status and QR code data or error
 */
export async function fetchQRCodesForProduct(productId: string) {
  try {
    const supabase = createStandaloneClient();
    console.log(`Helper: Fetching QR codes for product ID: ${productId}`);
    
    // Try direct table fetch first - should work with our simplified RLS
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      console.log(`Helper: Found ${data.length} QR codes directly from table`);
      return { success: true, data };
    }
    
    // If direct fetch failed, try getting public QR codes
    if (error) {
      console.log('Helper: Direct fetch failed, trying RPC function');
      
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_public_qr_codes', { p_product_id: productId });
      
      if (!rpcError && rpcData) {
        console.log(`Helper: Found ${rpcData.length} QR codes via RPC`);
        return { success: true, data: rpcData };
      }
      
      console.error('Helper: Both direct and RPC methods failed:', error, rpcError);
      return { success: false, error: 'Failed to fetch QR codes' };
    }
    
    // If we get here with no data, return empty array
    return { success: true, data: [] };
  } catch (error) {
    console.error('Helper: Unexpected error fetching QR codes:', error);
    return { success: false, error: 'Failed to fetch QR codes' };
  }
} 