import { supabase } from '../config/supabase.js';

/**
 * Checks if a user has an active subscription.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'TRIALING'])
      .single();
      
    return !!data;
  } catch (err) {
    console.error('Error checking subscription status:', err);
    return false;
  }
};
