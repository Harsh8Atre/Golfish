import { supabase } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';

export const checkout = async (req, res) => {
  try {
    const { plan, charityId, charityPercentage } = req.body;
    const userId = req.user.userId;

    // 1. Validate inputs
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }
    const parsedPercentage = parseFloat(charityPercentage);
    if (isNaN(parsedPercentage) || parsedPercentage < 10 || parsedPercentage > 100) {
      return res.status(400).json({ success: false, message: 'Charity percentage must be between 10 and 100' });
    }

    // 2. Validate Charity Exists
    const { data: charity, error: charityError } = await supabase
      .from('charities')
      .select('id')
      .eq('id', charityId)
      .eq('active', true)
      .single();

    if (charityError || !charity) {
      return res.status(400).json({ success: false, message: 'Invalid charity selected' });
    }

    // 3. Prevent duplicate active subscriptions
    const { data: existingSubs, error: existingSubError } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'TRIALING'])
      .limit(1);

    if (existingSubError) {
      console.error('Subscription check error:', existingSubError);

      return res.status(500).json({
        success: false,
        message: 'Failed to check existing subscription'
      });
    }

    if (existingSubs && existingSubs.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    // 4. Map to Stripe Price ID
    const priceId = plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_YEARLY;
    if (!priceId) {
      return res.status(500).json({ success: false, message: 'Stripe prices are not configured' });
    }

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          user_id: userId,
          charity_id: charityId,
          charity_percentage: parsedPercentage,
          plan: plan.toUpperCase()
        }
      }
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSubscription = async (req, res) => {
  try {
    console.log("🔥 USER FROM TOKEN:", req.user);
    console.log("🔥 USER ID:", req.user.userId); 
    const userId = req.user.userId;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        id, plan, status, charity_percentage, current_period_end, stripe_subscription_id,
        charities (id, name)
      `)
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'TRIALING'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Get subscription DB error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription'
      });
    }

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null
      });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        charityPercentage: subscription.charity_percentage,
        currentPeriodEnd: subscription.current_period_end,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        charity: subscription.charities
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'TRIALING'])
      .single();

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(404).json({ success: false, message: 'No active subscription found' });
    }

    // Cancel in Stripe (cancel at period end)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // We let the webhook handle the actual DB status update if we want, or we can update it immediately to 'CANCELED' 
    // depending on business rules. Stripe will send a customer.subscription.updated event.
    
    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period.' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
