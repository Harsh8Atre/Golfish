// Milestone 8 — Admin Endpoints Test
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

async function run() {
  console.log('\n====== MILESTONE 8 BACKEND TESTS ======\n');
  
  const ts = Date.now();
  const testAdminEmail = `admin_m8_${ts}@test.com`;
  const testUserEmail = `user_m8_${ts}@test.com`;

  // 1. Setup Admin
  await req('/auth/register', 'POST', { email: testAdminEmail, password: 'password123', full_name: 'Admin M8' });
  let adminLogin = await req('/auth/login', 'POST', { email: testAdminEmail, password: 'password123' });
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', adminLogin.data.user.id);
  adminLogin = await req('/auth/login', 'POST', { email: testAdminEmail, password: 'password123' });
  const adminToken = adminLogin.data.token;
  const authAdmin = { Authorization: `Bearer ${adminToken}` };

  // 2. Setup Normal User
  await req('/auth/register', 'POST', { email: testUserEmail, password: 'password123', full_name: 'User M8' });
  const userLogin = await req('/auth/login', 'POST', { email: testUserEmail, password: 'password123' });
  const userToken = userLogin.data.token;
  const authUser = { Authorization: `Bearer ${userToken}` };

  console.log('--- SECURITY CHECKS ---');
  // Unauth
  const unauthRes = await req('/admin/overview', 'GET');
  if (unauthRes.status === 401) console.log('✅ Unauth -> 401');
  else console.error('❌ Unauth failed', unauthRes.status);

  // Normal User
  const userRes = await req('/admin/overview', 'GET', null, authUser);
  if (userRes.status === 403) console.log('✅ Normal User -> 403');
  else console.error('❌ Normal User failed', userRes.status);

  console.log('\n--- ADMIN ENDPOINTS ---');
  // Overview
  const overview = await req('/admin/overview', 'GET', null, authAdmin);
  if (overview.status === 200 && overview.data.data.totalUsers !== undefined) console.log('✅ GET /admin/overview -> 200 (Has data)');
  else console.error('❌ GET /admin/overview failed', overview.status);

  // Users
  const users = await req('/admin/users', 'GET', null, authAdmin);
  if (users.status === 200 && Array.isArray(users.data.data)) console.log('✅ GET /admin/users -> 200 (Returns array)');
  else console.error('❌ GET /admin/users failed', users.status);

  // Charities
  const newCharity = await req('/admin/charities', 'POST', { name: `M8 Test Charity ${ts}`, description: 'Test' }, authAdmin);
  if (newCharity.status === 201) console.log('✅ POST /admin/charities -> 201');
  else console.error('❌ POST /admin/charities failed', newCharity.status);

  const charityId = newCharity.data.data.id;
  const disableCharity = await req(`/admin/charities/${charityId}/status`, 'PATCH', { active: false }, authAdmin);
  if (disableCharity.status === 200 && disableCharity.data.data.active === false) console.log('✅ PATCH /admin/charities/:id/status -> 200');
  else console.error('❌ PATCH charity status failed', disableCharity.status);

  // We skip testing full winner flow here since it requires simulating/publishing a new draw just for this script,
  // which is already covered heavily in M7. We just check if the endpoint returns successfully.
  const winners = await req('/admin/winners', 'GET', null, authAdmin);
  if (winners.status === 200) console.log('✅ GET /admin/winners -> 200');
  
  const reports = await req('/admin/reports', 'GET', null, authAdmin);
  if (reports.status === 200) console.log('✅ GET /admin/reports -> 200');

  console.log('\n====== MILESTONE 8 BACKEND TESTS COMPLETE ======\n');
  process.exit(0);
}

run();
