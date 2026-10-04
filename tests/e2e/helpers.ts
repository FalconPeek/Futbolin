import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Page } from "@playwright/test";
import type { Database } from "@/lib/database.types";

config({ path: ".env.test.local", quiet: true });

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY"
  );
}

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  client: SupabaseClient<Database>;
}

/**
 * Creates a test user via the Supabase admin API with a unique email and confirmed status.
 * Returns user credentials and a logged-in Supabase client.
 */
export async function createUser(displayName: string): Promise<TestUser> {
  const email = `e2e-${crypto.randomUUID()}@picado.test`;
  const password = "picado-test-1234";

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
  const client = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in user: ${signInError.message}`);
  }

  return { id, email, password, displayName, client };
}

/**
 * Logs in a user through the /ingresar UI and waits for navigation to /grupos.
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto("/ingresar");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Ingresá" }).click();
  await page.waitForURL("/grupos");
}

/**
 * Creates a group with the given owner and members via RPC calls.
 * Returns the group ID and invitation code.
 */
export async function createGroupWithMembers(
  owner: TestUser,
  members: TestUser[],
  groupName: string
): Promise<{ groupId: string; code: string }> {
  // Create group with owner
  const { data: groupData, error: createError } = await owner.client.rpc(
    "create_group",
    { p_name: groupName }
  );

  if (createError || !groupData) {
    throw new Error(`Failed to create group: ${createError?.message}`);
  }

  const groupId = groupData;

  // Get invite code
  const { data: groupInfo, error: fetchError } = await owner.client
    .from("groups")
    .select("invite_code")
    .eq("id", groupId)
    .single();

  if (fetchError || !groupInfo) {
    throw new Error(`Failed to fetch group: ${fetchError?.message}`);
  }

  const code = groupInfo.invite_code;

  // Add members to group
  for (const member of members) {
    const { error: joinError } = await member.client.rpc("join_group", {
      p_code: code,
    });

    if (joinError) {
      throw new Error(`Failed to add member: ${joinError.message}`);
    }
  }

  return { groupId, code };
}

/**
 * Confirms attendance for a user in a match via RPC.
 */
export async function confirmAttendance(
  user: TestUser,
  matchId: string
): Promise<void> {
  const { error } = await user.client.rpc("set_attendance", {
    p_match_id: matchId,
    p_status: "confirmado",
  });

  if (error) {
    throw new Error(`Failed to confirm attendance: ${error.message}`);
  }
}
