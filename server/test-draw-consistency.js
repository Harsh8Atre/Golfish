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
  console.log('\n====== DRAW SIMULATION & PUBLISH CONSISTENCY TEST ======\n');
  const ts = Date.now();
  const adminEmail = `admin_draw_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: adminEmail, password: 'password123', full_name: 'Admin Draw' });
  const adminLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  const reLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'password123' });
  const authAdmin = { Authorization: `Bearer ${reLogin.data.token}` };

  // Soft reset state for the test month
  const testMonth = '2026-08';
  
  // Clean up any published draws for test month to avoid conflicts
  const { data: oldDraws } = await supabase.from('draws').select('id, draw_date');
  for (const d of oldDraws || []) {
    if (d.draw_date.startsWith(testMonth)) {
      await supabase.from('draws').delete().eq('id', d.id);
    }
  }

  // 1. Simulate Draw
  const sim = await req('/draws/simulate', 'POST', { month: testMonth }, authAdmin);
  if (sim.status !== 200) {
    console.error('Simulation failed:', sim);
    process.exit(1);
  }

  const simulatedNumbers = sim.data.simulation.numbers;
  console.log(`Simulated Numbers: [${simulatedNumbers.join(', ')}]`);

  // 2. Publish Draw with Simulated Numbers
  const pub = await req('/draws/publish', 'POST', { month: testMonth, numbers: simulatedNumbers }, authAdmin);
  if (pub.status !== 201) {
    console.error('Publish failed:', pub);
    process.exit(1);
  }

  console.log('✅ Draw published successfully.');

  // 3. Verify Database Values
  const { data: dbDraw } = await supabase
    .from('draws')
    .select('number_1, number_2, number_3, number_4, number_5')
    .eq('id', pub.data.result.drawId)
    .single();

  const dbNumbers = [dbDraw.number_1, dbDraw.number_2, dbDraw.number_3, dbDraw.number_4, dbDraw.number_5];
  console.log(`Database Numbers:  [${dbNumbers.join(', ')}]`);

  const isEqual = JSON.stringify(simulatedNumbers) === JSON.stringify(dbNumbers);
  if (isEqual) {
    console.log('✅ MATCH: Simulated numbers === Published database numbers');
  } else {
    console.error('❌ MISMATCH: Simulated numbers do not match database numbers!');
    process.exit(1);
  }

  // 4. Verify what users see
  const { data: publicDraws } = await supabase
    .from('draws')
    .select('number_1, number_2, number_3, number_4, number_5')
    .eq('id', pub.data.result.drawId)
    .single();
    
  const publicNumbers = [publicDraws.number_1, publicDraws.number_2, publicDraws.number_3, publicDraws.number_4, publicDraws.number_5];
  console.log(`Public Numbers:    [${publicNumbers.join(', ')}]`);

  const isPublicEqual = JSON.stringify(dbNumbers) === JSON.stringify(publicNumbers);
  if (isPublicEqual) {
    console.log('✅ MATCH: Database numbers === Publicly exposed numbers');
  } else {
    console.error('❌ MISMATCH: Public numbers differ from database numbers!');
    process.exit(1);
  }

  console.log('\n====== TEST COMPLETE ======\n');
  process.exit(0);
};

run();
