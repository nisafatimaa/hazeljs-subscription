import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { PaymentModule, PaymentService, StripePaymentProvider } from '@hazeljs/payment';
import { PaymentWebhookHandler } from './webhooks/payment.webhook';
import { subscriptionService } from './services/subscription.service';

PaymentModule.forRoot({
  defaultProvider: 'stripe',
  providers: {
    stripe: new StripePaymentProvider({
      secretKey: process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_placeholder',
    }),
  },
});

// Now instantiate with no args — it reads config from the static store
const paymentService = new PaymentService();
const webhookHandler = new PaymentWebhookHandler(paymentService);

const server = http.createServer(async (req, res) => {

  // Create checkout session
  if (req.method === 'POST' && req.url === '/payment/checkout-session') {
    const body = await readBody(req);
    const { userId, priceId, email } = JSON.parse(body);

    const session = await paymentService.createCheckoutSession({
      successUrl: `${process.env.APP_URL}/success`,
      cancelUrl: `${process.env.APP_URL}/cancel`,
      customerEmail: email,
      clientReferenceId: userId,
      metadata: { userId },
      lineItems: [{
        priceData: {
          currency: 'usd',
          unitAmount: priceId === process.env.STRIPE_PRO_PRICE_ID ? 1900 : 9900,
          productData: {
            name: priceId === process.env.STRIPE_PRO_PRICE_ID ? 'Pro Plan' : 'Enterprise Plan',
          },
        },
        quantity: 1,
      }],
      subscription: { priceId },
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: session.url }));
    return;
  }

  // Stripe webhook
  if (req.method === 'POST' && req.url === '/payment/webhook/stripe') {
    const rawBody = await readBody(req);
    const signature = req.headers['stripe-signature'] as string;

    try {
      await webhookHandler.handleWebhook(rawBody, signature);
      res.writeHead(200).end('OK');
    } catch (err) {
      console.error('Webhook error:', err);
      res.writeHead(400).end('Webhook error');
    }
    return;
  }

  // Check subscription status
  if (req.method === 'GET' && req.url?.startsWith('/subscription/')) {
    const userId = req.url.split('/')[2];
    const sub = subscriptionService.getSubscription(userId);
    const tier = subscriptionService.getEffectiveTier(userId);
    const limits = subscriptionService.getLimits(userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ subscription: sub, effectiveTier: tier, limits }));
    return;
  }

  res.writeHead(404).end('Not found');
});

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

server.listen(3000, () => {
  console.log('🚀 Payment server running on :3000');
});