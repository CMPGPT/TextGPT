import { Subscription, SubscriptionPlan } from './index';

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
  limit?: number;
}

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: PlanFeature[];
  popular?: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface SubscriptionManagementLink {
  url: string;
  expiresAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface BillingHistory {
  id: string;
  userId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  createdAt: Date;
  description: string;
  receiptUrl?: string;
} 