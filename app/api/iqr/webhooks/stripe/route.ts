import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// This is your Stripe CLI webhook secret for testing
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  
  let event;
  
  try {
    if (!endpointSecret) {
      throw new Error('Missing Stripe webhook secret');
    }
    
    event = stripeClient.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
  
  console.log(`Event type: ${event.type}`);
  
  // Initialize Supabase client with server side client
  const supabase = createServerSupabaseClient();
  
  // Handle specific event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Check if this is an IQR subscription
      if (session.metadata?.productType !== 'iqr_subscription') {
        console.log('Not an IQR subscription event, skipping');
        break;
      }
      
      const businessId = session.metadata?.businessId;
      if (!businessId) {
        console.error('No business ID found in checkout session metadata');
        break;
      }
      
      // Update the business subscription status
      const { error } = await supabase
        .from('businesses')
        .update({ 
          subscription_status: 'active',
          stripe_customer_id: session.customer
        })
        .eq('id', businessId);
      
      if (error) {
        console.error('Error updating business subscription status:', error);
      } else {
        console.log(`Updated subscription status for business ${businessId} to active`);
      }
      
      // Record the subscription in the subscriptions table
      const subscriptionId = session.subscription;
      if (subscriptionId) {
        try {
          // Get the subscription details from Stripe
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
          
          // Get the price ID from the subscription
          const priceId = subscription.items.data[0]?.price.id;
          
          if (!priceId) {
            console.error('No price ID found in subscription');
            break;
          }
          
          // Get the subscription plan details
          const { data, error: planError } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('stripe_price_id_monthly', priceId)
            .single();
          
          if (planError || !data) {
            console.error('Error retrieving subscription plan for price ID:', priceId, planError);
            
            // Try inserting the subscription record without subscription_plan_id
            const { error: subError } = await supabase
              .from('subscriptions')
              .upsert({
                business_id: businessId,
                stripe_customer_id: session.customer,
                stripe_subscription_id: subscriptionId,
                plan_id: priceId, // Use price ID as plan_id
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end
              });
            
            if (subError) {
              console.error('Error recording subscription:', subError);
            } else {
              console.log(`Recorded subscription ${subscriptionId} for business ${businessId} (without plan ID)`);
            }
          } else {
            // Insert the subscription record with subscription_plan_id
            const { error: subError } = await supabase
              .from('subscriptions')
              .upsert({
                business_id: businessId,
                stripe_customer_id: session.customer,
                stripe_subscription_id: subscriptionId,
                plan_id: priceId, // Still include plan_id for backward compatibility
                subscription_plan_id: data.id, // Use the proper subscription_plan_id
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end
              });
            
            if (subError) {
              console.error('Error recording subscription:', subError);
            } else {
              console.log(`Recorded subscription ${subscriptionId} for business ${businessId}`);
            }
          }
        } catch (err) {
          console.error('Error processing subscription details:', err);
        }
      }
      
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      
      try {
        // Find the business with this subscription
        const { data, error } = await supabase
          .from('subscriptions')
          .select('business_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        if (error || !data) {
          console.error('Error finding business for subscription:', error);
          break;
        }
        
        // Update subscription status
        const businessId = data.business_id;
        const status = subscription.status;
        
        // Update business subscription status
        await supabase
          .from('businesses')
          .update({ 
            subscription_status: status === 'active' ? 'active' : 'inactive'
          })
          .eq('id', businessId);
        
        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({
            status: status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id);
        
        console.log(`Updated subscription status for ${subscription.id} to ${status}`);
      } catch (err) {
        console.error('Error updating subscription:', err);
      }
      
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      
      try {
        // Find the business with this subscription
        const { data, error } = await supabase
          .from('subscriptions')
          .select('business_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        if (error || !data) {
          console.error('Error finding business for subscription:', error);
          break;
        }
        
        // Update business subscription status
        const businessId = data.business_id;
        await supabase
          .from('businesses')
          .update({ subscription_status: 'inactive' })
          .eq('id', businessId);
        
        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false
          })
          .eq('stripe_subscription_id', subscription.id);
        
        console.log(`Marked subscription ${subscription.id} as canceled`);
      } catch (err) {
        console.error('Error processing subscription cancellation:', err);
      }
      
      break;
    }
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  return NextResponse.json({ received: true });
}

// Add OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
} 