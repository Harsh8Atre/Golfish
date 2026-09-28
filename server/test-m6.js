// Milestone 6 — Score System endpoint test suite
const BASE = 'http://localhost:5000/api';
const timestamp = Date.now();
const testEmail1 = `m6user1_${timestamp}@test.com`; // Has sub
const testEmail2 = `m6user2_${timestamp}@test.com`; // No sub
let token1 = '';
let token2 = '';
let scoreId1 = '';

const req = async (path, method = 'GET', body = null, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

// Manually insert active subscription into DB since we can't fully mock stripe easily here
// We'll write a quick setup function to hit supabase directly if needed, or we just trust our tests.
// Actually, since I have the SUPABASE key, I can inject a fake subscription using it.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  console.log('\n====== MILESTONE 6 API TESTS ======\n');

  // Register User 1
  const u1Res = await req('/auth/register', 'POST', { email: testEmail1, password: 'password123', full_name: 'M6 Tester 1' });
  const login1 = await req('/auth/login', 'POST', { email: testEmail1, password: 'password123' });
  token1 = login1.data.token;
  const userId1 = login1.data.user.id;

  // Insert mock active subscription for User 1
  const { error } = await supabase.from('subscriptions').insert([{
    user_id: userId1,
    plan: 'MONTHLY',
    status: 'ACTIVE',
    charity_percentage: 20
  }]);
  if (error) {
    console.error('Failed to insert mock subscription:', error);
  }

  // Register User 2
  await req('/auth/register', 'POST', { email: testEmail2, password: 'password123', full_name: 'M6 Tester 2' });
  const login2 = await req('/auth/login', 'POST', { email: testEmail2, password: 'password123' });
  token2 = login2.data.token;

  return { token1, token2 };
}

