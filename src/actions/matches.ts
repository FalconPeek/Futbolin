"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult, ok, fail, mapDbError } from "@/lib/result";
import { matchSchema, resultSchema } from "@/lib/validators/matches";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createMatch(
  input: unknown
): Promise<ActionResult<{ matchId: string; redirectTo: string }>> {
  // Validate match data first
  const parsed = matchSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  // Validate groupId early to avoid unnecessary DB calls
  const groupIdInput = (input as unknown as Record<string, unknown>)?.groupId;
  if (!groupIdInput || typeof groupIdInput !== "string") {
    return fail("El grupo no es válido.");
  }

  const groupIdParsed = z.string().uuid().safeParse(groupIdInput);
  if (!groupIdParsed.success) {
    return fail("El grupo no es válido.");
  }

  const groupId = groupIdParsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { scheduled_at, location, players_per_team } = parsed.data;

  const { data, error } = await supabase
    .from("matches")
    .insert({
      group_id: groupId,
      scheduled_at: scheduled_at.toISOString(),
      location,
      players_per_team,
    })
    .select("id")
    .single();

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${data.id}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok({
    matchId: data.id,
    redirectTo: `/g/${groupId}/partidos/${data.id}`,
  });
}

export async function updateMatch(input: unknown): Promise<ActionResult<void>> {
  const baseSchema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
    scheduled_at: matchSchema.shape.scheduled_at.optional(),
    location: matchSchema.shape.location.optional(),
    players_per_team: matchSchema.shape.players_per_team.optional(),
  });

  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId, scheduled_at, location, players_per_team } = parsed.data;

  const updateData: {
    scheduled_at?: string;
    location?: string;
    players_per_team?: number;
  } = {};
  if (scheduled_at !== undefined) {
    updateData.scheduled_at = scheduled_at.toISOString();
  }
  if (location !== undefined) {
    updateData.location = location;
  }
  if (players_per_team !== undefined) {
    updateData.players_per_team = players_per_team;
  }

  const { error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}

export async function cancelMatch(input: unknown): Promise<ActionResult<void>> {
  const schema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId } = parsed.data;

  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelado" })
    .eq("id", matchId);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}

export async function setAttendance(input: unknown): Promise<ActionResult<void>> {
  const schema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
    status: z.enum(["confirmado", "baja"] as const),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId, status } = parsed.data;

  const { error } = await supabase.rpc("set_attendance", {
    p_match_id: matchId,
    p_status: status,
  });

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}

export async function assignTeams(input: unknown): Promise<ActionResult<void>> {
  const schema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
    assignments: z.array(
      z.object({
        user_id: z.string().uuid(),
        team: z.enum(["A", "B"]).nullable(),
      })
    ),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId, assignments } = parsed.data;

  const { error } = await supabase.rpc("assign_teams", {
    p_match_id: matchId,
    p_assignments: assignments,
  });

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}

export async function finalizeMatch(input: unknown): Promise<ActionResult<void>> {
  const baseSchema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
  });

  const baseInput = baseSchema.safeParse(input);
  if (!baseInput.success) {
    return fail(baseInput.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId } = baseInput.data;
  const { score_a, score_b, stats } = parsed.data;

  // Map stats to RPC format (remove team field)
  const p_stats = stats.map(({ user_id, goals, assists }) => ({
    user_id,
    goals,
    assists,
  }));

  const { error } = await supabase.rpc("finalize_match", {
    p_match_id: matchId,
    p_score_a: score_a,
    p_score_b: score_b,
    p_stats,
  });

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}

export async function voteMvp(input: unknown): Promise<ActionResult<void>> {
  const schema = z.object({
    matchId: z.string().uuid(),
    groupId: z.string().uuid(),
    votedId: z.string().uuid(),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { matchId, groupId, votedId } = parsed.data;

  const { error } = await supabase.rpc("vote_mvp", {
    p_match_id: matchId,
    p_voted_id: votedId,
  });

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/partidos/${matchId}`);
  revalidatePath(`/g/${groupId}/partidos`);
  revalidatePath(`/g/${groupId}`);

  return ok(undefined);
}
