import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

export const registerUser = async (email, password, fullName) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (existingUser) {
    throw new Error('User already exists');
  }

  // 2. Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insert user
  const { data: newUser, error } = await supabase
    .from('profiles')
    .insert([
      {
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: fullName || 'User',
        role: 'USER'
      }
    ])
    .select('id, email, full_name, role')
    .single();

  if (error) throw error;

  return newUser;
};

export const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Find user
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (error || !user) {
    throw new Error('Invalid credentials');
  }

  // 2. Compare password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Return safe user object
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

export const getUserById = async (id) => {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', id)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }
  return user;
};
