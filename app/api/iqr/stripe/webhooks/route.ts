import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/index";
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Updated config syntax for Next.js App Router
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Use environment variable instead of hard-coded value
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
console.log('Webhook environment mode:', process.env.NODE_ENV);

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
  
  console.log('Supabase environment variables validated successfully');
  console.log(`URL: ${supabaseUrl.substring(0, 20)}...`);
  console.log('Key available:', !!supabaseKey);
  
  return true;
}

// Helper function to get raw request body
async function getRawBody(req: NextRequest): Promise<Buffer> {
  try {
    // For development, we can use this simpler approach
    if (IS_DEVELOPMENT) {
      const text = await req.text();
      console.log('[DEV] Using text() method for body, length:', text.length);
      return Buffer.from(text);
    }
    
    // For production, use the more robust streaming approach
    const chunks: Uint8Array[] = [];
    
    if (!req.body) {
      console.error('Request body is null or undefined');
      return Buffer.from('');
    }
    
    const reader = req.body.getReader();
    
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (!done && result.value) {
        chunks.push(result.value);
      }
    }
    
    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  } catch (error) {
    console.error('Error reading request body:', error);
    return Buffer.from('');
  }
}

// Development-only handler for webhook events (no database operations)
async function handleWebhookDevelopment(rawBody: Buffer, _signature: string | null) {
  console.log('[DEV] Processing webhook in development mode');
  
  try {
    // Parse the raw body as JSON
    const jsonData = JSON.parse(rawBody.toString());
    const eventType = jsonData.type || 'unknown_event';
    
    console.log(`[DEV] Received webhook event type: ${eventType}`);
    console.log(`[DEV] Event data:`, JSON.stringify(jsonData.data?.object || {}, null, 2).substring(0, 200) + '...');
    
    // Log specific fields for different event types
    if (eventType === 'checkout.session.completed') {
      const session = jsonData.data?.object;
      console.log(`[DEV] Checkout session completed: ${session?.id}`);
      console.log(`[DEV] Customer ID: ${session?.customer}`);
      console.log(`[DEV] Subscription ID: ${session?.subscription}`);
      console.log(`[DEV] Business ID from metadata: ${session?.metadata?.businessId || session?.metadata?.business_id || 'not found'}`);
    }
    else if (eventType.startsWith('customer.subscription')) {
      const subscription = jsonData.data?.object;
      console.log(`[DEV] Subscription event: ${eventType}`);
      console.log(`[DEV] Customer ID: ${subscription?.customer}`);
      console.log(`[DEV] Subscription ID: ${subscription?.id}`);
      console.log(`[DEV] Subscription status: ${subscription?.status}`);
    }
    else if (eventType.startsWith('invoice')) {
      const invoice = jsonData.data?.object;
      console.log(`[DEV] Invoice event: ${eventType}`);
      console.log(`[DEV] Invoice ID: ${invoice?.id}`);
      console.log(`[DEV] Customer ID: ${invoice?.customer}`);
      console.log(`[DEV] Amount due: ${invoice?.amount_due / 100}`);
      console.log(`[DEV] Status: ${invoice?.status}`);
    }
    
    // Return a success response without doing any database operations
    return NextResponse.json({
      received: true,
      mode: 'development',
      eventType: eventType,
      message: 'Event logged (database operations skipped in development)'
    });
  }
  catch (error) {
    console.error('[DEV] Error parsing webhook event:', error);
    return NextResponse.json(
      { error: "Error parsing webhook in development mode" },
      { status: 400 }
    );
  }
}

