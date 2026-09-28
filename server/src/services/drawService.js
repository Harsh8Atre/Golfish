import { supabase } from '../config/supabase.js';

/**
 * 1. ASSUMPTION: 5 Stableford scores directly become the 5 draw entry numbers.
 * 2. ASSUMPTION: Duplicate scores in a user's entry are counted as a single unique value for matching against draw numbers.
 */

// Generate 5 unique random integers between 1 and 45
const generateDrawNumbers = () => {
  const nums = new Set();
  while (nums.size < 5) {
    nums.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
};

// Check if month already has a published draw
const hasPublishedDrawForMonth = async (monthStr) => {
  // monthStr is expected to be 'YYYY-MM'
  // Since we don't have a specific month column, we'll fetch all published draws and check in JS for MVP simplicity
  const { data: draws, error } = await supabase
    .from('draws')
    .select('id, draw_date')
    .eq('status', 'PUBLISHED');

  if (error) throw error;

  return draws.some(draw => {
    const drawMonth = new Date(draw.draw_date).toISOString().slice(0, 7);
    return drawMonth === monthStr;
  });
};

// Get rollover from the previous published draw (if any)
const getRolloverAmount = async () => {
  // Find the most recently published draw
  const { data: latestDraw, error } = await supabase
    .from('draws')
    .select('id, five_match_pool')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found
  
  if (!latestDraw) return 0;

  // Check if it had any 5-match winners
  const { count, error: winnerError } = await supabase
    .from('winners')
    .select('*', { count: 'exact', head: true })
    .eq('draw_id', latestDraw.id)
    .eq('match_type', 5);

  if (winnerError) throw winnerError;

  // If no winners, the 5-match pool rolls over
  return count === 0 ? parseFloat(latestDraw.five_match_pool || 0) : 0;
};

// Get total active subscribers for prize pool calculation
const getActiveSubscriberCount = async () => {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['ACTIVE', 'TRIALING']);

  if (error) throw error;
  return count || 0;
};

// Fetch eligible participants
// To be eligible, must have active/trialing subscription AND 5 scores
const getEligibleParticipants = async () => {
  // 1. Get all active subscriptions
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('status', ['ACTIVE', 'TRIALING']);

  if (subError) throw subError;

  const activeUserIds = subs.map(s => s.user_id);
  
  if (activeUserIds.length === 0) return [];

  // 2. Get scores for these users
  const { data: scores, error: scoreError } = await supabase
    .from('scores')
    .select('user_id, score, played_at')
    .in('user_id', activeUserIds)
    .order('played_at', { ascending: false });

  if (scoreError) throw scoreError;

  // 3. Group and filter
  const userScores = {};
  for (const s of scores) {
    if (!userScores[s.user_id]) userScores[s.user_id] = [];
    userScores[s.user_id].push(s);
  }

  const eligible = [];
  for (const userId of Object.keys(userScores)) {
    // Only take users with exactly 5 scores (enforceLatestFiveLimit ensures max is 5, but we check if they have at least 5)
    if (userScores[userId].length === 5) {
      // Map to unique numbers for matching logic
      // Note: we store raw scores, but unique set is used for matching
      const entryNumbers = userScores[userId].map(s => s.score);
      eligible.push({
        userId,
        scores: entryNumbers,
        uniqueScores: new Set(entryNumbers)
      });
    }
  }

  return eligible;
};

// Calculate match count for a given user entry against draw numbers
const getMatchCount = (userUniqueScores, drawNumbersSet) => {
  let matches = 0;
  for (const score of userUniqueScores) {
    if (drawNumbersSet.has(score)) {
      matches++;
    }
  }
  return matches;
};

