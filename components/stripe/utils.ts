// Stripe-specific utility functions

// Format subscription status
export function formatSubscriptionStatus(status: string) {
  const statusMap: Record<string, string> = {
    active: "Active",
    canceled: "Canceled",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    past_due: "Past Due",
    trialing: "Trial",
    unpaid: "Unpaid",
  }

  return statusMap[status] || status
}

// Role mapping from subscription product ID to user role
export function mapProductToRole(productId: string) {
  const roleMap: Record<string, string> = {
    price_paid_buyer: "paid_buyer",
    price_retail_vendor: "retail_vendor",
    price_wholesale_vendor: "wholesale_vendor",
  }

  return roleMap[productId] || "visitor"
}

// Format price for display
export function formatStripePrice(
  price: number,
  currency: string = "USD",
  notation: "compact" | "standard" = "standard"
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation,
  }).format(price)
}

// Validate that required Stripe env variables exist
export function validateStripeEnv() {
  const requiredEnvVars = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ]

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  )

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables: ${missingEnvVars.join(", ")}`
    )
  }

  return true
} 