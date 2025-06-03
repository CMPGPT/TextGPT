import { NextRequest, NextResponse } from 'next/server';
import { stripe as _stripe } from "@/lib/stripe/index";
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Force dynamic execution for this route
export const dynamic = "force-dynamic";

// The specific product ID we want to fetch
// const IQR_PRODUCT_ID = process.env.STRIPE_IQR_PRODUCT_ID || 'prod_OkwwzPeF7Gzhqn';

// Define the Product type
interface Product {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
}

/**
 * GET endpoint to fetch IQR products from Stripe
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');
    const includeBusinessInfo = url.searchParams.get('businessInfo') === 'true';
    
    // Initialize Supabase client if we need business data
    const supabase = businessId ? createServerSupabaseClient() : null;
    
    // If we need to return business information
    let business = null;
    if (includeBusinessInfo && businessId && supabase) {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, website_url, support_email, support_phone')
        .eq('id', businessId)
        .single();
      
      if (!businessError && businessData) {
        business = businessData;
      } else if (businessError) {
        console.error('Error fetching business:', businessError);
      }
    }
    
    // If only business info was requested and we have it, return early
    if (includeBusinessInfo && !url.searchParams.has('includeProducts') && business) {
      return NextResponse.json({ business });
    }
    
    // If businessId is provided, fetch products for that business from Supabase
    let products: Product[] = [];
    if (businessId && supabase) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, system_prompt')
        .eq('business_id', businessId);
      
      if (!productsError && productsData) {
        products = productsData as Product[];
      } else {
        console.error('Error fetching business products:', productsError);
      }
    }
    
    // Fetch subscription status if businessId is provided
    let subscriptionStatus = null;
    if (businessId && supabase) {
      const { data, error } = await supabase
        .from('businesses')
        .select('subscription_status')
        .eq('id', businessId)
        .single();
      
      if (!error && data) {
        subscriptionStatus = data.subscription_status;
      }
    }
    
    // Return the response with all requested data
    return NextResponse.json({
      products,
      business,
      subscriptionStatus,
    });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 