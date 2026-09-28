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
  console.log('\n====== PRIZE POOL CALCULATION VERIFICATION ======\n');
  const ts = Date.now();
  const adminEmail = `admin_pool_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: adminEmail, password: 'password123', full_name: 'Admin Pool' });
  const adminLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  const reLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  const authAdmin = { Authorization: `Bearer ${reLogin.data.token}` };

  // Clear existing subs/scores to isolate the pool test (soft reset state)
  // Be careful not to delete all users, just subscriptions
  await supabase.from('subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  await supabase.from('draws').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  // Helper to create a user and sub
  const createUserWithSub = async (index, hasScores = false) => {
    const email = `sub_pool_${index}_${ts}@test.com`;
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

  // User 1 (Has scores)
  await createUserWithSub(1, true);
  let sim = await req('/draws/simulate', 'POST', { month: '2026-07' }, authAdmin);
  if (sim.status !== 200) { console.error('Sim error:', sim); process.exit(1); }
  console.log(`1 active subscriber -> ₹${sim.data.simulation.basePrizePool} (Participants: ${sim.data.simulation.participants})`);
  if (sim.data.simulation.basePrizePool !== 100) console.error('❌ Failed 1 sub test');
  else console.log('✅ Passed 1 sub test');

  // User 2 (Has scores)
  await createUserWithSub(2, true);
  sim = await req('/draws/simulate', 'POST', { month: '2026-07' }, authAdmin);
  console.log(`2 active subscribers -> ₹${sim.data.simulation.basePrizePool} (Participants: ${sim.data.simulation.participants})`);
  if (sim.data.simulation.basePrizePool !== 200) console.error('❌ Failed 2 sub test');
  else console.log('✅ Passed 2 sub test');

  // User 3 (NO scores - should still contribute to pool, but NOT participate)
  await createUserWithSub(3, false);
  sim = await req('/draws/simulate', 'POST', { month: '2026-07' }, authAdmin);
  console.log(`3 active subscribers (1 without scores) -> ₹${sim.data.simulation.basePrizePool} (Participants: ${sim.data.simulation.participants})`);
  if (sim.data.simulation.basePrizePool !== 300) console.error('❌ Failed 3 sub test');
  else if (sim.data.simulation.participants !== 2) console.error('❌ Failed participant count test');
  else console.log('✅ Passed 3 sub test (Pool increases, participant count stays at 2)');

  console.log('\n====== TEST COMPLETE ======\n');
  process.exit(0);
};

run();
