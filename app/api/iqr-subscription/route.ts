import { NextRequest, NextResponse } from "next/server";
import { stripeClient } from "@/lib/stripe";
import type Stripe from "stripe";
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Force dynamic execution for this route
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user session using server-side Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get the session from cookies (this requires additional auth handling)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    const formData = await req.formData();
    const priceId = formData.get("priceId") as string;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    console.log("Processing subscription with price ID:", priceId);
    
    // Get user's business ID
    const { data: userData, error: userError } = await supabase
      .from('iqr_users')
      .select('business_id')
      .eq('auth_uid', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get business data
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, stripe_customer_id')
      .eq('id', userData.business_id)
      .single();
    
    if (businessError || !businessData) {
      console.error('Error fetching business data:', businessError);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    // Make sure we have a base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.NEXT_PUBLIC_APP_URL || 
                    req.nextUrl.origin || 
                    'https://textg.pt';
    
    // Checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId, // Using the direct Stripe price ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/plans`,
      metadata: {
        businessId: businessData.id,
        productType: "iqr_subscription"
      },
    };
    
    // If the business already has a Stripe customer ID, use it
    if (businessData.stripe_customer_id) {
      sessionParams.customer = businessData.stripe_customer_id;
    } else {
      // Create a new Stripe customer for this business
      try {
        const customer = await stripeClient.customers.create({
          email: user.email,
          name: user.email, // Use email as name if no name is available
          metadata: {
            businessId: businessData.id,
            userId: user.id
          }
        });
        
        // Update the business with the new customer ID
        await supabase
          .from('businesses')
          .update({ 
            stripe_customer_id: customer.id 
          })
          .eq('id', businessData.id);
        
        // Add customer ID to session params
        sessionParams.customer = customer.id;
      } catch (customerError) {
        console.error('Error creating Stripe customer:', customerError);
        // Continue without customer ID - Stripe will create one
      }
    }

    // Create a checkout session with explicit subscription mode
    const checkoutSession = await stripeClient.checkout.sessions.create(sessionParams);

    console.log(`Created checkout session: ${checkoutSession.id}`);
    
    if (!checkoutSession.url) {
      throw new Error("Session URL is undefined");
    }

    console.log(`Checkout URL: ${checkoutSession.url}`);
    
    // Instead of redirecting, return the URL in the JSON response
    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Use server-side Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from('iqr_users')
      .select('id, business_id, auth_uid')
      .eq('auth_uid', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get business subscription data
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, stripe_customer_id, subscription_status')
      .eq('id', userData.business_id)
      .single();

    if (businessError || !businessData) {
      console.error('Error fetching business data:', businessError);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check URL parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    
    // Get subscription details from stripe if customer ID exists
    let subscription = null;
    let isProcessing = false;
    
    if (businessData.stripe_customer_id) {
      try {
        // Check for active subscriptions
        const subscriptions = await stripeClient.subscriptions.list({
          customer: businessData.stripe_customer_id,
          status: 'active',
          limit: 1,
        });
        
        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
        } else {
          // If no active subscriptions, check for incomplete or trialing ones
          const incompleteSubscriptions = await stripeClient.subscriptions.list({
            customer: businessData.stripe_customer_id,
            status: 'incomplete',
            limit: 1,
          });
          
          if (incompleteSubscriptions.data.length > 0) {
            subscription = incompleteSubscriptions.data[0];
            isProcessing = true;
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe subscriptions:', error);
      }
    }
    
    // If we have a session ID, try to check its status
    if (sessionId && !subscription) {
      try {
        const session = await stripeClient.checkout.sessions.retrieve(sessionId);
        
        // If the session has a subscription, it might be in processing
        if (session.subscription) {
          isProcessing = true;
          
          // Try to retrieve the subscription
          try {
            subscription = await stripeClient.subscriptions.retrieve(session.subscription as string);
          } catch (subError) {
            console.error('Error retrieving subscription from session:', subError);
          }
          
          // If the session is complete and we don't have a customer ID yet, update it
          if (session.customer && !businessData.stripe_customer_id) {
            try {
              await supabase
                .from('businesses')
                .update({ 
                  stripe_customer_id: session.customer 
                })
                .eq('id', businessData.id);
                
              console.log(`Updated business ${businessData.id} with customer ID ${session.customer}`);
            } catch (updateError) {
              console.error('Error updating business with customer ID:', updateError);
            }
          }
        }
      } catch (sessionError) {
        console.error('Error retrieving checkout session:', sessionError);
      }
    }
    
    // Check if we need to update the business subscription status
    if (subscription && 
        (subscription.status === 'active' || subscription.status === 'trialing') && 
        businessData.subscription_status !== 'active') {
      try {
        // Update business subscription status to active
        await supabase
          .from('businesses')
          .update({
            subscription_status: 'active',
          })
          .eq('id', businessData.id);
          
        // Update local copy of business data
        businessData.subscription_status = 'active';
        
        console.log(`Updated business ${businessData.id} status to active based on Stripe data`);
      } catch (updateError) {
        console.error('Error updating business subscription status:', updateError);
      }
    }

    return NextResponse.json({
      subscription_status: businessData.subscription_status,
      has_active_subscription: businessData.subscription_status === 'active',
      is_processing: isProcessing,
      subscription_details: subscription,
    });
  } catch (error) {
    console.error('Error in subscription status API:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
} 