const API_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  const timestamp = Date.now();
  const testEmail = `user${timestamp}@example.com`;
  const testPassword = 'password123';
  let token = '';

  console.log('--- STARTING AUTH TESTS ---');

  const req = async (path, method = 'GET', body = null, headers = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, data };
    return data;
  };

  try {
    const data = await req('/register', 'POST', { email: testEmail, password: testPassword, full_name: 'Test User' });
    console.log('✅ Register valid:', data.message);
    if (data.user.password_hash) throw new Error('Password hash leaked!');
  } catch (err) {
    console.error('❌ Register valid failed:', err.data || err.message);
  }

  try {
    await req('/register', 'POST', { email: testEmail, password: testPassword, full_name: 'Test User 2' });
    console.error('❌ Register duplicate failed: Should have thrown 409');
  } catch (err) {
    if (err.status === 409) {
      console.log('✅ Register duplicate:', err.data.message);
    } else {
      console.error('❌ Register duplicate unexpected error:', err.data || err.message);
    }
  }

  try {
    await req('/register', 'POST', { email: 'invalidemail', password: '123' });
    console.error('❌ Register invalid failed: Should have thrown 400');
  } catch (err) {
    console.log('✅ Register invalid (short password/email format):', err.data?.message);
  }

  try {
    const data = await req('/login', 'POST', { email: testEmail, password: testPassword });
    console.log('✅ Login valid:', data.message);
    token = data.token;
    if (data.user.password_hash) throw new Error('Password hash leaked in login!');
  } catch (err) {
    console.error('❌ Login valid failed:', err.data || err.message);
  }

  try {
    await req('/login', 'POST', { email: testEmail, password: 'wrongpassword' });
    console.error('❌ Login invalid failed: Should have thrown 401');
  } catch (err) {
    if (err.status === 401) {
      console.log('✅ Login invalid password:', err.data.message);
    }
  }

  try {
    const data = await req('/me', 'GET', null, { Authorization: `Bearer ${token}` });
    console.log('✅ Get ME valid:', data.user.email);
    if (data.user.password_hash) throw new Error('Password hash leaked in ME!');
  } catch (err) {
    console.error('❌ Get ME valid failed:', err.data || err.message);
  }

  try {
    await req('/me', 'GET');
    console.error('❌ Get ME no token failed: Should have thrown 401');
  } catch (err) {
    if (err.status === 401) {
      console.log('✅ Get ME no token:', err.data.message);
    }
  }

  try {
    await req('/admin-only', 'GET', null, { Authorization: `Bearer ${token}` });
    console.error('❌ Admin Only failed: Should have thrown 403');
  } catch (err) {
    if (err.status === 403) {
      console.log('✅ Admin Only (User):', err.data.message);
    } else {
      console.error('❌ Admin Only unexpected status:', err.status);
    }
  }

  console.log('--- AUTH TESTS COMPLETE ---');
}

runTests();
