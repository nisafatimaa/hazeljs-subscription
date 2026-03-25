// src/guards/subscription.guards.ts
import { subscriptionService } from '../services/subscription.service';
import { SubscriptionTier, SubscriptionStatus } from '../types';

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
}

export interface Guard {
  check(userId: string): GuardResult;
}

// Must have active subscription (not past_due, not expired)
export class ActiveSubscriptionGuard implements Guard {
  check(userId: string): GuardResult {
    const sub = subscriptionService.getSubscription(userId);
    if (!sub) return { allowed: false, reason: 'No subscription found' };

    if (sub.status === SubscriptionStatus.PAST_DUE) {
      return { allowed: false, reason: 'Payment failed. Please update your billing details.' };
    }
    return { allowed: true };
  }
}

// Feature requires minimum tier
export class TierGuard implements Guard {
  constructor(private requiredTier: SubscriptionTier) {}

  check(userId: string): GuardResult {
    const tierRank = { free: 0, pro: 1, enterprise: 2 };
    const userRank = tierRank[subscriptionService.getEffectiveTier(userId)];
    const requiredRank = tierRank[this.requiredTier];

    if (userRank < requiredRank) {
      return {
        allowed: false,
        reason: `This feature requires ${this.requiredTier} plan.`,
        upgradeRequired: this.requiredTier,
      };
    }
    return { allowed: true };
  }
}

// Check monthly usage limit
export class UsageLimitGuard implements Guard {
  check(userId: string): GuardResult {
    if (!subscriptionService.isWithinLimit(userId)) {
      const limits = subscriptionService.getLimits(userId);
      return {
        allowed: false,
        reason: `Monthly limit of ${limits.apiCallsPerMonth} API calls reached.`,
        upgradeRequired: SubscriptionTier.PRO,
      };
    }
    return { allowed: true };
  }
}

// Check boolean feature flag
export class FeatureFlagGuard implements Guard {
  constructor(private feature: 'exportEnabled' | 'prioritySupport' | 'customDomain') {}

  check(userId: string): GuardResult {
    if (!subscriptionService.getLimits(userId)[this.feature]) {
      return {
        allowed: false,
        reason: `${this.feature} is not available on your current plan.`,
        upgradeRequired: SubscriptionTier.PRO,
      };
    }
    return { allowed: true };
  }
}

// Chain multiple guards — all must pass
export class GuardChain {
  private guards: Guard[] = [];

  add(guard: Guard): this {
    this.guards.push(guard);
    return this;
  }

  check(userId: string): GuardResult {
    for (const guard of this.guards) {
      const result = guard.check(userId);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  }
}