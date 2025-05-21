import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');
  const includeBusinessInfo = searchParams.get('businessInfo') === 'true';

  if (!businessId) {
    return NextResponse.json(
      { error: 'Business ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[API/products] Fetching products for business ID: ${businessId}`);
    const supabase = createClient();
    
    // Fetch products for the business
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, system_prompt, qr_text_tag, status')
      .eq('business_id', businessId)
      .eq('status', 'ready');
    
    if (productsError) {
      console.error('[API/products] Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
    
    // If business info is requested, fetch that too
    let business = null;
    if (includeBusinessInfo) {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, website_url, support_email, support_phone')
        .eq('id', businessId)
        .single();
      
      if (businessError) {
        console.error('[API/products] Error fetching business:', businessError);
        // We'll still return products, but with an indication that business fetch failed
      } else {
        business = businessData;
      }
    }
    
    // Construct response based on what was requested
    const response: any = {
      products: products || []
    };
    
    if (includeBusinessInfo) {
      response.business = business;
    }
    
    console.log(`[API/products] Returning ${products?.length || 0} products for business ${businessId}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API/products] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 