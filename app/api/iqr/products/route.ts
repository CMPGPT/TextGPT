import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[API] IQR Products API: Request received');
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const includeBusinessInfo = searchParams.get('businessInfo') === 'true';
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No business ID provided' },
        { status: 400 }
      );
    }

    console.log(`[API] IQR Products API: Fetching products for business ${businessId}`);
    const supabase = createClient();

    // Start constructing response
    const response: { 
      products?: any[]; 
      business?: any;
    } = {};

    // If business info is requested, fetch it
    if (includeBusinessInfo) {
      console.log(`[API] IQR Products API: Including business information`);
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, website_url, support_email, support_phone')
        .eq('id', businessId)
        .single();

      if (businessError) {
        console.error('[API] Error fetching business information:', businessError);
      } else if (businessData) {
        // Ensure business name is properly formatted
        response.business = {
          ...businessData,
          name: businessData.name ? businessData.name.trim() : 'Test Business'
        };
        console.log(`[API] Retrieved business information: ${response.business.name}`);
      }
    }

    // Fetch products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, system_prompt, status')
      .eq('business_id', businessId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('[API] Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // If no products were found, return a default product for development
    if (!productsData || productsData.length === 0) {
      console.log(`[API] No products found for business ${businessId}`);
      // Return an empty array for products
      response.products = [];
    } else {
      // Ensure product names are properly formatted
      response.products = productsData.map(product => ({
        ...product,
        name: product.name ? product.name.trim() : product.name
      }));
      console.log(`[API] Retrieved ${productsData.length} products for business ${businessId}`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error in products API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 