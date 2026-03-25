import { PaymentService } from '@hazeljs/payment';
import { subscriptionService } from '../services/subscription.service';
import { SubscriptionTier } from '../types';

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRO_PRICE_ID ?? 'price_pro']: SubscriptionTier.PRO,
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_enterprise']: SubscriptionTier.ENTERPRISE,
};

export class PaymentWebhookHandler {
  constructor(private paymentService: PaymentService) {}

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
   const event = this.paymentService.parseWebhookEvent('stripe', rawBody, signature) as any;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data);
        break;
      case 'invoice.payment_failed':
        await this.onPaymentFailed(event.data);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data);
        break;
      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(data: any) {
    const userId = data.metadata?.userId;
    if (!userId) return;

    const subscriptions = await this.paymentService.listSubscriptions(data.customer);
    const activeSub = subscriptions[0];
    if (!activeSub) return;

    const tier = PRICE_TO_TIER[activeSub.priceId] ?? SubscriptionTier.PRO;

    subscriptionService.activateSubscription(
      userId,
      tier,
      data.customer,
      activeSub.id,
      new Date(activeSub.currentPeriodEnd),
    );
    console.log(`✅ Activated ${tier} for user ${userId}`);
  }

  private async onPaymentFailed(data: any) {
    const userId = data.metadata?.userId;
    if (!userId) return;
    subscriptionService.markPastDue(userId);
    console.log(`❌ Payment failed for user ${userId}`);
  }

  private async onSubscriptionDeleted(data: any) {
    const userId = data.metadata?.userId;
    if (!userId) return;
    subscriptionService.downgradeToFree(userId);
    console.log(`⬇️ Downgraded user ${userId} to free`);
  }

  private async onSubscriptionUpdated(data: any) {
    const userId = data.metadata?.userId;
    if (!userId) return;
    const priceId = data.items?.data?.[0]?.price?.id;
    const tier = PRICE_TO_TIER[priceId] ?? SubscriptionTier.FREE;

    subscriptionService.activateSubscription(
      userId,
      tier,
      data.customer,
      data.id,
      new Date(data.currentPeriodEnd),
    );
    console.log(`🔄 Updated ${userId} to ${tier}`);
  }
}