// src/services/subscription.service.ts
import { Subscription, SubscriptionTier, SubscriptionStatus, TIER_LIMITS, FeatureLimits } from '../types';

const subscriptions = new Map<string, Subscription>();
const usageCounts = new Map<string, number>();

export class SubscriptionService {

  createFreeSubscription(userId: string): Subscription {
    const sub: Subscription = {
      userId,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
    };
    subscriptions.set(userId, sub);
    return sub;
  }

  startTrial(userId: string): Subscription {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const sub: Subscription = {
      userId,
      tier: SubscriptionTier.PRO,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt,
    };
    subscriptions.set(userId, sub);
    return sub;
  }

  activateSubscription(
    userId: string,
    tier: SubscriptionTier,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodEnd: Date,
  ): Subscription {
    const sub: Subscription = {
      userId, tier,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd,
    };
    subscriptions.set(userId, sub);
    return sub;
  }

  markPastDue(userId: string): Subscription | null {
    const sub = subscriptions.get(userId);
    if (!sub) return null;
    sub.status = SubscriptionStatus.PAST_DUE;
    return sub;
  }

  cancelSubscription(userId: string): Subscription | null {
    const sub = subscriptions.get(userId);
    if (!sub) return null;
    sub.status = SubscriptionStatus.CANCELED;
    sub.cancelAtPeriodEnd = true;
    return sub;
  }

  downgradeToFree(userId: string): Subscription | null {
    const sub = subscriptions.get(userId);
    if (!sub) return null;
    sub.tier = SubscriptionTier.FREE;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.stripeSubscriptionId = undefined;
    return sub;
  }

  getEffectiveTier(userId: string): SubscriptionTier {
    const sub = subscriptions.get(userId);
    if (!sub) return SubscriptionTier.FREE;

    // Trial expired — treat as free
    if (sub.status === SubscriptionStatus.TRIALING && sub.trialEndsAt) {
      if (new Date() > sub.trialEndsAt) return SubscriptionTier.FREE;
    }

    // Past due — restrict to free limits
    if (sub.status === SubscriptionStatus.PAST_DUE) return SubscriptionTier.FREE;

    // Canceled — still active until period ends
    if (sub.status === SubscriptionStatus.CANCELED) {
      if (sub.currentPeriodEnd && new Date() < sub.currentPeriodEnd) return sub.tier;
      return SubscriptionTier.FREE;
    }

    return sub.tier;
  }

  getLimits(userId: string): FeatureLimits {
    return TIER_LIMITS[this.getEffectiveTier(userId)];
  }

  incrementUsage(userId: string): number {
    const next = (usageCounts.get(userId) ?? 0) + 1;
    usageCounts.set(userId, next);
    return next;
  }

  isWithinLimit(userId: string): boolean {
    return (usageCounts.get(userId) ?? 0) < this.getLimits(userId).apiCallsPerMonth;
  }

  getSubscription(userId: string): Subscription | null {
  return subscriptions.get(userId) ?? null;
}
getUsage(userId: string): number {
  return usageCounts.get(userId) ?? 0;
}
}

export const subscriptionService = new SubscriptionService();