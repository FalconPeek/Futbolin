import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { ErrorState } from "@/components/layout/error-state";
import { RankingView } from "@/components/ranking/ranking-view";
import { createClient } from "@/lib/supabase/server";
import {
  computePlayerStandings,
  type GroupMatch,
  type Participation,
  type PlayerInfo,
} from "@/lib/standings/players";

interface RankingPageProps {
  params: Promise<{ gid: string }>;
}

export const metadata: Metadata = {
  title: "Ranking · Picado",
};

export default async function RankingPage({ params }: RankingPageProps) {
  const { gid } = await params;
  const supabase = await createClient();

  // Partidos finalizados del grupo, con quién jugó en cada uno
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("id, scheduled_at, finalized_at, status, score_a, score_b, match_players(user_id, team, goals, assists, attendance)")
    .eq("group_id", gid)
    .eq("status", "finalizado");

  if (matchesError) {
    return (
      <>
        <AppHeader title="Ranking" />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <ErrorState description="No pudimos cargar el ranking. Probá de nuevo en un rato." />
        </div>
      </>
    );
  }

  if (!matchesData || matchesData.length === 0) {
    return (
      <>
        <AppHeader title="Ranking" />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <RankingView rows={[]} />
        </div>
      </>
    );
  }

  // MVPs de cada partido
  const mvpResults = await Promise.all(
    matchesData.map((match) =>
      supabase.rpc("get_match_mvp_summary", { p_match_id: match.id })
    )
  );

  // Miembros del grupo con su nombre
  const { data: membersData } = await supabase
    .from("group_members")
    .select("user_id, profiles(display_name, nickname)")
    .eq("group_id", gid);

  // GroupMatch[] con los MVPs
  const matches: GroupMatch[] = matchesData.map((match, index) => {
    const mvpData = mvpResults[index]?.data;
    const closedRow = mvpData?.find((row) => row.closed);
    const mvpIds = closedRow?.mvp_ids ?? [];

    return {
      id: match.id,
      playedAt: match.finalized_at || match.scheduled_at,
      status: "finalizado" as const,
      scoreA: match.score_a,
      scoreB: match.score_b,
      mvpIds,
    };
  });

  // Participation[] a partir de match_players (solo confirmados con equipo)
  const participations: Participation[] = [];
  matchesData.forEach((match) => {
    match.match_players.forEach((player) => {
      if (player.attendance === "confirmado" && player.team !== null) {
        participations.push({
          matchId: match.id,
          userId: player.user_id,
          team: player.team,
          goals: player.goals,
          assists: player.assists,
        });
      }
    });
  });

  // PlayerInfo[] a partir de los miembros (apodo si tiene, si no el nombre)
  const players: PlayerInfo[] = (membersData ?? []).map((member) => {
    const nickname = member.profiles?.nickname;
    const displayName = member.profiles?.display_name || "Jugador";
    return {
      id: member.user_id,
      name: nickname || displayName,
    };
  });

  // Tabla
  const standingsRows = computePlayerStandings(matches, participations, players);

  return (
    <>
      <AppHeader title="Ranking" />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
        <RankingView rows={standingsRows} />
      </div>
    </>
  );
}
