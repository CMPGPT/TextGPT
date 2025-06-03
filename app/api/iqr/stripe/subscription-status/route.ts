import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/index";
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Force dynamic execution for this route
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

// Helper function to validate Supabase connection
function validateSupabaseEnv() {
  // Check if Supabase URL and key are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    return false;
  }
  
  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
    return false;
  }
  
  return true;
}

// GET endpoint to check subscription status
export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    
    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: "Business ID is required"
      }, { status: 400 });
    }
    
    // Validate Supabase connection
    if (!validateSupabaseEnv()) {
      return NextResponse.json({ 
        success: false, 
        message: "Supabase environment validation failed" 
      }, { status: 500 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get the business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, subscription_status, stripe_customer_id')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: "Business not found",
        error: businessError?.message
      }, { status: 404 });
    }
    
    if (!business.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: "Business has no associated Stripe customer",
        business
      }, { status: 200 });
    }
    
    // Get subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: business.stripe_customer_id,
      status: 'all',
      expand: ['data.default_payment_method']
    });
    
    // Get invoice data from Stripe
    const invoices = await stripe.invoices.list({
      customer: business.stripe_customer_id
    });
    
    // Return the data
    return NextResponse.json({
      success: true,
      business,
      subscription_data: {
        count: subscriptions.data.length,
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        }))
      },
      invoice_data: {
        count: invoices.data.length,
        invoices: invoices.data.map(inv => ({
          id: inv.id,
          status: inv.status,
          amount_due: inv.amount_due / 100,
          amount_paid: inv.amount_paid / 100,
          created: new Date(inv.created * 1000).toISOString(),
        }))
      }
    });
    
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({
      success: false,
      message: "Error checking subscription status",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to force update subscription data
export async function POST(req: NextRequest) {
  try {
    // Parse query parameters 
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    
    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: "Business ID is required"
      }, { status: 400 });
    }
    
    // Validate Supabase connection
    if (!validateSupabaseEnv()) {
      return NextResponse.json({ 
        success: false, 
        message: "Supabase environment validation failed" 
      }, { status: 500 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get the business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, subscription_status, stripe_customer_id')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: "Business not found",
        error: businessError?.message
      }, { status: 404 });
    }
    
    if (!business.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: "Business has no associated Stripe customer",
        business
      }, { status: 200 });
    }
    
    // Get subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: business.stripe_customer_id,
      status: 'all'
    });
    
    // Get the active subscription if any
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    // Update subscription record in database
    let subscriptionResult: {
      action: string;
      success: boolean;
      error: string | null;
      business_status_updated?: boolean;
    } = {
      action: 'none',
      success: true,
      error: null
    };
    if (activeSubscription) {
      // Check if a subscription record exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', businessId)
        .single();
      
      // Get product from subscription
      const product = activeSubscription.items.data[0]?.price.product as string;
      
      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: activeSubscription.id,
            status: 'active',
            plan_id: product,
            current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: activeSubscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);
          
        subscriptionResult = {
          action: 'updated',
          success: !updateError,
          error: updateError ? updateError.message : null
        };
      } else {
        // Create new subscription record
        const subscriptionData = {
          business_id: businessId,
          stripe_customer_id: business.stripe_customer_id,
          stripe_subscription_id: activeSubscription.id,
          status: 'active',
          plan_id: product,
          current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: activeSubscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('Inserting subscription with data:', JSON.stringify(subscriptionData, null, 2));
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);
        
        subscriptionResult = {
          action: 'created',
          success: !insertError,
          error: insertError ? insertError.message : null
        };
      }
      
      // Update business subscription status
      const { error: businessUpdateError } = await supabase
        .from('businesses')
        .update({
          subscription_status: 'active',
        })
        .eq('id', businessId);
      
      subscriptionResult.business_status_updated = !businessUpdateError;
    }
    
    // Get invoice data from Stripe
    const invoices = await stripe.invoices.list({
      customer: business.stripe_customer_id
    });
    
    // Process the latest invoice
    let invoiceResult = null;
    if (invoices.data.length > 0) {
      const latestInvoice = invoices.data[0];
      
      // Check if the invoice exists in the database
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('stripe_invoice_id', latestInvoice.id)
        .single();
      
      const invoiceData = {
        business_id: businessId,
        stripe_invoice_id: latestInvoice.id,
        stripe_subscription_id: latestInvoice.subscription as string,
        amount_due: latestInvoice.amount_due / 100, // Convert cents to dollars
        amount_paid: latestInvoice.amount_paid / 100,
        amount_remaining: latestInvoice.amount_remaining / 100,
        currency: latestInvoice.currency,
        status: latestInvoice.status,
        invoice_pdf: latestInvoice.invoice_pdf,
        hosted_invoice_url: latestInvoice.hosted_invoice_url,
        period_start: latestInvoice.period_start ? new Date(latestInvoice.period_start * 1000).toISOString() : null,
        period_end: latestInvoice.period_end ? new Date(latestInvoice.period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
        metadata: {
          lines: latestInvoice.lines?.data?.map(line => ({
            amount: line.amount / 100,
            description: line.description,
            period: {
              start: line.period?.start ? new Date(line.period.start * 1000).toISOString() : null,
              end: line.period?.end ? new Date(line.period.end * 1000).toISOString() : null
            }
          }))
        }
      };
      
      if (existingInvoice) {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingInvoice.id);
          
        invoiceResult = {
          action: 'updated',
          success: !updateError,
          error: updateError ? updateError.message : null
        };
      } else {
        // Create new invoice record
        const { error: insertError } = await supabase
          .from('invoices')
          .insert({
            ...invoiceData,
            created_at: new Date().toISOString()
          });
          
        invoiceResult = {
          action: 'created',
          success: !insertError,
          error: insertError ? insertError.message : null
        };
      }
    }
    
    // Update user balance if there's an active subscription
    let balanceResult = null;
    if (activeSubscription) {
      try {
        // Find the owner user for this business
        const { data: ownerUser, error: ownerError } = await supabase
          .from('iqr_users')
          .select('id')
          .eq('business_id', businessId)
          .eq('role', 'owner')
          .single();
        
        if (!ownerError && ownerUser) {
          // Get the price information from Stripe
          const priceId = activeSubscription.items.data[0]?.price.id;
          const priceObj = await stripe.prices.retrieve(priceId);
          const priceAmount = priceObj.unit_amount ?? 0;
          
          // Check for existing balance
          const { data: userBalance, error: _balanceFetchError } = await supabase
            .from('user_balance')
            .select('*')
            .eq('user_id', ownerUser.id)
            .eq('business_id', businessId)
            .single();
          
          const now = new Date().toISOString();
          
          if (userBalance) {
            // Update last_subscription_date and add subscription amount to balance
            const newBalance = userBalance.balance + (priceAmount / 100); // Convert cents to dollars
            const { error: updateBalanceError } = await supabase
              .from('user_balance')
              .update({
                last_subscription_date: now,
                updated_at: now,
                balance: newBalance,
              })
              .eq('id', userBalance.id);
            
            balanceResult = {
              action: 'updated',
              success: !updateBalanceError,
              error: updateBalanceError ? updateBalanceError.message : null,
              owner_id: ownerUser.id,
              balance: newBalance
            };
          } else {
            // Insert new balance record with the subscription price as the initial balance
            const initialBalance = priceAmount / 100; // Convert cents to dollars
            const { error: insertBalanceError } = await supabase
              .from('user_balance')
              .insert({
                user_id: ownerUser.id,
                business_id: businessId,
                balance: initialBalance,
                last_subscription_date: now,
                total_messages: 0,
                message_cost: 0.01,
                created_at: now,
                updated_at: now,
              });
            
            balanceResult = {
              action: 'created',
              success: !insertBalanceError,
              error: insertBalanceError ? insertBalanceError.message : null,
              owner_id: ownerUser.id,
              balance: initialBalance
            };
          }
        } else {
          balanceResult = {
            action: 'skipped',
            success: false,
            error: 'No owner user found for business',
            owner_error: ownerError?.message
          };
        }
      } catch (balanceError) {
        balanceResult = {
          action: 'error',
          success: false,
          error: balanceError instanceof Error ? balanceError.message : 'Unknown error'
        };
      }
    }
    
    // Return the result
    return NextResponse.json({
      success: true,
      business,
      subscription: {
        data: activeSubscription ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
        } : null,
        result: subscriptionResult
      },
      invoice: {
        count: invoices.data.length,
        result: invoiceResult
      },
      balance: balanceResult
    });
    
  } catch (error) {
    console.error('Error updating subscription data:', error);
    return NextResponse.json({
      success: false,
      message: "Error updating subscription data",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 