// src/webhooks/stripe.webhook.ts
import Stripe from 'stripe';
import { subscriptionService } from '../services/subscription.service';
import { SubscriptionTier } from '../types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRO_PRICE_ID!]: SubscriptionTier.PRO,
  [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: SubscriptionTier.ENTERPRISE,
};

export class StripeWebhookHandler {

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_failed':
        await this.onPaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = stripeSub.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] ?? SubscriptionTier.PRO;

    subscriptionService.activateSubscription(
      userId, tier,
      session.customer as string,
      stripeSub.id,
      new Date((stripeSub as any).current_period_end * 1000),
    );
    console.log(`✅ Activated ${tier} for user ${userId}`);
  }

  private async onPaymentFailed(invoice: Stripe.Invoice) {
    const userId = invoice.metadata?.userId;
    if (!userId) return;
    subscriptionService.markPastDue(userId);
    console.log(`❌ Payment failed for user ${userId}`);
  }

  private async onSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;
    subscriptionService.downgradeToFree(userId);
    console.log(`⬇️ Downgraded user ${userId} to free`);
  }

  private async onSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;
    const priceId = stripeSub.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] ?? SubscriptionTier.FREE;

    subscriptionService.activateSubscription(
      userId, tier,
      stripeSub.customer as string,
      stripeSub.id,
      new Date((stripeSub as any).current_period_end * 1000),
    );
  }
}

export const webhookHandler = new StripeWebhookHandler();