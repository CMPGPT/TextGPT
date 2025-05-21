// Define the subscription plan type
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  priceId: string;
  features: string[];
  popular?: boolean;
  metadata?: Record<string, string>;
}

// Mock subscription plans for local development or testing
export const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "price_buyer",
    name: "Buyer",
    description: "Access to wholesale suppliers and products",
    price: 9.99,
    currency: "usd",
    interval: "month",
    priceId: "price_1RPhzhQmAqUquWOhSzhchIwi",
    features: [
      "Access to wholesale storefronts",
      "Direct messaging with wholesale vendors",
      "View bulk pricing",
      "Smart Toggle to hide wholesale access",
      "All free features included"
    ],
    popular: true
  },
  {
    id: "price_retailer",
    name: "Retailer",
    description: "Sell your products directly to consumers",
    price: 29.99,
    currency: "usd",
    interval: "month",
    priceId: "price_1RPhzyQmAqUquWOhXJgmehkk",
    features: [
      "Manage your retail storefront",
      "Sell products to all users",
      "Access to wholesale vendors for sourcing",
      "Analytics dashboard",
      "Priority customer support"
    ]
  },
  {
    id: "price_bulk_seller",
    name: "Bulk Seller",
    description: "Sell in bulk to retail vendors and paid buyers",
    price: 49.99,
    currency: "usd",
    interval: "month",
    priceId: "price_1RPi0HQmAqUquWOhOtDCldwN",
    features: [
      "Manage your wholesale storefront",
      "Sell to retail vendors and paid buyers",
      "Set bulk pricing tiers",
      "Advanced analytics",
      "Priority support and account manager"
    ]
  }
]; 