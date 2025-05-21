import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Force dynamic execution for this route
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");
    const productType = req.nextUrl.searchParams.get("productType") || "all";
    
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      expand: ["data.default_payment_method"],
    });

    // Filter subscriptions by product type if specified
    let filteredSubscriptions = subscriptions.data;
    
    if (productType !== "all") {
      filteredSubscriptions = subscriptions.data.filter((subscription) => {
        return subscription.metadata.productType === productType;
      });
    }

    return NextResponse.json({
      success: true,
      subscriptions: filteredSubscriptions.map((subscription) => {
        return {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000) 
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          items: subscription.items.data.map((item) => ({
            id: item.id,
            price: item.price,
          })),
          metadata: subscription.metadata,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Error fetching subscription status" },
      { status: 500 }
    );
  }
} 