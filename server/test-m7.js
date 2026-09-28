// Milestone 7 — Draw Engine endpoint test suite
const BASE = 'http://localhost:5000/api';
const timestamp = Date.now();
const testEmailAdmin = `admin_${timestamp}@test.com`;
const testEmailU1 = `u1_${timestamp}@test.com`;
const testEmailU2 = `u2_${timestamp}@test.com`;
const testEmailU3 = `u3_${timestamp}@test.com`;
const testEmailU4 = `u4_${timestamp}@test.com`;

let adminToken = '';
let u1Token = '';
let u2Token = '';

const req = async (path, method = 'GET', body = null, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  console.log('\n====== MILESTONE 7 API TESTS ======\n');

  // Register Admin
  await req('/auth/register', 'POST', { email: testEmailAdmin, password: 'password123', full_name: 'Admin' });
  const adminFirstLogin = await req('/auth/login', 'POST', { email: testEmailAdmin, password: 'password123' });
  
  // Make them admin in DB
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminFirstLogin.data.user.id);
  
  // Re-login to get updated JWT with role='admin'
  const adminLogin = await req('/auth/login', 'POST', { email: testEmailAdmin, password: 'password123' });
  adminToken = adminLogin.data.token;
  
  // Register U1 (5 scores, sub) - Eligible
  await req('/auth/register', 'POST', { email: testEmailU1, password: 'password123', full_name: 'U1 Eligible' });
  const u1Login = await req('/auth/login', 'POST', { email: testEmailU1, password: 'password123' });
  u1Token = u1Login.data.token;
  const u1Id = u1Login.data.user.id;
  await supabase.from('subscriptions').insert([{ user_id: u1Id, plan: 'MONTHLY', status: 'ACTIVE', charity_percentage: 20 }]);
  
  // Create 5 scores for U1
  // We'll give U1 scores: 1, 2, 3, 4, 5
  const scoresU1 = [
    { user_id: u1Id, score: 1, played_at: '2026-08-01' },
    { user_id: u1Id, score: 2, played_at: '2026-08-02' },
    { user_id: u1Id, score: 3, played_at: '2026-08-03' },
    { user_id: u1Id, score: 4, played_at: '2026-08-04' },
    { user_id: u1Id, score: 5, played_at: '2026-08-05' }
  ];
  await supabase.from('scores').insert(scoresU1);

  // Register U2 (<5 scores, sub) - Not eligible
  await req('/auth/register', 'POST', { email: testEmailU2, password: 'password123', full_name: 'U2 NotEligible' });
  const u2Login = await req('/auth/login', 'POST', { email: testEmailU2, password: 'password123' });
  u2Token = u2Login.data.token;
  const u2Id = u2Login.data.user.id;
  await supabase.from('subscriptions').insert([{ user_id: u2Id, plan: 'MONTHLY', status: 'ACTIVE', charity_percentage: 20 }]);
  await supabase.from('scores').insert([{ user_id: u2Id, score: 10, played_at: '2026-08-01' }]); // only 1

  // Register U3 (5 scores, NO sub) - Not eligible
  await req('/auth/register', 'POST', { email: testEmailU3, password: 'password123', full_name: 'U3 NotEligible' });
  const u3Login = await req('/auth/login', 'POST', { email: testEmailU3, password: 'password123' });
  const u3Id = u3Login.data.user.id;
  const scoresU3 = [
    { user_id: u3Id, score: 10, played_at: '2026-08-01' },
    { user_id: u3Id, score: 20, played_at: '2026-08-02' },
    { user_id: u3Id, score: 30, played_at: '2026-08-03' },
    { user_id: u3Id, score: 40, played_at: '2026-08-04' },
    { user_id: u3Id, score: 45, played_at: '2026-08-05' }
  ];
  await supabase.from('scores').insert(scoresU3);
  
  // Register U4 (5 scores WITH DUPLICATES, sub) - Eligible
  await req('/auth/register', 'POST', { email: testEmailU4, password: 'password123', full_name: 'U4 Duplicates' });
  const u4Login = await req('/auth/login', 'POST', { email: testEmailU4, password: 'password123' });
  const u4Id = u4Login.data.user.id;
  await supabase.from('subscriptions').insert([{ user_id: u4Id, plan: 'MONTHLY', status: 'ACTIVE', charity_percentage: 20 }]);
  const scoresU4 = [
    { user_id: u4Id, score: 1, played_at: '2026-08-01' },
    { user_id: u4Id, score: 1, played_at: '2026-08-02' }, // dup
    { user_id: u4Id, score: 2, played_at: '2026-08-03' },
    { user_id: u4Id, score: 3, played_at: '2026-08-04' },
    { user_id: u4Id, score: 4, played_at: '2026-08-05' }
  ];
  await supabase.from('scores').insert(scoresU4);

  return { adminToken, u1Token, u2Token };
}

