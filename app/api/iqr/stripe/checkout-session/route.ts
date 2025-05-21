import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, getStripeCustomer } from "@/lib/stripe/index";

const isDevelopment = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  try {
    const { priceId, email, name } = await request.json();

    if (!priceId || !email) {
      return NextResponse.json(
        { error: 'Price ID and email are required' },
        { status: 400 }
      );
    }

    // Get or create customer
    const customerId = await getStripeCustomer(email, name);

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/stripe/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/stripe/subscription`;

    const session = await createCheckoutSession({
      priceId,
      customerId,
      successUrl,
      cancelUrl,
      mode: 'subscription',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 