
import bcrypt from "bcryptjs";
import { supabase } from "./src/config/supabase.js";

async function fixDemoPasswords() {
  for (let i = 1; i <= 100; i++) {
    const email = `user${i}@gmail.com`;
    const password = `user${i}123`;

    // Generate a valid bcrypt hash
    const passwordHash = await bcrypt.hash(password, 10);

    // Update only the matching demo user's profile
    const { data, error } = await supabase
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("email", email)
      .select("id, email");

    if (error) {
      console.error(`Failed: ${email}`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`Profile not found: ${email}`);
      continue;
    }

    console.log(`Password configured: ${email}`);
  }

  console.log("Finished updating demo passwords.");
}

fixDemoPasswords().catch(console.error);
