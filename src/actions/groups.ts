"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, fail, mapDbError, ok } from "@/lib/result";
import { groupSchema, inviteCodeSchema } from "@/lib/validators/groups";

const INVALID_DATA = "Revisá los datos e intentá de nuevo.";
const NOT_SIGNED_IN = "Tenés que ingresar para hacer esto.";

const leaveGroupSchema = z.object({ groupId: z.uuid(INVALID_DATA) });

const memberSchema = z.object({
  groupId: z.uuid(INVALID_DATA),
  userId: z.uuid(INVALID_DATA),
});

const memberRoleSchema = memberSchema.extend({
  role: z.enum(["admin", "member"], INVALID_DATA),
});

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export async function createGroup(input: {
  name: string;
}): Promise<ActionResult<{ groupId: string; redirectTo: string }>> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    return fail(NOT_SIGNED_IN);
  }

  const { data: groupId, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
  });
  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath("/grupos");
  return ok({ groupId, redirectTo: `/g/${groupId}` });
}

export async function joinGroup(input: {
  code: string;
}): Promise<ActionResult<{ groupId: string; redirectTo: string }>> {
  const parsed = inviteCodeSchema.safeParse(input.code);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    return fail(NOT_SIGNED_IN);
  }

  const { data: groupId, error } = await supabase.rpc("join_group", {
    p_code: parsed.data,
  });
  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath("/grupos");
  return ok({ groupId, redirectTo: `/g/${groupId}` });
}

export async function leaveGroup(input: {
  groupId: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = leaveGroupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    return fail(NOT_SIGNED_IN);
  }

  const { error } = await supabase.rpc("leave_group", {
    p_group_id: parsed.data.groupId,
  });
  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath("/grupos");
  return ok({ redirectTo: "/grupos" });
}

export async function removeMember(input: {
  groupId: string;
  userId: string;
}): Promise<ActionResult<null>> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    return fail(NOT_SIGNED_IN);
  }

  const { groupId, userId } = parsed.data;
  const { error } = await supabase.rpc("remove_member", {
    p_group_id: groupId,
    p_user_id: userId,
  });
  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/miembros`);
  return ok(null);
}

export async function setMemberRole(input: {
  groupId: string;
  userId: string;
  role: "admin" | "member";
}): Promise<ActionResult<null>> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    return fail(NOT_SIGNED_IN);
  }

  const { groupId, userId, role } = parsed.data;
  const { error } = await supabase.rpc("set_member_role", {
    p_group_id: groupId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/miembros`);
  return ok(null);
}
