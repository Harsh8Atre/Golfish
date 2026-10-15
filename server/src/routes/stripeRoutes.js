import express from 'express';
import { stripe } from '../config/stripe.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Helper to map Stripe status to our DB status
const mapStripeStatus = (stripeStatus) => {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'CANCELED';
    default:
      return 'INACTIVE';
  }
};

// Webhook endpoint requires raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription;
          // Retrieve subscription to get metadata
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const metadata = subscription.metadata;
          if (metadata && metadata.user_id) {
            const { data, error } = await supabase
              .from('subscriptions')
              .upsert(
                [{
                  user_id: metadata.user_id,
                  plan: metadata.plan,
                  status: mapStripeStatus(subscription.status),
                  charity_id: metadata.charity_id,
                  charity_percentage: parseFloat(metadata.charity_percentage),
                  stripe_customer_id: session.customer,
                  stripe_subscription_id: subscription.id,
                  current_period_end: new Date(
                    subscription.current_period_end * 1000
                  ).toISOString()
                }],
                {
                  onConflict: 'stripe_subscription_id'
                }
              )
              .select();

            console.log('Subscription upserted:', data);
            console.log('Supabase error:', error);
          }
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        console.log('Subscription event:', event.type);
        console.log('Subscription ID:', subscription.id);
        console.log('Subscription status:', subscription.status);

        const subscriptionItem = subscription.items?.data?.[0];

        const currentPeriodEnd =
          subscriptionItem?.current_period_end
            ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
            : null;

        console.log('Current period end:', currentPeriodEnd);

        const updateData = {
          status: mapStripeStatus(subscription.status),
        };

        if (currentPeriodEnd) {
          updateData.current_period_end = currentPeriodEnd;
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)
          .select();

        console.log('Supabase updated:', data);
        console.log('Supabase error:', error);

        if (error) {
          throw error;
        }

        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
