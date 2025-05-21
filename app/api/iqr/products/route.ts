import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/client';
import type Stripe from 'stripe';

// Force dynamic execution for this route
export const dynamic = "force-dynamic";

// The specific product ID we want to fetch
const IQR_PRODUCT_ID = 'prod_SKUcmFulvJlPM6';

/**
 * GET endpoint to fetch IQR products from Stripe
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');
    
    // Fetch the product from Stripe
    const product = await stripeClient.products.retrieve(IQR_PRODUCT_ID);
    
    if (!product || product.active === false) {
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 404 }
      );
    }
    
    // Fetch prices for this product
    const prices = await stripeClient.prices.list({
      product: product.id,
      active: true,
      type: 'recurring',
    });
    
    // Format product details with prices
    const productDetails = {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.images?.[0] || null,
      prices: prices.data.map((price: Stripe.Price) => ({
        id: price.id,
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        interval: price.recurring?.interval || 'month',
        interval_count: price.recurring?.interval_count || 1,
      })),
      metadata: product.metadata,
    };
    
    // If businessId is provided, check if the business already has a subscription
    let subscriptionStatus = null;
    if (businessId) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('subscription_status')
        .eq('id', businessId)
        .single();
      
      if (!error && data) {
        subscriptionStatus = data.subscription_status;
      }
    }
    
    return NextResponse.json({
      product: productDetails,
      subscriptionStatus,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 