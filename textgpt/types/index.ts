// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  subscription?: Subscription;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  createdAt: Date;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
}

// QR Code types
export interface QRCode {
  id: string;
  userId: string;
  service: Service;
  title: string;
  url: string;
  createdAt: Date;
  usage: number;
  contextId?: string;
}

export enum Service {
  IQR = 'iqr',
  KIWI = 'kiwi',
}

// Context/Upload types
export interface Context {
  id: string;
  userId: string;
  service: Service;
  title: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  createdAt: Date;
}

// Chat types
export interface ChatMessage {
  id: string;
  userId: string;
  qrCodeId: string;
  content: string;
  role: MessageRole;
  createdAt: Date;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
} 