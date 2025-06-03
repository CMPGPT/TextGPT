import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleSubscriptionEvent, handleInvoiceEvent } from "@/app/api/iqr/stripe/webhooks/route";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

/**
 * This is a direct endpoint to manually test subscription record creation.
 * It bypasses Stripe webhooks and directly inserts into the database.
 * Use only for testing/troubleshooting.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      businessId, 
      stripeCustomerId, 
      stripeSubscriptionId, 
      planId, 
      status, 
      mode, 
      customerId,
      subscriptionId
    } = body;
    
    // Check which mode we're operating in
    if (mode === 'webhook') {
      // Process through webhook handlers
      return await handleManualWebhook(body);
    }
    
    // Standard direct database update
    const actualBusinessId = businessId;
    const actualCustomerId = stripeCustomerId || customerId;
    const actualSubscriptionId = stripeSubscriptionId || subscriptionId;
    
    if (!actualBusinessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }
    
    console.log('Attempting direct subscription creation/update:', {
      businessId: actualBusinessId, 
      customerId: actualCustomerId, 
      subscriptionId: actualSubscriptionId,
      status: status || 'active',
      planId: planId || 'prod_test'
    });
    
    const supabase = createServerSupabaseClient();
    
    // First, update the business status
    const { error: businessError } = await supabase
      .from('businesses')
      .update({
        subscription_status: status || 'active',
        stripe_customer_id: actualCustomerId
      })
      .eq('id', actualBusinessId);
    
    if (businessError) {
      console.error('Error updating business:', businessError);
      return NextResponse.json({ error: "Failed to update business", details: businessError }, { status: 500 });
    }
    
    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', actualBusinessId)
      .single();
    
    const now = new Date().toISOString();
    
    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: actualCustomerId,
          stripe_subscription_id: actualSubscriptionId,
          status: status || 'active',
          plan_id: planId || 'prod_test',
          updated_at: now
        })
        .eq('id', existingSub.id);
      
      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.json({ error: "Failed to update subscription", details: updateError }, { status: 500 });
      }
      
      console.log(`Updated subscription ${existingSub.id} for business ${actualBusinessId}`);
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          business_id: actualBusinessId,
          stripe_customer_id: actualCustomerId, 
          stripe_subscription_id: actualSubscriptionId,
          status: status || 'active',
          plan_id: planId || 'prod_test',
          created_at: now,
          updated_at: now
        });
      
      if (insertError) {
        console.error('Error creating subscription:', insertError);
        return NextResponse.json({ error: "Failed to create subscription", details: insertError }, { status: 500 });
      }
      
      console.log(`Created new subscription for business ${actualBusinessId}`);
    }
    
    // Also create a test invoice record
    const { error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: actualBusinessId,
        stripe_invoice_id: `inv_test_${Date.now()}`,
        stripe_subscription_id: actualSubscriptionId || `sub_test_${Date.now()}`,
        amount_due: 19.99,
        amount_paid: 19.99,
        amount_remaining: 0,
        currency: 'usd',
        status: 'paid',
        created_at: now
      });
    
    if (invoiceError) {
      console.error('Error creating test invoice:', invoiceError);
      // Don't fail the whole operation for invoice error
    }
    
    return NextResponse.json({
      success: true,
      message: existingSub ? "Subscription updated" : "Subscription created"
    });
    
  } catch (error) {
    console.error("Error in direct subscription endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to handle manual webhook simulation
async function handleManualWebhook(body: any) {
  try {
    const { businessId, customerId, subscriptionId, mode } = body;
    
    if (!businessId || !customerId || !subscriptionId) {
      return NextResponse.json(
        { error: "Missing required fields: businessId, customerId, subscriptionId" },
        { status: 400 }
      );
    }
    
    console.log(`Processing manual subscription update for business: ${businessId}`);
    
    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // First check if the business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      console.error('Business not found:', businessId, businessError);
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }
    
    // Update the business customer ID if needed
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        stripe_customer_id: customerId,
      })
      .eq('id', businessId);
    
    if (updateError) {
      console.error('Error updating business:', updateError);
      return NextResponse.json(
        { error: "Failed to update business" },
        { status: 500 }
      );
    }
    
    // Create mock events based on the mode
    if (mode === 'invoice') {
      // Create a mock invoice event
      const mockEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: `manual_inv_${Date.now()}`,
            customer: customerId,
            subscription: subscriptionId,
            amount_due: 1999,
            amount_paid: 1999,
            amount_remaining: 0,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: null,
            hosted_invoice_url: null,
            period_start: Math.floor(Date.now() / 1000) - 86400,
            period_end: Math.floor(Date.now() / 1000) + 2592000,
            lines: {
              data: [
                {
                  amount: 1999,
                  description: 'Manual test subscription plan',
                  period: {
                    start: Math.floor(Date.now() / 1000) - 86400,
                    end: Math.floor(Date.now() / 1000) + 2592000
                  }
                }
              ]
            }
          }
        }
      } as Stripe.Event;
      
      await handleInvoiceEvent(mockEvent, supabase);
    } else {
      // Create a mock subscription event
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: subscriptionId,
            customer: customerId,
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'mock_price_id',
                    product: 'mock_product_id',
                    unit_amount: 1999,
                    currency: 'usd'
                  }
                }
              ]
            },
            current_period_start: Math.floor(Date.now() / 1000) - 86400,
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            cancel_at_period_end: false
          }
        }
      } as Stripe.Event;
      
      await handleSubscriptionEvent(mockEvent, supabase);
    }

    // Check if the subscription was created
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .single();
      
    if (subError) {
      console.error('Error checking subscription:', subError);
      return NextResponse.json(
        { error: "Failed to verify subscription creation" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Subscription handler executed successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error("Error in manual webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 