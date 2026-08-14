export type SubscriptionStatus = 'active' | 'inactive';

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
