import { supabase } from '../config/supabase.js';

/**
 * Ensures only the latest 5 scores (by played_at DESC) are retained.
 * Deletes older scores.
 */
const enforceLatestFiveLimit = async (userId) => {
  // Fetch all scores for the user ordered by played_at DESC, then created_at DESC as tie-breaker
  const { data: scores, error } = await supabase
    .from('scores')
    .select('id')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (scores.length > 5) {
    // Keep first 5, delete the rest
    const idsToDelete = scores.slice(5).map(s => s.id);
    
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('scores')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) throw deleteError;
    }
  }
};

export const getScores = async (userId) => {
  const { data, error } = await supabase
    .from('scores')
    .select('id, score, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createScore = async (userId, score, playedAt) => {
  const { data, error } = await supabase
    .from('scores')
    .insert([{
      user_id: userId,
      score,
      played_at: playedAt
    }])
    .select('id, score, played_at')
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('DUPLICATE_DATE');
    }
    throw error;
  }

  // Enforce latest 5 limit after successful insertion
  await enforceLatestFiveLimit(userId);

  return data;
};

export const updateScore = async (userId, scoreId, score, playedAt) => {
  // Ensure the score belongs to the user
  const { data: existingScore, error: fetchError } = await supabase
    .from('scores')
    .select('id')
    .eq('id', scoreId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingScore) {
    throw new Error('NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('scores')
    .update({
      score,
      played_at: playedAt
    })
    .eq('id', scoreId)
    .select('id, score, played_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('DUPLICATE_DATE');
    }
    throw error;
  }

  // Enforce latest 5 limit in case changing the date pushes it or something else out
  await enforceLatestFiveLimit(userId);

  return data;
};
