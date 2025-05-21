import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionPlans } from "@/lib/stripe/index";

export const dynamic = 'force-dynamic'; // Ensures the route is not statically optimized

export async function GET(request: NextRequest) {
  try {
    const products = await getSubscriptionPlans();

    // Create response with no-cache headers
    const response = NextResponse.json({
      products,
      success: true,
    });
    
    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch subscription plans",
        success: false,
      },
      { status: 500 }
    );
  }
} 