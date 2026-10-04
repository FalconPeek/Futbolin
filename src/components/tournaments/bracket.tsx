import { cn } from "@/lib/utils";
import { matchWinner, type TournamentMatch, type TournamentTeam } from "@/lib/standings/teams";
import { roundLabel } from "@/lib/tournaments/rounds";

export function Bracket({
  teams,
  matches,
  renderAction,
}: {
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  renderAction?: (match: TournamentMatch) => React.ReactNode;
}) {
  // Calcular total de rondas
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  // Crear un mapa de equipos para búsqueda rápida
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Agrupar matches por ronda, ordenados por slot
  const roundsMap = new Map<number, TournamentMatch[]>();
  matches.forEach((match) => {
    if (!roundsMap.has(match.round)) {
      roundsMap.set(match.round, []);
    }
    roundsMap.get(match.round)!.push(match);
  });

  // Ordenar matches dentro de cada ronda por slot
  roundsMap.forEach((matches) => {
    matches.sort((a, b) => a.slot - b.slot);
  });

  // Obtener rondas en orden
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-min p-4">
        {rounds.map((round) => {
          const roundMatches = roundsMap.get(round) || [];
          const label = roundLabel("eliminacion", round, totalRounds);

          return (
            <section
              key={`round-${round}`}
              aria-label={label}
              className="flex-shrink-0 flex flex-col min-w-56"
            >
              {/* Encabezado de ronda */}
              <div className="label-caps text-muted-foreground mb-4">{label}</div>

              {/* Cruces de la ronda */}
              <div className="flex flex-col gap-3">
                {roundMatches.map((match) => {
                  const homeTeam = match.home_team_id ? teamMap.get(match.home_team_id) : null;
                  const awayTeam = match.away_team_id ? teamMap.get(match.away_team_id) : null;
                  const winner = matchWinner(match);

                  return (
                    <article
                      key={`match-${match.id}`}
                      className="bg-card border border-border rounded-md overflow-hidden"
                    >
                      {/* Local */}
                      <div
                        className={cn(
                          "flex items-center gap-2 p-3 border-b border-border",
                          winner === match.home_team_id && "font-semibold",
                          winner === match.away_team_id && "text-muted-foreground"
                        )}
                      >
                        {homeTeam ? (
                          <>
                            <span
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: homeTeam.color }}
                              aria-hidden
                            />
                            <span className="truncate flex-1 text-body">{homeTeam.name}</span>
                            {match.status === "jugado" &&
                              match.home_score !== null &&
                              match.away_score !== null && (
                                <span className="font-display tabular text-score ml-2">
                                  {match.home_score}
                                  {match.home_pens !== null && (
                                    <span className="text-small">({match.home_pens})</span>
                                  )}
                                </span>
                              )}
                          </>
                        ) : (
                          <span className="text-body text-muted-foreground">A definir</span>
                        )}
                      </div>

                      {/* Visitante */}
                      <div
                        className={cn(
                          "flex items-center gap-2 p-3",
                          winner === match.away_team_id && "font-semibold",
                          winner === match.home_team_id && "text-muted-foreground"
                        )}
                      >
                        {awayTeam ? (
                          <>
                            <span
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: awayTeam.color }}
                              aria-hidden
                            />
                            <span className="truncate flex-1 text-body">{awayTeam.name}</span>
                            {match.status === "jugado" &&
                              match.home_score !== null &&
                              match.away_score !== null && (
                                <span className="font-display tabular text-score ml-2">
                                  {match.away_score}
                                  {match.away_pens !== null && (
                                    <span className="text-small">({match.away_pens})</span>
                                  )}
                                </span>
                              )}
                          </>
                        ) : (
                          <span className="text-body text-muted-foreground">A definir</span>
                        )}
                      </div>

                      {/* Acción (si viene) */}
                      {renderAction && (
                        <div className="border-t border-border p-3 bg-muted">
                          {renderAction(match)}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
