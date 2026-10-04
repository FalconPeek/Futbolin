import type { StandingsRow } from "@/components/picado/types";

export type GroupMatch = {
  id: string;
  playedAt: string;
  status: "programado" | "finalizado" | "cancelado";
  scoreA: number | null;
  scoreB: number | null;
  mvpIds?: string[];
};

export type Participation = {
  matchId: string;
  userId: string;
  team: "A" | "B" | null;
  goals: number;
  assists: number;
};

export type PlayerInfo = {
  id: string;
  name: string;
};

export type PlayerStandingsRow = StandingsRow & {
  id: string;
  goals: number;
  assists: number;
  mvps: number;
};

export function computePlayerStandings(
  matches: GroupMatch[],
  participations: Participation[],
  players: PlayerInfo[]
): PlayerStandingsRow[] {
  // Map player info for quick lookup
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Filter valid matches: only finalized with scores
  const validMatches = matches.filter(
    (m) => m.status === "finalizado" && m.scoreA !== null && m.scoreB !== null
  );

  // Map match ids for quick score lookup
  const matchMap = new Map(validMatches.map((m) => [m.id, m]));

  // Filter valid participations: only from valid matches with team assigned
  const validParticipations = participations.filter((p) => {
    const match = matchMap.get(p.matchId);
    return match && p.team !== null;
  });

  // Group participations by player
  const playerStats = new Map<
    string,
    {
      participations: Participation[];
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goals: number;
      assists: number;
      mvps: number;
      matchResults: Array<{ date: string; result: "G" | "E" | "P" }>;
    }
  >();

  // Initialize player stats
  for (const userId of new Set(validParticipations.map((p) => p.userId))) {
    playerStats.set(userId, {
      participations: [],
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goals: 0,
      assists: 0,
      mvps: 0,
      matchResults: [],
    });
  }

  // Process participations
  for (const p of validParticipations) {
    const match = matchMap.get(p.matchId)!;
    const stats = playerStats.get(p.userId)!;

    stats.participations.push(p);
    stats.goals += p.goals;
    stats.assists += p.assists;

    // Calculate team result
    const isTeamA = p.team === "A";
    const teamScore = isTeamA ? match.scoreA! : match.scoreB!;
    const opponentScore = isTeamA ? match.scoreB! : match.scoreA!;

    stats.goalsFor += teamScore;
    stats.goalsAgainst += opponentScore;

    if (teamScore > opponentScore) {
      stats.wins++;
      stats.matchResults.push({ date: match.playedAt, result: "G" });
    } else if (teamScore === opponentScore) {
      stats.draws++;
      stats.matchResults.push({ date: match.playedAt, result: "E" });
    } else {
      stats.losses++;
      stats.matchResults.push({ date: match.playedAt, result: "P" });
    }

    // Count MVP appearances
    if (match.mvpIds && match.mvpIds.includes(p.userId)) {
      stats.mvps++;
    }
  }

  // Build standings rows
  const rows: PlayerStandingsRow[] = [];

  for (const [userId, stats] of playerStats.entries()) {
    const pj = stats.participations.length;

    // Only include players with at least 1 match
    if (pj < 1) continue;

    const pts = stats.wins * 3 + stats.draws;

    // Sort match results by date and take last 5
    const sortedResults = stats.matchResults.sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const form = sortedResults.slice(-5).map((r) => r.result);

    const playerInfo = playerMap.get(userId);
    const name = playerInfo?.name || "Jugador";

    rows.push({
      id: userId,
      name,
      pj,
      g: stats.wins,
      e: stats.draws,
      p: stats.losses,
      gf: stats.goalsFor,
      gc: stats.goalsAgainst,
      pts,
      form,
      goals: stats.goals,
      assists: stats.assists,
      mvps: stats.mvps,
    });
  }

  // Sort by: pts desc, DG desc, gf desc, goals desc, name asc (es-AR)
  rows.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    const dgA = a.gf - a.gc;
    const dgB = b.gf - b.gc;
    if (dgA !== dgB) return dgB - dgA;
    if (a.gf !== b.gf) return b.gf - a.gf;
    if (a.goals !== b.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name, "es-AR");
  });

  // Add position
  rows.forEach((row, index) => {
    row.pos = index + 1;
  });

  return rows;
}