async function run() {
  const { adminToken, u1Token, u2Token } = await setup();
  const authAdmin = { Authorization: `Bearer ${adminToken}` };
  const authU1 = { Authorization: `Bearer ${u1Token}` };

  console.log('--- AUTHORIZATION / PERMISSION CHECKS ---');
  
  const simUnauth = await req('/draws/simulate', 'POST');
  if (simUnauth.status === 401) console.log('✅ Unauthenticated simulate -> 401');
  else console.error('❌ Unauthenticated simulate failed');

  const simNonAdmin = await req('/draws/simulate', 'POST', { month: '2026-09' }, authU1);
  if (simNonAdmin.status === 403) console.log('✅ Non-admin simulate -> 403');
  else console.error('❌ Non-admin simulate failed');

  console.log('\n--- SIMULATION & ELIGIBILITY ---');
  
  // Clear any existing published draws for the test month
  await supabase.from('draws').delete().eq('status', 'PUBLISHED');

  const simAdmin = await req('/draws/simulate', 'POST', { month: '2026-09' }, authAdmin);
  if (simAdmin.status === 200 && simAdmin.data.simulation) {
    const sim = simAdmin.data.simulation;
    console.log('✅ Admin simulate -> 200');
    
    // Total eligible participants in DB might be higher than 2 because of previous tests.
    // The pool should strictly be (participants * 100).
    const expectedBasePool = sim.participants * 100;

    if (sim.basePrizePool === expectedBasePool) console.log(`✅ Base pool correctly auto-calculated: ${expectedBasePool}`);
    else console.error(`❌ Expected base pool ${expectedBasePool}, got ${sim.basePrizePool}`);

    if (sim.numbers.length === 5) console.log('✅ Draw numbers length is 5');
    
    const expectedFive = expectedBasePool * 0.40;
    const expectedFour = expectedBasePool * 0.35;
    const expectedThree = expectedBasePool * 0.25;

    if (sim.tiers.fiveMatch.pool === expectedFive) console.log(`✅ 5-match pool is 40% (${expectedFive})`);
    if (sim.tiers.fourMatch.pool === expectedFour) console.log(`✅ 4-match pool is 35% (${expectedFour})`);
    if (sim.tiers.threeMatch.pool === expectedThree) console.log(`✅ 3-match pool is 25% (${expectedThree})`);
  } else {
    console.error('❌ Admin simulate failed', simAdmin.status, simAdmin.data);
  }

  // Verify simulation didn't create anything
  const { count: drawCount } = await supabase.from('draws').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED');
  if (drawCount === 0) console.log('✅ Simulation did NOT create published draws');

  console.log('\n--- PUBLISH ---');
  
  const publishRes = await req('/draws/publish', 'POST', { month: '2026-09' }, authAdmin);
  if (publishRes.status === 201) {
    console.log('✅ Admin publish -> 201');
    const drawId = publishRes.data.result.drawId;
    
    // Verify it exists in DB
    const { data: dbDraw } = await supabase.from('draws').select('*').eq('id', drawId).single();
    if (dbDraw && dbDraw.status === 'PUBLISHED') console.log('✅ Draw is saved in DB as PUBLISHED');
  } else {
    console.error('❌ Publish failed', publishRes.status, publishRes.data);
  }

  // Duplicate publish check
  const publishDup = await req('/draws/publish', 'POST', { month: '2026-09' }, authAdmin);
  if (publishDup.status === 409) console.log('✅ Duplicate publish rejected (409)');
  else console.error('❌ Duplicate publish did not return 409', publishDup.status);

  console.log('\n--- JACKPOT ROLLOVER ---');
  
  const simNext = await req('/draws/simulate', 'POST', { month: '2026-10' }, authAdmin);
  const prevDraw = await supabase.from('draws').select('*').eq('status', 'PUBLISHED').order('published_at', { ascending: false }).limit(1).single();
  const prevFivePool = parseFloat(prevDraw.data.five_match_pool);
  
  const expectedNextBasePool = simNext.data.simulation.participants * 100;
  const expectedNextFiveMatchBase = expectedNextBasePool * 0.40;
  const expectedNextFiveMatchTotal = expectedNextFiveMatchBase + prevFivePool;

  if (simNext.data.simulation.tiers.fiveMatch.pool === expectedNextFiveMatchTotal) {
    console.log(`✅ Jackpot rollover applied correctly (+${prevFivePool} to next month, total: ${expectedNextFiveMatchTotal})`);
  } else {
    console.log(`❌ Jackpot rollover failed. Expected ${expectedNextFiveMatchTotal}, got ${simNext.data.simulation.tiers.fiveMatch.pool}`);
  }

  console.log('\n--- PARTICIPATION VIEW ---');
  const partRes = await req('/draws/my-participation', 'GET', null, authU1);
  if (partRes.status === 200) {
    console.log('✅ GET my-participation -> 200');
    if (partRes.data.participation.participated === true) console.log('✅ User correctly marked as participated');
    if (partRes.data.participation.entry.join(',') === '5,4,3,2,1') console.log('✅ Entry sorted consistently latest first');
  } else {
    console.error('❌ my-participation failed', partRes.status, partRes.data);
  }

  console.log('\n====== MILESTONE 7 TESTS COMPLETE ======\n');
  process.exit(0);
}

run();
