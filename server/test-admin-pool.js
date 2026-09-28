import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'http://localhost:5000/api';

const req = async (path, method = 'GET', body = null, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const run = async () => {
  console.log('\n====== ADMIN PRIZE POOL CALCULATION VERIFICATION ======\n');
  const ts = Date.now();
  const adminEmail = `admin_overview_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: adminEmail, password: 'password123', full_name: 'Admin Pool' });
  const adminLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  const reLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  const authAdmin = { Authorization: `Bearer ${reLogin.data.token}` };

  // Soft reset state
  await supabase.from('subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
  await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('draws').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 

  // Helper to create a user and sub
  const createUserWithSub = async (index, hasScores = false) => {
    const email = `sub_overview_${index}_${ts}@test.com`;
    await req('/auth/register', 'POST', { email, password: 'password123', full_name: `Sub ${index}` });
    const { data: userLogin } = await req('/auth/login', 'POST', { email, password: 'password123' });
    const userId = userLogin.user.id;
    
    await supabase.from('subscriptions').insert([{
      user_id: userId,
      plan: 'MONTHLY',
      status: 'ACTIVE',
      charity_percentage: 10
    }]);

    if (hasScores) {
      const scores = [1,2,3,4,5].map((s, i) => ({ user_id: userId, score: s, played_at: `2026-07-0${i+1}` }));
      await supabase.from('scores').insert(scores);
    }
    return userId;
  };

  // User 1 & 2 (Has scores - 2 draw participants)
  await createUserWithSub(1, true);
  await createUserWithSub(2, true);
  
  // User 3 (No scores)
  await createUserWithSub(3, false);
  
  // Test 1: Overview returns 300 with 0 draws published
  const overview = await req('/admin/overview', 'GET', null, authAdmin);
  const totalPrizePool = overview.data.data.totalPrizePool;
  console.log(`Overview totalPrizePool = ₹${totalPrizePool} (Expected: 300)`);
  if (totalPrizePool !== 300) console.error('❌ Failed overview prize pool test');
  else console.log('✅ Passed overview prize pool test');

  // Test 2: Simulate matches Participants = 2, Pool = 300
  const sim = await req('/draws/simulate', 'POST', { month: '2026-07' }, authAdmin);
  const simPool = sim.data.simulation.basePrizePool;
  const simParts = sim.data.simulation.participants;
  console.log(`Simulation Prize Pool = ₹${simPool} (Expected: 300)`);
  console.log(`Simulation Participants = ${simParts} (Expected: 2)`);
  
  if (simPool !== 300) console.error('❌ Failed simulation pool test');
  else console.log('✅ Passed simulation pool test');

  if (simParts !== 2) console.error('❌ Failed simulation participants test');
  else console.log('✅ Passed simulation participants test');

  console.log('\n====== TEST COMPLETE ======\n');
  process.exit(0);
};

run();
