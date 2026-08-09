export type SubscriptionStatus = 'active' | 'inactive';
export type SubscriberStatus = 'active' | 'expired' | 'suspended';
export type BillingCycle = 'monthly' | 'yearly' | 'free';
export type TransactionStatus = 'success' | 'failed' | 'refunded';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxLinktrees: number | 'unlimited';
  status: SubscriptionStatus;
  customDomainEnabled: boolean;
  pixelTrackingEnabled: boolean;
  premiumTemplatesEnabled: boolean;
  removeBrandingEnabled: boolean;
  seoCustomizationEnabled: boolean;
}

export interface Subscriber {
  id: string;
  businessName: string;
  username: string;
  planId: string;
  status: SubscriberStatus;
  startDate: string;
  renewDate: string;
  billingCycle: BillingCycle;
}

export interface BillingTransaction {
  id: string;
  businessName: string;
  planName: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  paymentMethod: string;
}
