
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

console.log("Starting demo user creation...");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createDemoUsers() {
  try {
    for (let i = 6; i <= 100; i++) {
      const email = `user${i}@gmail.com`;
      const password = `user${i}123`;

      console.log(`Creating ${email}...`);

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: `user${i}`,
        },
      });

      if (error) {
        console.error(`Failed: ${email} - ${error.message}`);
        continue;
      }

      console.log(`Created ${email}, ID: ${data.user.id}`);
    }

    console.log("Demo user creation process finished.");
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

createDemoUsers();
