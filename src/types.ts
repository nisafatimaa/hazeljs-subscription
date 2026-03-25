// src/types.ts
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export interface Subscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface FeatureLimits {
  apiCallsPerMonth: number;
  teamMembers: number;
  projects: number;
  aiRequests: number;
  exportEnabled: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  [SubscriptionTier.FREE]: {
    apiCallsPerMonth: 100,
    teamMembers: 1,
    projects: 3,
    aiRequests: 10,
    exportEnabled: false,
    prioritySupport: false,
    customDomain: false,
  },
  [SubscriptionTier.PRO]: {
    apiCallsPerMonth: 10000,
    teamMembers: 10,
    projects: 50,
    aiRequests: 1000,
    exportEnabled: true,
    prioritySupport: true,
    customDomain: false,
  },
  [SubscriptionTier.ENTERPRISE]: {
    apiCallsPerMonth: Infinity,
    teamMembers: Infinity,
    projects: Infinity,
    aiRequests: Infinity,
    exportEnabled: true,
    prioritySupport: true,
    customDomain: true,
  },
};