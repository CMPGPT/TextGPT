import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/index";
import { createClient } from '@/lib/supabase/client';
import Stripe from 'stripe';

// Updated config syntax for Next.js App Router
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Helper function to get raw request body
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  
  if (!reader) {
    return Buffer.from('');
  }
  
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (!done && result.value) {
      chunks.push(result.value);
    }
  }
  
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}

// Helper function to log to database and console
async function logWebhookEvent(eventType: string, data: any, supabase: any) {
  console.log(`[Stripe Webhook][${new Date().toISOString()}] Processing: ${eventType}`);
  
  try {
    // Log to the database for persistent records
    await supabase.from('logs').insert({
      level: 'info',
      message: `Stripe webhook processed: ${eventType}`,
      metadata: {
        event_type: eventType,
        data: JSON.stringify(data),
      }
    });
  } catch (err) {
    console.error('Error logging webhook event:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe webhook signature or secret");
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();
    
    // Log the webhook event
    await logWebhookEvent(event.type, event.data.object, supabase);

    // Handle the webhook event based on its type
    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle subscription events
    if (event.type.startsWith('customer.subscription')) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;
      const subscriptionId = subscription.id;
      
      console.log(`Processing subscription event: ${event.type}`);
      console.log(`Customer ID: ${customerId}, Status: ${status}, Subscription ID: ${subscriptionId}`);
      
      // Find business by customer ID
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      
      if (businessError || !business) {
        console.error('Business not found with customer ID:', customerId);
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      
      // Update subscription status
      const businessId = business.id;
      
      // Check if subscription record exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', businessId)
        .single();
      
      // Determine subscription status to use in our database
      let dbStatus = 'inactive';
      if (status === 'active' || status === 'trialing') {
        dbStatus = 'active';
      } else if (status === 'past_due') {
        dbStatus = 'past_due';
      } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
        dbStatus = 'inactive';
      } else if (status === 'incomplete') {
        dbStatus = 'incomplete';
      }
      
      console.log(`Determined database status: ${dbStatus} for business ID: ${businessId}`);
      
      // Get product from subscription
      const product = subscription.items.data[0]?.price.product as string;
      
      try {
        if (existingSub) {
          // Update existing subscription
          console.log(`Updating existing subscription for business ID: ${businessId}`);
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscriptionId,
              status: dbStatus,
              plan_id: product,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('business_id', businessId);
            
          if (updateError) {
            console.error('Error updating subscription:', updateError);
          } else {
            console.log('Subscription record updated successfully');
          }
        } else {
          // Create new subscription record
          console.log(`Creating new subscription for business ID: ${businessId}`);
          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              business_id: businessId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: dbStatus,
              plan_id: product,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            });
            
          if (insertError) {
            console.error('Error creating subscription:', insertError);
          } else {
            console.log('New subscription record created successfully');
          }
        }
        
        // Update business subscription status
        console.log(`Updating business subscription status to: ${dbStatus}`);
        const { error: businessUpdateError } = await supabase
          .from('businesses')
          .update({
            subscription_status: dbStatus,
          })
          .eq('id', businessId);
          
        if (businessUpdateError) {
          console.error('Error updating business subscription status:', businessUpdateError);
        } else {
          console.log('Business subscription status updated successfully');
        }
        
        // Log the success
        await logWebhookEvent(`${event.type}_processed`, { 
          business_id: businessId, 
          status: dbStatus,
          subscription_id: subscriptionId 
        }, supabase);
      } catch (err) {
        console.error('Database error handling subscription:', err);
        await logWebhookEvent(`${event.type}_error`, { 
          error: err instanceof Error ? err.message : 'Unknown error',
          business_id: businessId 
        }, supabase);
      }
      
      return NextResponse.json({ received: true });
    }

    // Handle checkout session completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Checkout session completed:', session.id);
      
      // Only handle subscription checkouts
      if (session.mode === 'subscription' && session.subscription) {
        const customerId = session.customer as string;
        const businessId = session.metadata?.businessId || session.metadata?.business_id;
        const subscriptionId = session.subscription as string;
        
        console.log(`Checkout completed for business ID: ${businessId}, customer ID: ${customerId}`);
        
        if (businessId) {
          try {
            // Update business with customer ID if needed
            console.log(`Updating business ${businessId} with customer ID ${customerId}`);
            const { error: businessUpdateError } = await supabase
              .from('businesses')
              .update({
                stripe_customer_id: customerId,
              })
              .eq('id', businessId)
              .is('stripe_customer_id', null);
            
            if (businessUpdateError) {
              console.error('Error updating business with customer ID:', businessUpdateError);
            }
            
            // Fetch the subscription data from Stripe
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              console.log(`Subscription ${subscriptionId} is active, updating business status`);
              
              // Update business status to active
              const { error: statusUpdateError } = await supabase
                .from('businesses')
                .update({
                  subscription_status: 'active',
                })
                .eq('id', businessId);
              
              if (statusUpdateError) {
                console.error('Error updating business status to active:', statusUpdateError);
              } else {
                console.log(`Business ${businessId} subscription status updated to active`);
                
                // Log success
                await logWebhookEvent('subscription_activated', {
                  business_id: businessId,
                  subscription_id: subscriptionId
                }, supabase);
              }
            }
          } catch (err) {
            console.error('Error processing checkout session completion:', err);
            await logWebhookEvent('checkout_session_error', { 
              error: err instanceof Error ? err.message : 'Unknown error',
              business_id: businessId 
            }, supabase);
          }
        } else {
          console.error('Missing business ID in checkout session metadata');
        }
      }
      
      return NextResponse.json({ received: true });
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return NextResponse.json(
      { error: "Error handling Stripe webhook" },
      { status: 500 }
    );
  }
}

// Support for specific HTTP methods
export const GET = async () => {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
};

export const PUT = async () => {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
};

export const DELETE = async () => {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}; 