import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { TournamentResultForm } from "@/components/tournaments/tournament-result-form";
import { roundLabel } from "@/lib/tournaments/rounds";

export const metadata = {
  title: "Resultado · Picado",
};

export default async function TournamentResultPage({
  params,
}: {
  params: Promise<{ gid: string; tid: string; tmid: string }>;
}) {
  const { gid, tid, tmid } = await params;
  const client = await createClient();

  // Get user session
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/torneos/${tid}/partidos/${tmid}`);
  }

  // Verify user is group member
  const { data: membership } = await client
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get tournament
  const { data: tournament, error: tournamentError } = await client
    .from("tournaments")
    .select("id, name, format, status, created_by, group_id")
    .eq("id", tid)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // Check tournament is in_curso
  if (tournament.status !== "en_curso") {
    redirect(`/g/${gid}/torneos/${tid}`);
  }

  // Verify user is organizer (creator or admin)
  const { data: groupAdmins } = await client
    .from("group_members")
    .select("user_id")
    .eq("group_id", gid)
    .eq("role", "admin");

  const isOrganizer =
    tournament.created_by === user.id ||
    (groupAdmins?.some((admin) => admin.user_id === user.id) ?? false);

  if (!isOrganizer) {
    redirect(`/g/${gid}/torneos/${tid}`);
  }

  // Get tournament match with home team
  const { data: match, error: matchError } = await client
    .from("tournament_matches")
    .select(
      `
      id,
      round,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_pens,
      away_pens,
      status,
      tournament_id
    `
    )
    .eq("id", tmid)
    .eq("tournament_id", tid)
    .single();

  if (matchError || !match) {
    notFound();
  }

  // Both teams must be defined
  if (!match.home_team_id || !match.away_team_id) {
    redirect(`/g/${gid}/torneos/${tid}`);
  }

  // Get home and away teams
  const { data: homeTeam } = await client
    .from("tournament_teams")
    .select("id, name, color")
    .eq("id", match.home_team_id)
    .single();

  const { data: awayTeam } = await client
    .from("tournament_teams")
    .select("id, name, color")
    .eq("id", match.away_team_id)
    .single();

  if (!homeTeam || !awayTeam) {
    redirect(`/g/${gid}/torneos/${tid}`);
  }

  // Get total rounds to display round label
  const { data: allMatches } = await client
    .from("tournament_matches")
    .select("round")
    .eq("tournament_id", tid);

  const totalRounds = allMatches && allMatches.length > 0
    ? Math.max(...allMatches.map((m) => m.round), 1)
    : 1;

  const roundLabelText = roundLabel(
    tournament.format as "liga" | "eliminacion",
    match.round,
    totalRounds
  );

  const initial =
    match.status === "jugado"
      ? {
          home_score: match.home_score ?? 0,
          away_score: match.away_score ?? 0,
          home_pens: match.home_pens,
          away_pens: match.away_pens,
        }
      : null;

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        title="Cargar resultado"
        backHref={`/g/${gid}/torneos/${tid}`}
      />

      <div className="flex-1 overflow-auto pb-nav">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4 space-y-4">
          {/* Round label */}
          <p className="label-caps text-muted-foreground">{roundLabelText}</p>

          {/* Form */}
          <TournamentResultForm
            matchId={tmid}
            tournamentId={tid}
            groupId={gid}
            format={tournament.format as "liga" | "eliminacion"}
            home={{
              name: homeTeam.name,
              color: homeTeam.color,
            }}
            away={{
              name: awayTeam.name,
              color: awayTeam.color,
            }}
            initial={initial}
          />
        </div>
      </div>
    </div>
  );
}