export const simulateDraw = async (monthStr) => {
  if (await hasPublishedDrawForMonth(monthStr)) {
    throw new Error('A draw has already been published for this month.');
  }

  const numbers = generateDrawNumbers();
  const drawSet = new Set(numbers);
  
  const participants = await getEligibleParticipants();
  
  const matchCounts = { 5: 0, 4: 0, 3: 0 };
  const winners = [];

  for (const p of participants) {
    const matches = getMatchCount(p.uniqueScores, drawSet);
    if (matches >= 3) {
      matchCounts[matches]++;
      winners.push({
        userId: p.userId,
        matches,
        entry: p.scores
      });
    }
  }

  // PRD Ambiguity: The exact fixed portion of each subscription contributing to the prize pool is not specified.
  // MVP Assumption: We assume a fixed contribution of ₹100 (or currency units) per eligible active subscriber.
  // A configurable ENV variable is used, defaulting to 100.
  const contributionPerUser = parseInt(process.env.PRIZE_POOL_CONTRIBUTION_PER_USER || '100', 10);
  const activeSubscribers = await getActiveSubscriberCount();
  const basePrizePool = activeSubscribers * contributionPerUser;

  // Calculate Pools (integer math in cents to avoid float issues)
  const basePoolCents = Math.round(basePrizePool * 100);
  const rolloverCents = Math.round((await getRolloverAmount()) * 100);
  
  const fiveMatchPoolCents = Math.round(basePoolCents * 0.40) + rolloverCents;
  const fourMatchPoolCents = Math.round(basePoolCents * 0.35);
  const threeMatchPoolCents = Math.round(basePoolCents * 0.25);

  // Helper to split pool among winners
  const splitPool = (poolCents, winnerCount) => {
    if (winnerCount === 0) return { payout: 0, remainder: 0 };
    const payout = Math.floor(poolCents / winnerCount);
    const remainder = poolCents % winnerCount;
    return { payout, remainder };
  };

  const fiveSplit = splitPool(fiveMatchPoolCents, matchCounts[5]);
  const fourSplit = splitPool(fourMatchPoolCents, matchCounts[4]);
  const threeSplit = splitPool(threeMatchPoolCents, matchCounts[3]);

  // Construct response
  return {
    month: monthStr,
    numbers,
    participants: participants.length,
    basePrizePool: basePrizePool,
    rolloverApplied: rolloverCents / 100,
    totalPrizePool: (basePoolCents + rolloverCents) / 100,
    matches: matchCounts,
    tiers: {
      fiveMatch: {
        pool: fiveMatchPoolCents / 100,
        payoutPerWinner: fiveSplit.payout / 100
      },
      fourMatch: {
        pool: fourMatchPoolCents / 100,
        payoutPerWinner: fourSplit.payout / 100
      },
      threeMatch: {
        pool: threeMatchPoolCents / 100,
        payoutPerWinner: threeSplit.payout / 100
      }
    },
    // We don't save winners in simulate, but we return data to admin
    simulatedWinners: winners
  };
};

