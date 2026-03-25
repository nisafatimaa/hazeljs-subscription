// test/test.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { subscriptionService } from '../src/services/subscription.service';
import { SubscriptionTier } from '../src/types';
import { ActiveSubscriptionGuard, TierGuard } from '../src/guards/subscription.guard';

// Free user
const freeUser = 'user_free_001';
subscriptionService.createFreeSubscription(freeUser);
console.log(new TierGuard(SubscriptionTier.PRO).check(freeUser));
// { allowed: false, reason: 'This feature requires pro plan.', upgradeRequired: 'pro' }

// Trial user gets PRO access
const trialUser = 'user_trial_001';
subscriptionService.startTrial(trialUser);
console.log(new TierGuard(SubscriptionTier.PRO).check(trialUser));
// { allowed: true }

// Simulate trial expiry
const expiredSub = subscriptionService.getSubscription(trialUser)!;
expiredSub.trialEndsAt = new Date(Date.now() - 1000);
console.log(subscriptionService.getEffectiveTier(trialUser)); // 'free'

// Failed payment locks access
const proUser = 'user_pro_001';
subscriptionService.activateSubscription(proUser, SubscriptionTier.PRO, 'cus_123', 'sub_456', new Date(Date.now() + 30 * 86400000));
subscriptionService.markPastDue(proUser);
console.log(new ActiveSubscriptionGuard().check(proUser));
// { allowed: false, reason: 'Payment failed. Please update your billing details.' }