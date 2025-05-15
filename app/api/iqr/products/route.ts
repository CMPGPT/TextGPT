import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        response.business = businessData;
        console.log(`[API] Retrieved business information: ${businessData.name}`);
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
      // Use the test business ID for development
      if (businessId === '11111111-1111-1111-1111-111111111111') {
        response.products = [{
          id: '8816aad6-ad51-42fa-bd7b-86d9b1b5820e',
          name: 'OG kush',
          description: 'this is good',
          system_prompt: 'act as badass',
          status: 'ready'
        }];
        
        if (includeBusinessInfo && !response.business) {
          response.business = {
            id: businessId,
            name: 'Test Business',
            website_url: 'https://example.com',
            support_email: 'support@example.com',
            support_phone: '+123456789'
          };
        }
      } else {
        response.products = [];
      }
    } else {
      response.products = productsData;
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