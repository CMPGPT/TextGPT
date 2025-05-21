import Stripe from 'stripe';

// Initialize Stripe client
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - To avoid type issues with API version string
  apiVersion: '2023-08-16',
  appInfo: {
    name: 'Hotbox Subscription',
    version: '0.1.0',
  },
});

// Export the instance for server-side only usage
export const stripe = stripeClient;

// Server actions
export async function getStripeCustomer(email: string, name?: string) {
  'use server';
  // Check if customer already exists
  const customers = await stripeClient.customers.list({ email });
  
  if (customers.data.length) {
    // Return existing customer
    return customers.data[0].id;
  }
  
  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    name: name || email,
    metadata: {
      source: 'hotbox-subscription-portal',
    },
  });
  
  return customer.id;
}

export async function getSubscriptionPlans() {
  'use server';
  
  // Get all active products
  const products = await stripeClient.products.list({
    active: true,
  });

  console.log(`Found ${products.data.length} active products`);

  // Get all recurring prices
  const prices = await stripeClient.prices.list({
    active: true,
    type: 'recurring',
    expand: ['data.product'],
  });

  console.log(`Found ${prices.data.length} recurring prices`);

  // Map prices to their respective products
  const plans = prices.data
    .filter(price => price.type === 'recurring')
    .map(price => {
      const product = price.product as Stripe.Product;
      const metadata = product.metadata || {};
      
      console.log(`Processing product ${product.name} with id ${product.id}`);
      console.log(`Metadata:`, metadata);
      
      // Extract features from metadata if they exist
      const featuresList: string[] = [];
      
      // Get all feature keys, sort them numerically to maintain order
      const featureKeys = Object.keys(metadata)
        .filter(key => key.startsWith('feature_') && metadata[key])
        .sort((a, b) => {
          // Extract the numeric part from the key (e.g. "feature_1" -> 1)
          const numA = parseInt(a.replace('feature_', ''), 10);
          const numB = parseInt(b.replace('feature_', ''), 10);
          return numA - numB;
        });
      
      console.log(`Found ${featureKeys.length} feature keys:`, featureKeys);
      
      // Add features in the sorted order
      featureKeys.forEach(key => {
        featuresList.push(metadata[key]);
      });
      
      // Create features based on product description if no features in metadata
      if (featuresList.length === 0 && product.description) {
        // Split the description by periods or commas and extract features
        const descParts = product.description.split(/[,.]\s+/);
        featuresList.push(...descParts.filter(part => part.length > 10).slice(0, 3));
        console.log(`No features in metadata, extracted ${featuresList.length} features from description`);
      }
      
      console.log(`Final features list for ${product.name}:`, featuresList);
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        image: product.images?.[0],
        price: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        interval: price.recurring?.interval || 'month',
        priceId: price.id,
        features: featuresList,
        metadata: product.metadata,
      };
    });

  return plans;
}

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
  mode = 'subscription',
}: {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription';
}) {
  'use server';
  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      source: 'hotbox-subscription-portal',
    },
  });

  return session;
}

// Stripe webhook event handling
export async function handleSubscriptionChange(event: Stripe.Event) {
  'use server';
  // Handle subscription created or updated
  if (event.type === 'customer.subscription.created' || 
      event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    // Logic to update user subscription status in database
    console.log(`Subscription ${event.type} for customer ${customerId}`);
    
    return {
      status: 'success',
      subscription,
    };
  }
  
  // Handle subscription deleted/canceled
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    // Logic to update user subscription status in database
    console.log(`Subscription canceled for customer ${customerId}`);
    
    return {
      status: 'success',
      subscription,
    };
  }
  
  return {
    status: 'ignored',
  };
}

// Handle payment-related webhook events
export async function handlePaymentEvent(event: Stripe.Event) {
  'use server';
  // Handle successful payments
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const customerId = paymentIntent.customer as string;
    const amount = paymentIntent.amount;
    const currency = paymentIntent.currency;
    
    // Logic to update user purchase record in database
    console.log(`Payment of ${amount/100} ${currency} succeeded for customer ${customerId}`);
    
    return {
      status: 'success',
      paymentIntent,
    };
  }
  
  // Handle failed payments
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const customerId = paymentIntent.customer as string;
    const error = paymentIntent.last_payment_error;
    
    // Logic to handle failed payment
    console.log(`Payment failed for customer ${customerId}: ${error?.message || 'Unknown error'}`);
    
    return {
      status: 'failed',
      paymentIntent,
      error,
    };
  }
  
  return {
    status: 'ignored',
  };
} 