import { NextRequest, NextResponse } from "next/server";
import { stripe, handleSubscriptionChange, handlePaymentEvent } from "@/lib/stripe/index";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
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
        body,
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

    // Handle the webhook event based on its type
    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle subscription-related events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const result = await handleSubscriptionChange(event);
      
      if (result.status === "success") {
        return NextResponse.json({ received: true });
      }
    }

    // Handle payment-related events
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed" ||
      event.type === "checkout.session.completed"
    ) {
      const result = await handlePaymentEvent(event);
      
      if (result.status === "success" || result.status === "failed") {
        return NextResponse.json({ received: true });
      }
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