import { supabase } from './config/supabase.js';

async function testConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('Connection failed:', error.message);
      process.exit(1);
    }
    console.log('Supabase connection successful. Profiles query ok.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

testConnection();
