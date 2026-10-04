import { Button } from "@/components/ui/button";
import { roundLabel } from "@/lib/tournaments/rounds";
import type { TournamentMatch, TournamentTeam } from "@/lib/standings/teams";

export function FixtureList({
  teams,
  matches,
  format,
  resultHref,
}: {
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  format: "liga" | "eliminacion";
  resultHref: ((match: TournamentMatch) => string) | null;
}) {
  // Crear mapa de equipos
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Agrupar partidos por ronda
  const roundsMap = new Map<number, TournamentMatch[]>();
  matches.forEach((match) => {
    if (!roundsMap.has(match.round)) {
      roundsMap.set(match.round, []);
    }
    roundsMap.get(match.round)!.push(match);
  });

  // Ordenar partidos dentro de cada ronda por slot
  roundsMap.forEach((matches) => {
    matches.sort((a, b) => a.slot - b.slot);
  });

  // Obtener rondas en orden
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {rounds.map((round) => {
        const roundMatches = roundsMap.get(round) || [];
        const label = roundLabel(format, round, totalRounds);

        return (
          <section key={`round-${round}`} aria-label={label}>
            {/* Encabezado de ronda */}
            <h3 className="label-caps text-muted-foreground mb-3">{label}</h3>

            {/* Partidos */}
            <div className="space-y-2">
              {roundMatches.map((match) => {
                const homeTeam = match.home_team_id ? teamMap.get(match.home_team_id) : null;
                const awayTeam = match.away_team_id ? teamMap.get(match.away_team_id) : null;

                return (
                  <div
                    key={`match-${match.id}`}
                    className="flex flex-col gap-2 bg-card border border-border rounded-md p-3"
                  >
                    {/* Fila del partido */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Local */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {homeTeam ? (
                          <>
                            <span
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: homeTeam.color }}
                              aria-hidden
                            />
                            <span className="truncate text-body">{homeTeam.name}</span>
                          </>
                        ) : (
                          <span className="text-body text-muted-foreground">A definir</span>
                        )}
                      </div>

                      {/* Resultado */}
                      <div className="flex-shrink-0 text-center min-w-16">
                        {match.status === "pendiente" ? (
                          <span className="text-body text-muted-foreground">vs</span>
                        ) : (
                          <span className="font-display tabular text-score">
                            {match.home_score} – {match.away_score}
                          </span>
                        )}
                      </div>

                      {/* Visitante */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        {awayTeam ? (
                          <>
                            <span className="truncate text-body text-right">{awayTeam.name}</span>
                            <span
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: awayTeam.color }}
                              aria-hidden
                            />
                          </>
                        ) : (
                          <span className="text-body text-muted-foreground">A definir</span>
                        )}
                      </div>
                    </div>

                    {/* Botón de carga (si aplica) */}
                    {resultHref &&
                      match.status === "pendiente" &&
                      match.home_team_id &&
                      match.away_team_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="self-start"
                        >
                          <a href={resultHref(match)}>Cargar resultado</a>
                        </Button>
                      )}
                    {resultHref &&
                      match.status === "jugado" &&
                      match.home_team_id &&
                      match.away_team_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="self-start"
                        >
                          <a href={resultHref(match)}>Corregir</a>
                        </Button>
                      )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