// Production handler
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    console.log('Received stripe-signature:', signature?.substring(0, 20) + '...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('IS_DEVELOPMENT flag:', IS_DEVELOPMENT);

    // Get the request body as buffer
    const rawBody = await getRawBody(req);
    console.log('Raw body length:', rawBody.length);
    
    if (rawBody.length === 0) {
      console.error("Empty request body");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    // For development mode, use the simplified handler but add warning
    if (IS_DEVELOPMENT) {
      console.warn('⚠️ RUNNING IN DEVELOPMENT MODE - DATABASE OPERATIONS WILL BE SKIPPED');
      console.warn('Set NODE_ENV=production in .env.local to enable database operations');
      return handleWebhookDevelopment(rawBody, signature);
    }

    // Below this point is production code only
    console.log('Running in production mode, database operations will be performed');
    
    // Verify the webhook signature
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing stripe-signature header or STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook event parsing failed: ${err.message}`);
      console.error('Signature from request:', signature?.substring(0, 20) + '...');
      console.error('Raw body first 50 chars:', rawBody.slice(0, 50).toString());
      
      return NextResponse.json(
        { error: `Webhook parsing failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    if (!validateSupabaseEnv()) {
      console.error('Supabase environment validation failed. Cannot process webhook.');
      return NextResponse.json(
        { error: "Supabase connection error" },
        { status: 500 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    console.log('Supabase client initialized');
    
    // Log the webhook event
    await logWebhookEvent(event.type, event.data.object, supabase);
    console.log(`Received Stripe webhook: ${event.type}`);

    try {
      // Handle the webhook event based on its type
      // Note: We wrap each event handler in its own try/catch to prevent one error from affecting others

      // Handle subscription events
      if (event.type.startsWith('customer.subscription')) {
        try {
          await handleSubscriptionEvent(event, supabase);
        } catch (err) {
          console.error('Error handling subscription event:', err);
        }
      }

      // Handle checkout session completed event
      if (event.type === 'checkout.session.completed') {
        try {
          await handleCheckoutSessionCompleted(event, supabase);
        } catch (err) {
          console.error('Error handling checkout session event:', err);
        }
      }

      // Handle invoice events: created, finalized, paid, payment_succeeded
      if (event.type.startsWith('invoice.') || event.type === 'invoice_payment.paid' as Stripe.WebhookEndpointCreateParams.EnabledEvent) {
        try {
          await handleInvoiceEvent(event, supabase);
        } catch (err) {
          console.error('Error handling invoice event:', err);
        }
      }

      // Return a 200 response to acknowledge receipt of the event
      return NextResponse.json({ received: true, eventType: event.type });
    } catch (err) {
      console.error('Error processing webhook event:', err);
      return NextResponse.json(
        { error: "Error processing webhook event" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to log to database and console
async function logWebhookEvent(eventType: string, data: any, supabase: any) {
  console.log(`[Stripe Webhook][${new Date().toISOString()}] Processing: ${eventType}`);
  
  try {
    // Only log to database if supabase client is available
    if (supabase) {
      // Log to the database for persistent records
      await supabase.from('logs').insert({
        level: 'info',
        message: `Stripe webhook processed: ${eventType}`,
        metadata: {
          event_type: eventType,
          data: JSON.stringify(data),
        }
      });
    }
  } catch (err) {
    console.error('Error logging webhook event:', err);
  }
}

// Production handlers for subscription events and checkout sessions
// These functions remain unchanged from your original implementation

// New function to handle invoice events
export async function handleInvoiceEvent(event: Stripe.Event, supabase: any) {
  // Get the invoice data from the event
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  const invoiceId = invoice.id;
  
  console.log(`Processing invoice event: ${event.type}`);
  console.log(`Invoice ID: ${invoiceId}, Customer ID: ${customerId}`);
  
  // Find the business associated with this customer
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (businessError || !business) {
    console.error('Business not found with customer ID:', customerId);
    return;
  }
  
  const businessId = business.id;
  
  try {
    // Check if the invoice already exists in our database
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('stripe_invoice_id', invoiceId)
      .single();
    
    const invoiceData = {
      business_id: businessId,
      stripe_invoice_id: invoiceId,
      stripe_subscription_id: invoice.subscription as string,
      amount_due: invoice.amount_due / 100, // Convert cents to dollars
      amount_paid: invoice.amount_paid / 100,
      amount_remaining: invoice.amount_remaining / 100,
      currency: invoice.currency,
      status: invoice.status,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
      metadata: {
        lines: invoice.lines?.data?.map(line => ({
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
      console.log(`Updating existing invoice: ${invoiceId} for business: ${businessId}`);
      const { error: updateError } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('stripe_invoice_id', invoiceId);
        
      if (updateError) {
        console.error('Error updating invoice:', updateError);
      } else {
        console.log('Invoice updated successfully');
      }
    } else {
      // Create new invoice record
      console.log(`Creating new invoice record: ${invoiceId} for business: ${businessId}`);
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          created_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Error creating invoice record:', insertError);
      } else {
        console.log('Invoice record created successfully');
      }
    }
    
    // Log the success
    await logWebhookEvent(`${event.type}_processed`, { 
      business_id: businessId, 
      invoice_id: invoiceId
    }, supabase);
    
  } catch (error) {
    console.error('Error processing invoice:', error);
    await logWebhookEvent(`${event.type}_error`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      business_id: businessId,
      invoice_id: invoiceId
    }, supabase);
  }
}

export async function handleSubscriptionEvent(event: Stripe.Event, supabase: any) {
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
  
  if (businessError) {
    console.error('Error finding business:', businessError);
    return;
  }
  
  if (!business) {
    console.error('Business not found with customer ID:', customerId, 'Subscription ID:', subscriptionId);
    console.log('Searching for any business with missing customer ID that might match this subscription...');
    
    // Look for business in metadata as fallback
    try {
      const metadata = subscription.metadata as any;
      if (metadata?.businessId || metadata?.business_id) {
        const businessId = metadata.businessId || metadata.business_id;
        console.log(`Found business ID in metadata: ${businessId}`);
        
        // Update the business with this customer ID
        const { error: updateError } = await supabase
          .from('businesses')
          .update({
            stripe_customer_id: customerId,
          })
          .eq('id', businessId);
          
        if (updateError) {
          console.error('Failed to update business with customer ID:', updateError);
          return;
        }
        
        // Continue using this business ID
        business.id = businessId;
      } else {
        console.error('No business ID found in metadata. Cannot proceed with subscription event processing.');
        return;
      }
    } catch (err) {
      console.error('Error searching for business via metadata:', err);
      return;
    }
  }
  
  // Update subscription status
  const businessId = business.id;
  console.log(`Processing subscription for business ID: ${businessId}`);
  
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Error creating subscription:', insertError);
        console.error('Subscription data:', {
          business_id: businessId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: dbStatus,
          plan_id: product
        });
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

    // --- NEW: Upsert user_balance for business owner on subscription activation ---
    if (dbStatus === 'active' || dbStatus === 'trialing') {
      // Find the owner user for this business
      const { data: ownerUser, error: ownerError } = await supabase
        .from('iqr_users')
        .select('id')
        .eq('business_id', businessId)
        .eq('role', 'owner')
        .single();
      if (ownerError || !ownerUser) {
        console.error('No owner user found for business', businessId, ownerError);
      } else {
        try {
          // Get the price information from Stripe to add to balance
          const priceId = subscription.items.data[0]?.price.id;
          const priceObj = await stripe.prices.retrieve(priceId);
          const priceAmount = priceObj.unit_amount ?? 0;
          const _priceCurrency = priceObj.currency;
          
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
            if (updateBalanceError) {
              console.error('Error updating user_balance:', updateBalanceError);
            } else {
              console.log(`user_balance updated for owner ${ownerUser.id}, new balance: ${newBalance}`);
            }
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
            if (insertBalanceError) {
              console.error('Error inserting user_balance:', insertBalanceError);
            } else {
              console.log(`user_balance created for owner ${ownerUser.id}, initial balance: ${initialBalance}`);
            }
          }
        } catch (err) {
          console.error('Error processing balance update:', err);
        }
      }
    }
    // --- END NEW ---
    
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
}

export async function handleCheckoutSessionCompleted(event: Stripe.Event, supabase: any) {
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

            // --- NEW: Handle user_balance for checkout completion as well ---
            // Find the owner user for this business
            const { data: ownerUser, error: ownerError } = await supabase
              .from('iqr_users')
              .select('id')
              .eq('business_id', businessId)
              .eq('role', 'owner')
              .single();
            
            if (ownerError || !ownerUser) {
              console.error('No owner user found for business', businessId, ownerError);
            } else {
              try {
                // Get the price information from Stripe to add to balance
                const priceId = subscription.items.data[0]?.price.id;
                const priceObj = await stripe.prices.retrieve(priceId);
                const priceAmount = priceObj.unit_amount ?? 0;
                const _priceCurrency = priceObj.currency;
                
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
                  if (updateBalanceError) {
                    console.error('Error updating user_balance:', updateBalanceError);
                  } else {
                    console.log(`user_balance updated for owner ${ownerUser.id}, new balance: ${newBalance}`);
                  }
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
                  if (insertBalanceError) {
                    console.error('Error inserting user_balance:', insertBalanceError);
                  } else {
                    console.log(`user_balance created for owner ${ownerUser.id}, initial balance: ${initialBalance}`);
                  }
                }
              } catch (err) {
                console.error('Error processing balance update:', err);
              }
            }
            // --- END NEW ---
            
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