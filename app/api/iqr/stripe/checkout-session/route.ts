import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/index';
import { createClient } from '@/lib/supabase/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// The specific product ID we want to use
const IQR_PRODUCT_ID = 'prod_SKUcmFulvJlPM6';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request data
    const requestData = await req.json();
    let { priceId } = requestData;
    const { businessId } = requestData;

    if (!priceId) {
      // If no priceId provided, we'll fetch the default price for our product
      const prices = await stripe.prices.list({
        product: IQR_PRODUCT_ID,
        active: true,
        type: 'recurring',
        limit: 1
      });

      if (prices.data.length === 0) {
        return NextResponse.json(
          { error: 'No active price found for the specified product' },
          { status: 400 }
        );
      }
      
      // Use the first price
      priceId = prices.data[0].id;
    }

    // Get business ID if not provided
    let finalBusinessId = businessId;
    if (!finalBusinessId) {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase
        .from('iqr_users')
        .select('business_id')
        .eq('auth_uid', session.user.email)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User or business not found' },
          { status: 404 }
        );
      }

      finalBusinessId = userData.business_id;
    }

    // Check if business already has a Stripe customer ID
    const supabase = createClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, stripe_customer_id, name')
      .eq('id', finalBusinessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // If no customer ID exists, create one
    let customerId = business.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: business.name,
        metadata: {
          business_id: business.id
        }
      });
      
      customerId = customer.id;
      
      // Update the business with the customer ID
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: customerId })
        .eq('id', business.id);
    }

    // Base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 req.headers.get('origin') || 
                 'http://localhost:3000';

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/iqr/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/plans?canceled=true`,
      metadata: {
        business_id: finalBusinessId,
        product_type: 'iqr'
      }
    });

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 