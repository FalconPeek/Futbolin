"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, mapDbError, ERROR_MESSAGES } from "@/lib/result";
import {
  tournamentSchema,
  teamSchema,
  tournamentResultSchema,
} from "@/lib/validators/tournaments";
import { roundRobin, bracket, FixtureRow } from "@/lib/tournaments/fixtures";
import type { Database } from "@/lib/database.types";

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function createTournament({
  groupId,
  name,
  format,
  legs,
}: {
  groupId: string;
  name: string;
  format: "liga" | "eliminacion";
  legs: number;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const parsed = tournamentSchema.safeParse({ name, format, legs });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      group_id: groupId,
      name: parsed.data.name,
      format: parsed.data.format,
      legs: parsed.data.legs,
    })
    .select("id")
    .single();

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${data.id}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok({
    tournamentId: data.id,
    redirectTo: `/g/${groupId}/torneos/${data.id}/equipos`,
  });
}

export async function renameTournament({
  tournamentId,
  groupId,
  name,
}: {
  tournamentId: string;
  groupId: string;
  name: string;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const parsed = tournamentSchema.safeParse({ name, format: "liga", legs: 1 });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ name: parsed.data.name })
    .eq("id", tournamentId);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}

export async function addTeam({
  tournamentId,
  groupId,
  name,
  color,
}: {
  tournamentId: string;
  groupId: string;
  name: string;
  color: string;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const parsed = teamSchema.safeParse({ name, color });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const { error } = await supabase
    .from("tournament_teams")
    .insert({
      tournament_id: tournamentId,
      name: parsed.data.name,
      color: parsed.data.color,
    });

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}/equipos`);
  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}

export async function updateTeam({
  teamId,
  tournamentId,
  groupId,
  name,
  color,
}: {
  teamId: string;
  tournamentId: string;
  groupId: string;
  name: string;
  color: string;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const parsed = teamSchema.safeParse({ name, color });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const { error } = await supabase
    .from("tournament_teams")
    .update({ name: parsed.data.name, color: parsed.data.color })
    .eq("id", teamId);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}/equipos`);
  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}

export async function removeTeam({
  teamId,
  tournamentId,
  groupId,
}: {
  teamId: string;
  tournamentId: string;
  groupId: string;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { error } = await supabase
    .from("tournament_teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}/equipos`);
  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}

export async function startTournament({
  tournamentId,
  groupId,
}: {
  tournamentId: string;
  groupId: string;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  // Fetch tournament details
  const { data: tournament, error: tourError } = await supabase
    .from("tournaments")
    .select("id, format, legs")
    .eq("id", tournamentId)
    .single();

  if (tourError || !tournament) {
    return fail(mapDbError(tourError));
  }

  // Fetch tournament teams
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (teamsError) {
    return fail(mapDbError(teamsError));
  }

  if (!teams || teams.length < 2) {
    return fail(ERROR_MESSAGES.NOT_ENOUGH_TEAMS);
  }

  const teamIds = teams.map((t) => t.id);
  const shuffledIds = shuffleArray(teamIds);

  let fixtures: FixtureRow[];
  if (tournament.format === "liga") {
    fixtures = roundRobin(shuffledIds, tournament.legs as 1 | 2);
  } else {
    fixtures = bracket(shuffledIds);
  }

  const { error: rpcError } = await supabase.rpc("start_tournament", {
    p_tournament_id: tournamentId,
    p_fixtures: fixtures,
  });

  if (rpcError) {
    return fail(mapDbError(rpcError));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok({ redirectTo: `/g/${groupId}/torneos/${tournamentId}` });
}

export async function reportTournamentResult({
  matchId,
  tournamentId,
  groupId,
  format,
  home_score,
  away_score,
  home_pens,
  away_pens,
}: {
  matchId: string;
  tournamentId: string;
  groupId: string;
  format: "liga" | "eliminacion";
  home_score: number;
  away_score: number;
  home_pens: number | null;
  away_pens: number | null;
}) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const parsed = tournamentResultSchema.safeParse({
    format,
    home_score,
    away_score,
    home_pens,
    away_pens,
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const rpcPayload: Database["public"]["Functions"]["report_tournament_result"]["Args"] = {
    p_match_id: matchId,
    p_home: parsed.data.home_score,
    p_away: parsed.data.away_score,
  };

  if (parsed.data.home_pens !== null) {
    rpcPayload.p_home_pens = parsed.data.home_pens;
  }

  if (parsed.data.away_pens !== null) {
    rpcPayload.p_away_pens = parsed.data.away_pens;
  }

  const { error } = await supabase.rpc("report_tournament_result", rpcPayload);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath(`/g/${groupId}/torneos/${tournamentId}`);
  revalidatePath(`/g/${groupId}/torneos`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}
