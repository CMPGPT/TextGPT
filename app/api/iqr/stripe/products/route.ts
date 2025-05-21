import { NextResponse } from "next/server";
import { stripe } from '@/lib/stripe/index';

export const dynamic = 'force-dynamic'; // Ensures the route is not statically optimized

export async function GET() {
  try {
    console.log('Fetching IQR subscription plans from Stripe');
    
    // Get all active products
    const products = await stripe.products.list({
      active: true,
    });

    console.log(`Found ${products.data.length} active Stripe products`);

    // Get all associated prices
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
    });

    console.log(`Found ${prices.data.length} active recurring prices`);

    // Map prices to their respective products
    const plans = prices.data
      .filter(price => price.type === 'recurring')
      .map(price => {
        const product = price.product as any;
        const metadata = product.metadata || {};
        
        // Extract features from metadata if they exist
        const featuresList: string[] = [];
        
        // Get all feature keys, sort them numerically to maintain order
        const featureKeys = Object.keys(metadata)
          .filter(key => key.startsWith('feature_') && metadata[key])
          .sort((a, b) => {
            // Extract numeric part from the key (e.g. "feature_1" -> 1)
            const numA = parseInt(a.replace('feature_', ''), 10);
            const numB = parseInt(b.replace('feature_', ''), 10);
            return numA - numB;
          });
        
        // Add features in sorted order
        featureKeys.forEach(key => {
          featuresList.push(metadata[key]);
        });
        
        // Create features based on product description if none in metadata
        if (featuresList.length === 0 && product.description) {
          const descParts = product.description.split(/[,.]\s+/);
          featuresList.push(...descParts.filter((part: string) => part.length > 10).slice(0, 3));
        }
        
        // Format plan information
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

    // Return formatted plans
    return NextResponse.json({
      success: true,
      products: plans,
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscription plans',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 