export const publishDraw = async (monthStr, simulationNumbers) => {
  if (await hasPublishedDrawForMonth(monthStr)) {
    throw new Error('A draw has already been published for this month.');
  }

  if (!simulationNumbers || !Array.isArray(simulationNumbers) || simulationNumbers.length !== 5) {
    throw new Error('Simulation numbers are required to publish the draw.');
  }

  // Use provided simulation numbers instead of generating new ones
  const numbers = [...simulationNumbers].sort((a, b) => a - b);
  const drawSet = new Set(numbers);
  const participants = await getEligibleParticipants();
  
  const matchCounts = { 5: 0, 4: 0, 3: 0 };
  const rawWinners = [];

  for (const p of participants) {
    const matches = getMatchCount(p.uniqueScores, drawSet);
    if (matches >= 3) {
      matchCounts[matches]++;
      rawWinners.push({
        userId: p.userId,
        matches
      });
    }
  }

  // PRD Ambiguity: The exact fixed portion of each subscription contributing to the prize pool is not specified.
  // MVP Assumption: Configurable contribution defaulting to 100 per eligible subscriber.
  const contributionPerUser = parseInt(process.env.PRIZE_POOL_CONTRIBUTION_PER_USER || '100', 10);
  const activeSubscribers = await getActiveSubscriberCount();
  const basePrizePool = activeSubscribers * contributionPerUser;

  // Calculate Pools
  const basePoolCents = Math.round(basePrizePool * 100);
  const rolloverCents = Math.round((await getRolloverAmount()) * 100);
  
  const fiveMatchPoolCents = Math.round(basePoolCents * 0.40) + rolloverCents;
  const fourMatchPoolCents = Math.round(basePoolCents * 0.35);
  const threeMatchPoolCents = Math.round(basePoolCents * 0.25);

  const splitPool = (poolCents, winnerCount) => {
    if (winnerCount === 0) return { payout: 0, remainder: 0 };
    const payout = Math.floor(poolCents / winnerCount);
    const remainder = poolCents % winnerCount;
    return { payout, remainder };
  };

  const fiveSplit = splitPool(fiveMatchPoolCents, matchCounts[5]);
  const fourSplit = splitPool(fourMatchPoolCents, matchCounts[4]);
  const threeSplit = splitPool(threeMatchPoolCents, matchCounts[3]);

  // Insert Draw Record
  // Construct a date representing the month (e.g. 1st day of month at midnight UTC)
  const drawDate = new Date(`${monthStr}-01T00:00:00Z`);

  const { data: drawRecord, error: drawError } = await supabase
    .from('draws')
    .insert([{
      draw_date: drawDate.toISOString(),
      status: 'PUBLISHED',
      number_1: numbers[0],
      number_2: numbers[1],
      number_3: numbers[2],
      number_4: numbers[3],
      number_5: numbers[4],
      prize_pool: basePrizePool,
      five_match_pool: fiveMatchPoolCents / 100,
      four_match_pool: fourMatchPoolCents / 100,
      three_match_pool: threeMatchPoolCents / 100,
      published_at: new Date().toISOString()
    }])
    .select('id')
    .single();

  if (drawError) throw drawError;

  // Insert Winner Records
  const winnerInserts = [];
  
  // Track remainders so we give the extra paise to the first winner in each tier deterministically
  let fiveRem = fiveSplit.remainder;
  let fourRem = fourSplit.remainder;
  let threeRem = threeSplit.remainder;

  for (const rw of rawWinners) {
    let payoutCents = 0;
    
    if (rw.matches === 5) {
      payoutCents = fiveSplit.payout;
      if (fiveRem > 0) { payoutCents++; fiveRem--; }
    } else if (rw.matches === 4) {
      payoutCents = fourSplit.payout;
      if (fourRem > 0) { payoutCents++; fourRem--; }
    } else if (rw.matches === 3) {
      payoutCents = threeSplit.payout;
      if (threeRem > 0) { payoutCents++; threeRem--; }
    }

    winnerInserts.push({
      draw_id: drawRecord.id,
      user_id: rw.userId,
      match_type: rw.matches,
      amount: payoutCents / 100,
      verification_status: 'PENDING'
    });
  }

  if (winnerInserts.length > 0) {
    const { error: winnerInsertError } = await supabase
      .from('winners')
      .insert(winnerInserts);
      
    if (winnerInsertError) throw winnerInsertError;
  }

  return {
    drawId: drawRecord.id,
    month: monthStr,
    numbers,
    participants: participants.length,
    matches: matchCounts
  };
};

export const getCurrentDraw = async () => {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

export const getUserParticipation = async (userId) => {
  const currentDraw = await getCurrentDraw();
  if (!currentDraw) return null;

  // Determine if user was a winner in this draw
  const { data: winnerData } = await supabase
    .from('winners')
    .select('*, winner_proofs ( id, status ), payouts ( status )')
    .eq('draw_id', currentDraw.id)
    .eq('user_id', userId)
    .single();

  // If winner, they clearly participated
  if (winnerData) {
    return {
      draw: currentDraw,
      participated: true,
      winner: winnerData
    };
  }

  // If not a winner, check if they participated (had 5 scores at the time? hard to historically prove without a snapshot)
  // For MVP: Check if they CURRENTLY have 5 scores and a sub. If they do, assume they participated in the current draw, just didn't win.
  // We can fetch their latest 5 scores now to show their entry.
  const { data: scores } = await supabase
    .from('scores')
    .select('score')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(5);

  const hasSub = await hasActiveSubscriptionLocal(userId);

  if (scores && scores.length === 5 && hasSub) {
    const entry = scores.map(s => s.score);
    const drawSet = new Set([currentDraw.number_1, currentDraw.number_2, currentDraw.number_3, currentDraw.number_4, currentDraw.number_5]);
    const uniqueEntry = new Set(entry);
    const matches = getMatchCount(uniqueEntry, drawSet);
    
    return {
      draw: currentDraw,
      participated: true,
      entry,
      matches,
      winner: null
    };
  }

  return {
    draw: currentDraw,
    participated: false
  };
};

// Helper since we can't cleanly import from subscriptionService without circular or path issues sometimes
const hasActiveSubscriptionLocal = async (userId) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();
  
  if (!data) return false;
  return ['ACTIVE', 'TRIALING'].includes(data.status);
};
