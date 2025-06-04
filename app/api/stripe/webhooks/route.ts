import { NextRequest, NextResponse } from "next/server";

// This endpoint exists to redirect webhook requests to the proper handler
// since the webhook URL is textg.pt/api/stripe/webhooks but our handler is at /api/iqr/stripe/webhooks
export async function POST(req: NextRequest) {
  console.log('Received webhook at /api/stripe/webhooks, forwarding to /api/iqr/stripe/webhooks');
  
  try {
    // Forward the request to the actual handler
    const response = await fetch(new URL('/api/iqr/stripe/webhooks', req.url), {
      method: 'POST',
      headers: req.headers,
      body: req.body
    });
    
    // Return the response from the actual handler
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error('Error forwarding webhook:', error);
    return NextResponse.json(
      { error: "Error forwarding webhook request" },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ message: "Stripe webhook endpoint is working" });
} 