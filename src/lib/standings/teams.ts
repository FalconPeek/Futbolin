import type { StandingsRow } from "@/components/picado/types";

export type TournamentTeam = {
  id: string;
  name: string;
  color: string;
};

export type TournamentMatch = {
  id: string;
  round: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_pens: number | null;
  away_pens: number | null;
  status: "pendiente" | "jugado";
};

export type TeamStandingsRow = StandingsRow & { id: string };

/**
 * Determina el ganador de un partido.
 * - null si no está jugado o falta un equipo
 * - Gana por goles; si empatan, por penales
 * - Si no hay penales o empatan, null
 */
export function matchWinner(match: TournamentMatch): string | null {
  // Si no está jugado o falta un equipo
  if (
    match.status !== "jugado" ||
    match.home_team_id === null ||
    match.away_team_id === null ||
    match.home_score === null ||
    match.away_score === null
  ) {
    return null;
  }

  // Gana por goles
  if (match.home_score > match.away_score) {
    return match.home_team_id;
  }
  if (match.away_score > match.home_score) {
    return match.away_team_id;
  }

  // Empatan en goles, chequear penales
  if (
    match.home_pens !== null &&
    match.away_pens !== null &&
    match.home_pens !== match.away_pens
  ) {
    return match.home_pens > match.away_pens
      ? match.home_team_id
      : match.away_team_id;
  }

  // Empate sin desempate por penales
  return null;
}

/**
 * Calcula la tabla de posiciones de un torneo.
 * - Todos los equipos aparecen (con ceros si no jugaron)
 * - Solo se cuentan partidos "jugado" con ambos equipos y ambos scores
 * - Puntos: 3/1/0 para victoria/empate/derrota
 * - Los penales NO suman ni cuentan para G/E/P
 * - form = últimos 5 resultados G/E/P (más reciente al final)
 * - Orden: pts desc, diferencia de goles desc, gf desc, nombre asc (localeCompare es-AR)
 * - pos = índice + 1
 */
export function computeTeamStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): TeamStandingsRow[] {
  // Inicializar stats para cada equipo
  const stats: Record<
    string,
    {
      pj: number;
      g: number;
      e: number;
      p: number;
      gf: number;
      gc: number;
      pts: number;
      form: Array<"G" | "E" | "P">;
    }
  > = {};

  teams.forEach((team) => {
    stats[team.id] = {
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      pts: 0,
      form: [],
    };
  });

  // Procesar partidos jugados
  const playedMatches = matches
    .filter(
      (m) =>
        m.status === "jugado" &&
        m.home_team_id !== null &&
        m.away_team_id !== null &&
        m.home_score !== null &&
        m.away_score !== null
    )
    .sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.slot - b.slot;
    });

  playedMatches.forEach((match) => {
    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;
    const homeScore = match.home_score;
    const awayScore = match.away_score;

    // TypeScript type guard: después del filter, estos no son null
    if (homeTeamId === null || awayTeamId === null || homeScore === null || awayScore === null) {
      return;
    }

    // Verificar que ambos equipos existan en stats
    if (!stats[homeTeamId] || !stats[awayTeamId]) {
      return;
    }

    // Incrementar partidos jugados
    stats[homeTeamId].pj += 1;
    stats[awayTeamId].pj += 1;

    // Actualizar goles a favor y en contra (solo goles, no penales)
    stats[homeTeamId].gf += homeScore;
    stats[homeTeamId].gc += awayScore;
    stats[awayTeamId].gf += awayScore;
    stats[awayTeamId].gc += homeScore;

    // Determinar resultado (sin considerar penales)
    let homeResult: "G" | "E" | "P";
    let awayResult: "G" | "E" | "P";

    if (homeScore > awayScore) {
      homeResult = "G";
      awayResult = "P";
      stats[homeTeamId].g += 1;
      stats[homeTeamId].pts += 3;
      stats[awayTeamId].p += 1;
    } else if (awayScore > homeScore) {
      homeResult = "P";
      awayResult = "G";
      stats[awayTeamId].g += 1;
      stats[awayTeamId].pts += 3;
      stats[homeTeamId].p += 1;
    } else {
      // Empate (los penales no afectan la tabla)
      homeResult = "E";
      awayResult = "E";
      stats[homeTeamId].e += 1;
      stats[homeTeamId].pts += 1;
      stats[awayTeamId].e += 1;
      stats[awayTeamId].pts += 1;
    }

    // Agregar a form (máximo últimos 5)
    stats[homeTeamId].form.push(homeResult);
    if (stats[homeTeamId].form.length > 5) {
      stats[homeTeamId].form.shift();
    }

    stats[awayTeamId].form.push(awayResult);
    if (stats[awayTeamId].form.length > 5) {
      stats[awayTeamId].form.shift();
    }
  });

  // Construir rows
  const rows: TeamStandingsRow[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    ...stats[team.id],
  }));

  // Ordenar: pts desc, DG desc, gf desc, nombre asc (localeCompare es-AR)
  rows.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    const dgA = a.gf - a.gc;
    const dgB = b.gf - b.gc;
    if (dgA !== dgB) return dgB - dgA;
    if (a.gf !== b.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name, "es-AR");
  });

  // Asignar posiciones
  rows.forEach((row, idx) => {
    row.pos = idx + 1;
  });

  return rows;
}

/**
 * Determina el campeón del torneo.
 * - "liga": el id del primero de la tabla, solo si todos los partidos están "jugado"
 * - "eliminacion": matchWinner de la final (round máximo), o null si no se jugó
 */
export function tournamentChampion(
  format: "liga" | "eliminacion",
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): string | null {
  if (format === "liga") {
    // Verificar que todos los partidos están jugado
    const allPlayed = matches.every(
      (m) => m.status === "jugado" || m.home_team_id === null || m.away_team_id === null
    );

    if (!allPlayed) {
      return null;
    }

    // Obtener el primero de la tabla
    const standings = computeTeamStandings(teams, matches);
    return standings.length > 0 ? standings[0].id : null;
  }

  if (format === "eliminacion") {
    // Encontrar la final (máximo round)
    const maxRound = Math.max(...matches.map((m) => m.round), -1);

    if (maxRound < 0) {
      return null;
    }

    // Buscar la final en el máximo round
    const finals = matches.filter((m) => m.round === maxRound);

    if (finals.length === 0) {
      return null;
    }

    // Determinar ganador de la final
    // La final debería ser el último partido del máximo round (o si hay varios, el de máximo slot)
    const finalMatch = finals.sort((a, b) => b.slot - a.slot)[0];

    return matchWinner(finalMatch);
  }

  return null;
}
