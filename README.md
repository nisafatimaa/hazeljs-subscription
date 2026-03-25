```markdown
# HazelJS Subscription & Paywall System

A production-ready subscription and paywall system built with [HazelJS](https://hazeljs.ai/?ref=jhear) and Stripe.

## What It Does

- Subscription tiers (Free, Pro, Enterprise) with per-tier feature limits
- Guards that block access based on tier, usage, and payment status
- Stripe webhook handling for every billing event
- Trial periods that automatically fall back to free on expiry
- Failed payment handling that restricts access without deleting the account

## Project Structure

```
src/
├── types.ts                          # Tiers, limits, interfaces
├── services/subscription.service.ts  # Core subscription logic
├── guards/subscription.guards.ts     # Feature gating guards
└── webhooks/stripe.webhook.ts        # Stripe event handling
test/
└── test.ts                           # Local tests, no Stripe keys needed
```

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Stripe keys
```

## Test Locally

```bash
npx ts-node test/test.ts
```

No Stripe account needed for local testing — all billing scenarios are simulated.

## Built With

- [HazelJS](https://hazeljs.ai/?ref=jhear) — TypeScript-first Node.js framework
- [Stripe](https://stripe.com) — Billing and webhooks
```
