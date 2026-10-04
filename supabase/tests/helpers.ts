import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
  throw new Error(
    `Missing Supabase environment variables. Required: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY`
  );
}

export const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function anon() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

export async function newUser(displayName?: string) {
  const email = `t-${crypto.randomUUID()}@picado.test`;
  const password = 'picado-test-1234';

  const metadata: Record<string, string> = {};
  if (displayName && displayName.length >= 2) {
    metadata.display_name = displayName;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user: ${error?.message}`);
  }

  const id = data.user.id;
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in user: ${signInError.message}`);
  }

  return { id, email, client };
}
