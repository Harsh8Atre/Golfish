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
  const options = { method, headers: { ...headers } };
  if (body) {
    if (body instanceof FormData) {
      options.body = body; // let node fetch or standard fetch handle it
      // Don't set content-type for FormData, fetch sets it with boundary
    } else {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const run = async () => {
  console.log('\n====== WINNER VERIFICATION END-TO-END FLOW ======\n');
  const ts = Date.now();
  const adminEmail = `admin_flow_${ts}@test.com`;
  const userEmail = `user_flow_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: adminEmail, password: 'password123', full_name: 'Admin Flow' });
  const adminLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  const reLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  const authAdmin = { Authorization: `Bearer ${reLogin.data.token}` };

  // 2. Setup User
  await req('/auth/register', 'POST', { email: userEmail, password: 'password123', full_name: 'User Flow' });
  const userLogin = await req('/auth/login', 'POST', { email: userEmail, password: 'password123' });
  const userId = userLogin.data.user.id;
  const authUser = { Authorization: `Bearer ${userLogin.data.token}` };

  // Setup sub and scores
  await supabase.from('subscriptions').insert([{ user_id: userId, plan: 'MONTHLY', status: 'ACTIVE', charity_percentage: 10 }]);
  const scores = [10, 20, 30, 40, 45].map((s, i) => ({ user_id: userId, score: s, played_at: `2026-09-0${i+1}` }));
  await supabase.from('scores').insert(scores);

  // Clean up any published draws for test month to avoid conflicts
  const { data: oldDraws } = await supabase.from('draws').select('id, draw_date');
  for (const d of oldDraws || []) {
    if (d.draw_date.startsWith('2026-09')) {
      await supabase.from('draws').delete().eq('id', d.id);
    }
  }

  // 3. Admin Simulates & Publishes Draw (matching all 5 scores)
  const testMonth = '2026-09';
  const drawNums = [10, 20, 30, 40, 45];
  const pub = await req('/draws/publish', 'POST', { month: testMonth, numbers: drawNums }, authAdmin);
  if (pub.status !== 201) {
    console.error('Publish failed:', pub);
    process.exit(1);
  }
  const winnerId = pub.data.result.matches[5] > 0 ? (await supabase.from('winners').select('id').eq('user_id', userId).single()).data.id : null;
  console.log(`✅ Draw published. User is winner ID: ${winnerId}`);

  // 4. User sees winner card (my-participation API)
  const myPart = await req('/draws/my-participation', 'GET', null, authUser);
  if (myPart.data.participation.winner.id === winnerId && myPart.data.participation.winner.verification_status === 'PENDING') {
    console.log(`✅ User sees winner card in PENDING state`);
  } else {
    console.error('❌ User did not see winner card');
    process.exit(1);
  }

  // 5. User selects screenshot -> Uploads proof
  const imageBuffer = Buffer.from('fake-image-content');
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('proof', blob, 'screenshot.jpg');
  const uploadRes = await req(`/winners/${winnerId}/proof`, 'POST', formData, authUser);
  if (uploadRes.status === 200) {
    console.log(`✅ Proof uploaded successfully. DB status updated.`);
  } else {
    console.error('❌ Proof upload failed:', uploadRes);
    process.exit(1);
  }

  // 6. Admin sees proof
  const adminWinners = await req('/admin/winners', 'GET', null, authAdmin);
  const theWinnerAdmin = adminWinners.data.data.find(w => w.id === winnerId);
  if (theWinnerAdmin && theWinnerAdmin.winner_proofs[0].status === 'PENDING') {
    console.log(`✅ Admin sees the uploaded proof (url: ${theWinnerAdmin.winner_proofs[0].file_url})`);
  } else {
    console.error('❌ Admin could not find proof');
    process.exit(1);
  }

  // 7. Admin approves proof
  const verifyRes = await req(`/admin/winners/${winnerId}/verify`, 'POST', { status: 'APPROVED', adminNote: 'Looks good' }, authAdmin);
  if (verifyRes.status === 200) {
    console.log(`✅ Admin APPROVED winner`);
  } else {
    console.error('❌ Verification failed', verifyRes);
  }

  // 8. Payout becomes PENDING
  const afterApprovePart = await req('/draws/my-participation', 'GET', null, authUser);
  if (afterApprovePart.data.participation.winner.verification_status === 'APPROVED' && afterApprovePart.data.participation.winner.payouts[0].status === 'PENDING') {
    console.log(`✅ User sees APPROVED and payout PENDING`);
  } else {
    console.error('❌ User does not see pending payout');
    process.exit(1);
  }

  // 9. Admin marks PAID
  const payoutRes = await req(`/admin/winners/${winnerId}/payout`, 'POST', null, authAdmin);
  if (payoutRes.status === 200) {
    console.log(`✅ Admin marked payout as PAID`);
  } else {
    console.error('❌ Payout failed', payoutRes);
  }

  // 10. User sees PAID
  const finalPart = await req('/draws/my-participation', 'GET', null, authUser);
  if (finalPart.data.participation.winner.payouts[0].status === 'PAID') {
    console.log(`✅ User successfully sees PAID status in UI data payload!`);
  } else {
    console.error('❌ User does not see paid status');
    process.exit(1);
  }

  console.log('\n====== E2E FLOW PASSED ======\n');
  process.exit(0);
};

run();
