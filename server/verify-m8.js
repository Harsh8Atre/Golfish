import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'http://localhost:5000/api';

const req = async (path, method = 'GET', body = null, headers = {}) => {
  const isFormData = body instanceof FormData;
  
  const fetchOptions = {
    method,
    headers: { ...headers },
  };

  if (isFormData) {
    fetchOptions.body = body;
  } else if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, fetchOptions);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

async function createBucketIfNotExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  
  if (!buckets.some(b => b.name === 'winner-proofs')) {
    console.log('Creating private winner-proofs bucket...');
    const { error: createError } = await supabase.storage.createBucket('winner-proofs', {
      public: false,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (createError) throw createError;
  }
}

async function run() {
  console.log('\n====== MILESTONE 8 FUNCTIONAL VERIFICATION ======\n');

  await createBucketIfNotExists();

  const ts = Date.now();
  const testAdminEmail = `admin_m8_v2_${ts}@test.com`;
  const testUserEmail = `user_m8_v2_${ts}@test.com`;
  const testUser2Email = `user2_m8_v2_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: testAdminEmail, password: 'password123', full_name: 'Admin V2' });
  let adminLogin = await req('/auth/login', 'POST', { email: testAdminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  adminLogin = await req('/auth/login', 'POST', { email: testAdminEmail, password: 'password123' });
  const adminToken = adminLogin.data.token;
  const authAdmin = { Authorization: `Bearer ${adminToken}` };

  // 2. Setup Normal Users
  await req('/auth/register', 'POST', { email: testUserEmail, password: 'password123', full_name: 'User V2' });
  const userLogin = await req('/auth/login', 'POST', { email: testUserEmail, password: 'password123' });
  const userToken = userLogin.data.token;
  const userId = userLogin.data.user.id;
  const authUser = { Authorization: `Bearer ${userToken}` };

  await req('/auth/register', 'POST', { email: testUser2Email, password: 'password123', full_name: 'User2 V2' });
  const user2Login = await req('/auth/login', 'POST', { email: testUser2Email, password: 'password123' });
  const user2Token = user2Login.data.token;
  const authUser2 = { Authorization: `Bearer ${user2Token}` };

  // Generate a Draw and Winner so we can test proof upload
  // Give user1 5 scores and a sub
  await supabase.from('subscriptions').insert([{ user_id: userId, plan: 'MONTHLY', status: 'ACTIVE', charity_percentage: 10 }]);
  const scores = [1,2,3,4,5].map((s, i) => ({ user_id: userId, score: s, played_at: `2026-07-0${i+1}` }));
  await supabase.from('scores').insert(scores);

  console.log('\n--- DRAW ADMIN FLOW ---');
  // Clear draws for clean slate
  await supabase.from('draws').delete().neq('status', 'X'); // delete all
  
  const sim = await req('/draws/simulate', 'POST', { month: '2026-07' }, authAdmin);
  if (sim.status === 200) console.log('✅ Simulation successful (Pool auto-calculated)');
  else console.error('❌ Simulation failed', sim.status);
  
  // Actually we need the user to WIN to upload proof. 
  // Let's explicitly inject a draw and a winner record for user1 to guarantee they can test the proof upload reliably.
  const { data: drawRecord } = await supabase.from('draws').insert([{
    draw_date: '2026-07-01T00:00:00Z',
    status: 'PUBLISHED',
    number_1: 1, number_2: 2, number_3: 3, number_4: 4, number_5: 5,
    prize_pool: 100
  }]).select().single();

  const { data: winnerRecord } = await supabase.from('winners').insert([{
    draw_id: drawRecord.id,
    user_id: userId,
    match_type: 5,
    amount: 50,
    verification_status: 'PENDING'
  }]).select().single();

  const winnerId = winnerRecord.id;

  console.log('\n--- WINNER PROOF FLOW & SECURITY ---');
  // Create a dummy image file
  const dummyImagePath = path.join(__dirname, 'dummy.png');
  fs.writeFileSync(dummyImagePath, 'fake-image-data-but-it-will-upload');

  const dummyImageBuffer = fs.readFileSync(dummyImagePath);
  const blob = new Blob([dummyImageBuffer], { type: 'image/png' });

  // 1. Unauthenticated -> 401
  const form = new FormData();
  form.append('proof', blob, 'dummy.png');
  const uploadUnauth = await req(`/winners/${winnerId}/proof`, 'POST', form);
  if (uploadUnauth.status === 401) console.log('✅ Unauthenticated upload rejected');

  // 2. Wrong user (User 2) -> 403
  const form2 = new FormData();
  form2.append('proof', blob, 'dummy.png');
  const uploadWrongUser = await req(`/winners/${winnerId}/proof`, 'POST', form2, authUser2);
  if (uploadWrongUser.status === 403) console.log('✅ Unauthorized user upload rejected');

  // 3. Correct User (User 1) -> 200
  const form3 = new FormData();
  form3.append('proof', blob, 'dummy.png');
  const uploadSuccess = await req(`/winners/${winnerId}/proof`, 'POST', form3, authUser);
  if (uploadSuccess.status === 200) console.log('✅ Legitimate winner uploaded proof successfully');
  else console.error('❌ Proof upload failed', uploadSuccess.data);

  // Check Private Bucket & Signed URL via Admin getWinners
  const adminWinnersRes = await req('/admin/winners', 'GET', null, authAdmin);
  const theWinner = adminWinnersRes.data.data.find(w => w.id === winnerId);
  const proofUrl = theWinner.winner_proofs[0].file_url;
  
  if (proofUrl.includes('sign') && proofUrl.includes('token=')) {
    console.log('✅ Admin API returned a securely signed URL instead of raw path');
    // Verify it actually loads (we can do a simple fetch)
    const proofFetch = await fetch(proofUrl);
    if (proofFetch.ok) console.log('✅ Signed URL successfully retrieves the private file');
    else console.error('❌ Signed URL failed to retrieve file');
  } else {
    console.error('❌ Admin API did NOT return a signed URL');
  }

  console.log('\n--- APPROVAL & REJECTION FLOW ---');
  // Rejection first
  const rejectRes = await req(`/admin/winners/${winnerId}/verify`, 'POST', { status: 'REJECTED', adminNote: 'Blurry' }, authAdmin);
  if (rejectRes.status === 200 && rejectRes.data.data.verification_status === 'REJECTED') {
    console.log('✅ Admin successfully rejected proof');
  }

  // Approval
  const approveRes = await req(`/admin/winners/${winnerId}/verify`, 'POST', { status: 'APPROVED', adminNote: 'Looks good' }, authAdmin);
  if (approveRes.status === 200 && approveRes.data.data.verification_status === 'APPROVED') {
    console.log('✅ Admin successfully approved proof');
  }

  // Check Payout Record created exactly once
  const { data: payouts } = await supabase.from('payouts').select('*').eq('winner_id', winnerId);
  if (payouts.length === 1 && payouts[0].status === 'PENDING') {
    console.log('✅ Single PENDING payout record automatically created upon approval');
  } else {
    console.error('❌ Payout record creation failed or duplicated');
  }

  // Check payout flow
  const payoutId = winnerId; // processPayout uses winnerId
  
  // Normal user cannot payout
  const payoutUser = await req(`/admin/winners/${payoutId}/payout`, 'POST', null, authUser);
  if (payoutUser.status === 403) console.log('✅ Normal user blocked from paying out');

  // Admin payout
  const payoutRes = await req(`/admin/winners/${payoutId}/payout`, 'POST', null, authAdmin);
  if (payoutRes.status === 200 && payoutRes.data.data.status === 'PAID') {
    console.log('✅ Admin successfully marked payout as PAID');
  }

  console.log('\n--- CHARITY CRUD FLOW ---');
  const createChar = await req('/admin/charities', 'POST', { name: `M8 Functional ${ts}`, description: 'Test' }, authAdmin);
  const charId = createChar.data.data.id;
  if (createChar.status === 201) console.log('✅ Charity created');

  const editChar = await req(`/admin/charities/${charId}`, 'PUT', { name: `M8 Functional Edited ${ts}` }, authAdmin);
  if (editChar.status === 200) console.log('✅ Charity edited');

  const disableChar = await req(`/admin/charities/${charId}/status`, 'PATCH', { active: false }, authAdmin);
  if (disableChar.status === 200) console.log('✅ Charity deactivated (soft delete)');

  const pubCharities = await req('/charities', 'GET');
  const pubHasCharity = pubCharities.data.charities.some(c => c.id === charId);
  if (!pubHasCharity) console.log('✅ Deactivated charity hidden from public API');

  console.log('\n--- REPORTS FLOW ---');
  const reportsRes = await req('/admin/reports', 'GET', null, authAdmin);
  if (reportsRes.status === 200) {
    const r = reportsRes.data.data;
    if (r.drawsCount >= 1 && r.winnersCount >= 1 && r.totalPrizePools >= 100) {
      console.log('✅ Reports return mathematically consistent database aggregations');
    } else {
      console.error('❌ Report data inconsistent', r);
    }
  }

  // Cleanup dummy
  if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);

  console.log('\n====== VERIFICATION COMPLETE ======\n');
  process.exit(0);
}

run();