async function run() {
  const { token1, token2 } = await setup();
  const auth1 = { Authorization: `Bearer ${token1}` };
  const auth2 = { Authorization: `Bearer ${token2}` };

  console.log('--- AUTHORIZATION / SUBSCRIPTION CHECKS ---');
  
  // 1. Unauth GET
  const unauthRes = await req('/scores', 'GET');
  if (unauthRes.status === 401) console.log('✅ Unauthenticated GET -> 401');
  else console.error('❌ Unauth GET failed:', unauthRes.status);

  // 2. Auth but no sub GET
  const noSubRes = await req('/scores', 'GET', null, auth2);
  if (noSubRes.status === 403) console.log('✅ Authenticated without sub GET -> 403');
  else console.error('❌ Auth no sub GET failed:', noSubRes.status);

  // 3. Auth + Sub GET (empty)
  const okSubRes = await req('/scores', 'GET', null, auth1);
  if (okSubRes.status === 200 && okSubRes.data.scores.length === 0) console.log('✅ Subscribed GET (empty) -> 200');
  else console.error('❌ Subscribed GET failed:', okSubRes.status, okSubRes.data);

  console.log('\n--- VALIDATION CHECKS ---');

  // 7. Score < 1
  const lowScoreRes = await req('/scores', 'POST', { score: 0, playedAt: '2026-09-01' }, auth1);
  if (lowScoreRes.status === 400) console.log('✅ Score < 1 -> 400');
  else console.error('❌ Score < 1 failed:', lowScoreRes.status);

  // 8. Score > 45
  const highScoreRes = await req('/scores', 'POST', { score: 46, playedAt: '2026-09-01' }, auth1);
  if (highScoreRes.status === 400) console.log('✅ Score > 45 -> 400');
  else console.error('❌ Score > 45 failed:', highScoreRes.status);

  // 9. Non-integer score
  const stringScoreRes = await req('/scores', 'POST', { score: 'abc', playedAt: '2026-09-01' }, auth1);
  if (stringScoreRes.status === 400) console.log('✅ Non-integer score -> 400');
  else console.error('❌ Non-integer failed:', stringScoreRes.status);

  // 10. Missing date
  const missingDateRes = await req('/scores', 'POST', { score: 36 }, auth1);
  if (missingDateRes.status === 400) console.log('✅ Missing date -> 400');
  else console.error('❌ Missing date failed:', missingDateRes.status);

  // 11. Invalid date format
  const badDateRes = await req('/scores', 'POST', { score: 36, playedAt: '09/01/2026' }, auth1);
  if (badDateRes.status === 400) console.log('✅ Invalid date format -> 400');
  else console.error('❌ Invalid date format failed:', badDateRes.status);

  // 12. Future date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureDateString = futureDate.toISOString().split('T')[0];
  const futureDateRes = await req('/scores', 'POST', { score: 36, playedAt: futureDateString }, auth1);
  if (futureDateRes.status === 400) console.log('✅ Future date -> 400');
  else console.error('❌ Future date failed:', futureDateRes.status);

  console.log('\n--- BUSINESS LOGIC CHECKS ---');

  // Insert 5 scores
  const dates = ['2026-08-01', '2026-08-05', '2026-08-10', '2026-08-15', '2026-08-20'];
  const scores = [34, 37, 41, 35, 38];

  for (let i = 0; i < 5; i++) {
    await req('/scores', 'POST', { score: scores[i], playedAt: dates[i] }, auth1);
  }
  
  const fiveScoresRes = await req('/scores', 'GET', null, auth1);
  if (fiveScoresRes.status === 200 && fiveScoresRes.data.scores.length === 5) {
    console.log('✅ 5 scores inserted and retained successfully.');
    scoreId1 = fiveScoresRes.data.scores[0].id; // 2026-08-20
    if (fiveScoresRes.data.scores[0].playedAt === '2026-08-20' && fiveScoresRes.data.scores[4].playedAt === '2026-08-01') {
       console.log('✅ Scores ordered newest-first.');
    }
  } else {
    console.error('❌ Failed to retain 5 scores:', fiveScoresRes.data);
  }

  // 13. Duplicate date
  const dupDateRes = await req('/scores', 'POST', { score: 40, playedAt: '2026-08-20' }, auth1);
  if (dupDateRes.status === 409) console.log('✅ Duplicate date -> 409');
  else console.error('❌ Duplicate date failed:', dupDateRes.status);

  // Sixth score
  await req('/scores', 'POST', { score: 40, playedAt: '2026-08-25' }, auth1);
  
  const sixScoresRes = await req('/scores', 'GET', null, auth1);
  if (sixScoresRes.data.scores.length === 5) {
    if (sixScoresRes.data.scores[0].playedAt === '2026-08-25' && !sixScoresRes.data.scores.find(s => s.playedAt === '2026-08-01')) {
      console.log('✅ Sixth score correctly removes oldest score (2026-08-01)');
    } else {
      console.error('❌ Sixth score did not correctly replace oldest. Expected dates: 2026-08-25 to 2026-08-05. Got:', sixScoresRes.data.scores.map(s => s.playedAt));
    }
  } else {
    console.error('❌ Length after 6th score is not 5:', sixScoresRes.data.scores.length);
  }

  // Adding older score does not remove a newer score
  await req('/scores', 'POST', { score: 33, playedAt: '2026-07-30' }, auth1);
  const olderScoreRes = await req('/scores', 'GET', null, auth1);
  if (olderScoreRes.data.scores.length === 5 && !olderScoreRes.data.scores.find(s => s.playedAt === '2026-07-30')) {
    console.log('✅ Adding older 6th score gets immediately rejected from latest 5.');
  } else {
    console.error('❌ Older score messed up latest 5:', olderScoreRes.data.scores);
  }

  console.log('\n--- SECURITY / EDIT CHECKS ---');

  // User 2 tries to edit User 1's score
  const badEditRes = await req(`/scores/${scoreId1}`, 'PUT', { score: 45, playedAt: '2026-08-20' }, auth2);
  if (badEditRes.status === 403 || badEditRes.status === 404) {
    console.log(`✅ User 2 cannot edit User 1's score (${badEditRes.status})`);
  } else {
    console.error('❌ Edit authorization failed:', badEditRes.status);
  }

  // Valid edit
  const validEditRes = await req(`/scores/${scoreId1}`, 'PUT', { score: 42, playedAt: '2026-08-21' }, auth1);
  if (validEditRes.status === 200 && validEditRes.data.score.score === 42) {
    console.log('✅ Valid edit updates score and date successfully');
  } else {
    console.error('❌ Valid edit failed:', validEditRes.status, validEditRes.data);
  }

  console.log('\n====== MILESTONE 6 TESTS COMPLETE ======\n');
  process.exit(0);
}

run();
