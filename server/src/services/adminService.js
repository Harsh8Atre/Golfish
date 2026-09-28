import { supabase } from "../config/supabase.js";

export const getOverview = async () => {
  // Total Users
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "user");

  // Active Subscribers
  const { count: activeSubs } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["ACTIVE", "TRIALING"]);

  // Current Prize Pool (Projected based on active subscribers)
  const contributionPerUser = parseInt(process.env.PRIZE_POOL_CONTRIBUTION_PER_USER || '100', 10);
  const totalPrizePool = (activeSubs || 0) * contributionPerUser;

  // Total Charity Allocations
  // We'll estimate this based on current active subscribers for MVP since we don't track historical monthly payments natively in this schema.
  // Actually, let's just sum active subs * monthly price * charity percentage for a "monthly run rate".
  // But a simpler accurate measure: we don't have historical payment tracking. I'll return the projected monthly charity contribution.
  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("charity_percentage, plan")
    .in("status", ["ACTIVE", "TRIALING"]);
  // Assumption: Monthly = 500, Yearly = 5000 (just dummy values if Stripe isn't queried).
  // Actually let's just use the contribution per user logic.
  let projectedCharity = 0;
  for (const sub of activeSubscriptions || []) {
    const amount = sub.plan === "YEARLY" ? 5000 : 500;
    projectedCharity += amount * (sub.charity_percentage / 100);
  }

  // Pending Verifications
  const { count: pendingWinners } = await supabase
    .from("winners")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "PENDING");

  // Pending Payouts (Approved winners but no paid payout record)
  // Get all approved winners
  const { data: approvedWinners } = await supabase
    .from("winners")
    .select("id")
    .eq("verification_status", "APPROVED");
  const approvedIds = (approvedWinners || []).map((w) => w.id);

  let pendingPayoutsCount = 0;
  if (approvedIds.length > 0) {
    const { data: payouts } = await supabase
      .from("payouts")
      .select("winner_id, status")
      .in("winner_id", approvedIds);
    const paidWinnerIds = new Set(
      (payouts || [])
        .filter((p) => p.status === "PAID")
        .map((p) => p.winner_id),
    );
    pendingPayoutsCount = approvedIds.length - paidWinnerIds.size;
  }

  return {
    totalUsers: userCount || 0,
    activeSubscribers: activeSubs || 0,
    totalPrizePool,
    projectedMonthlyCharity: projectedCharity,
    pendingVerifications: pendingWinners || 0,
    pendingPayouts: pendingPayoutsCount,
  };
};

export const getUsers = async () => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      id, email, full_name, role, created_at,
      subscriptions ( status, plan ),
      scores ( id )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Format to avoid leaking hashes or sensitive data (which shouldn't be there anyway, but just to be safe)
  return profiles.map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    createdAt: p.created_at,
    subscriptionStatus: p.subscriptions?.[0]?.status || "NONE",
    scoreCount: p.scores ? p.scores.length : 0,
  }));
};

// ----- Charities -----

export const getCharities = async () => {
  const { data, error } = await supabase
    .from("charities")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
};

export const createCharity = async (charityData) => {
  const { data, error } = await supabase
    .from("charities")
    .insert([charityData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCharity = async (id, charityData) => {
  const { data, error } = await supabase
    .from("charities")
    .update(charityData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const setCharityStatus = async (id, active) => {
  const { data, error } = await supabase
    .from("charities")
    .update({ active })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ----- Winners & Payouts -----

export const getWinners = async () => {
  const { data, error } = await supabase
    .from("winners")
    .select(
      `
      id, match_type, amount, verification_status, created_at,
      profiles ( email, full_name ),
      draws ( draw_date ),
      winner_proofs ( id, file_url, status ),
      payouts ( id, status )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transform file_url to a short-lived signed URL for the admin if it exists and isn't already a full URL
  const processedData = await Promise.all(
    data.map(async (winner) => {
      if (winner.winner_proofs && winner.winner_proofs.length > 0) {
        const proof = winner.winner_proofs[0];
        if (proof.file_url && !proof.file_url.startsWith("http")) {
          const { data: signedData } = await supabase.storage
            .from("winner-proofs")
            .createSignedUrl(proof.file_url, 3600); // 1 hour
          if (signedData) {
            proof.file_url = signedData.signedUrl;
          }
        }
      }
      return winner;
    }),
  );

  return processedData;
};

export const verifyWinner = async (id, status, adminNote) => {
  if (!["APPROVED", "REJECTED"].includes(status))
    throw new Error("Invalid status");

  const { data, error } = await supabase
    .from("winners")
    .update({ verification_status: status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // If there's a proof, update its note
  if (adminNote) {
    await supabase
      .from("winner_proofs")
      .update({ admin_note: adminNote, status: "REVIEWED" })
      .eq("winner_id", id);
  }

  // If approved, create a pending payout record automatically
  if (status === "APPROVED") {
    // Check if one exists
    const { data: existingPayout } = await supabase
      .from("payouts")
      .select("id")
      .eq("winner_id", id)
      .single();
    if (!existingPayout) {
      await supabase
        .from("payouts")
        .insert([{ winner_id: id, status: "PENDING" }]);
    }
  }

  return data;
};

export const processPayout = async (winnerId) => {
  // Find pending payout
  const { data: payout, error: payoutError } = await supabase
    .from("payouts")
    .select("id, status")
    .eq("winner_id", winnerId)
    .single();

  if (payoutError && payoutError.code !== "PGRST116") throw payoutError;

  if (!payout) {
    // Create and mark paid
    const { data, error } = await supabase
      .from("payouts")
      .insert([
        {
          winner_id: winnerId,
          status: "PAID",
          paid_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Update existing
    const { data, error } = await supabase
      .from("payouts")
      .update({ status: "PAID", paid_at: new Date().toISOString() })
      .eq("id", payout.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ----- Reports -----

export const getReports = async () => {
  // For a 2-day MVP, we compile the necessary summary stats here.
  const { data: draws } = await supabase
    .from("draws")
    .select("prize_pool, five_match_pool, four_match_pool, three_match_pool")
    .eq("status", "PUBLISHED");
  const totalPools = (draws || []).reduce(
    (s, d) => s + parseFloat(d.prize_pool || 0),
    0,
  );

  const { data: winners } = await supabase
    .from("winners")
    .select("amount, verification_status");
  const totalWinnings = (winners || []).reduce(
    (s, w) => s + parseFloat(w.amount || 0),
    0,
  );
  const approvedWinnings = (winners || [])
    .filter((w) => w.verification_status === "APPROVED")
    .reduce((s, w) => s + parseFloat(w.amount || 0), 0);

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan, status");
  const planDist = { monthly: 0, yearly: 0, inactive: 0 };
  (subs || []).forEach((s) => {
    if (s.status === "ACTIVE" || s.status === "TRIALING") {
      if (s.plan === "MONTHLY") planDist.monthly++;
      if (s.plan === "YEARLY") planDist.yearly++;
    } else {
      planDist.inactive++;
    }
  });

  return {
    drawsCount: draws?.length || 0,
    totalPrizePools: totalPools,
    totalWinnings,
    approvedWinnings,
    winnersCount: winners?.length || 0,
    subscriptions: planDist,
  };
};
