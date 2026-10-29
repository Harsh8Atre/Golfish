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

        if (session.mode !== 'subscription' || !session.subscription) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        // Prefer subscription metadata, then checkout session metadata,
        // then the user ID attached to the checkout session.
        const userId =
          subscription.metadata?.user_id ||
          session.metadata?.user_id ||
          session.client_reference_id;

        if (!userId) {
          throw new Error(
            `Missing user ID for Checkout Session ${session.id}`
          );
        }

        const metadata = {
          ...session.metadata,
          ...subscription.metadata,
        };

        const subscriptionItem = subscription.items?.data?.[0];

        const currentPeriodEnd =
          subscriptionItem?.current_period_end ??
          subscription.current_period_end;

        const subscriptionData = {
          user_id: userId,
          plan: metadata.plan || null,
          status: mapStripeStatus(subscription.status),
          charity_id: metadata.charity_id || null,
          charity_percentage:
            metadata.charity_percentage != null
              ? Number(metadata.charity_percentage)
              : null,
          stripe_customer_id:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id,
          stripe_subscription_id: subscription.id,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null,
        };

        const { data, error } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'stripe_subscription_id',
          })
          .select();

        if (error) {
          console.error('Supabase subscription upsert failed:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });

          throw error;
        }

        if (!data?.length) {
          throw new Error(
            'Supabase upsert returned no subscription row'
          );
        }

        console.log('Subscription saved successfully:', {
          userId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

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
