interface TeamListsProps {
  players: Array<{
    userId: string
    name: string
    attendance: "confirmado" | "baja"
    team: "A" | "B" | null
    goals: number
    assists: number
  }>
  status: "programado" | "finalizado" | "cancelado"
  scoreA?: number
  scoreB?: number
}

export function TeamLists({ players, status, scoreA, scoreB }: TeamListsProps) {
  const confirmed = players.filter((p) => p.attendance === "confirmado")
  const baja = players.filter((p) => p.attendance === "baja")
  const teamA = confirmed.filter((p) => p.team === "A")
  const teamB = confirmed.filter((p) => p.team === "B")
  const withoutTeam = confirmed.filter((p) => !p.team)

  const hasTeams = teamA.length > 0 || teamB.length > 0

  if (hasTeams) {
    return (
      <div className="space-y-6">
        {status === "finalizado" && scoreA !== undefined && scoreB !== undefined && (
          <div className="text-center">
            <p className="font-display text-score tabular">
              {scoreA} – {scoreB}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="label-caps text-muted-foreground mb-3">Equipo A</p>
            <div className="space-y-2">
              {teamA.map((player) => (
                <div key={player.userId} className="flex items-center justify-between gap-2">
                  <span className="text-small text-foreground truncate">{player.name}</span>
                  {status === "finalizado" && (player.goals > 0 || player.assists > 0) && (
                    <span className="text-caption tabular text-muted-foreground whitespace-nowrap">
                      {player.goals > 0 && `${player.goals} G`}
                      {player.goals > 0 && player.assists > 0 && " · "}
                      {player.assists > 0 && `${player.assists} A`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="label-caps text-muted-foreground mb-3">Equipo B</p>
            <div className="space-y-2">
              {teamB.map((player) => (
                <div key={player.userId} className="flex items-center justify-between gap-2">
                  <span className="text-small text-foreground truncate">{player.name}</span>
                  {status === "finalizado" && (player.goals > 0 || player.assists > 0) && (
                    <span className="text-caption tabular text-muted-foreground whitespace-nowrap">
                      {player.goals > 0 && `${player.goals} G`}
                      {player.goals > 0 && player.assists > 0 && " · "}
                      {player.assists > 0 && `${player.assists} A`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {withoutTeam.length > 0 && (
          <div>
            <p className="label-caps text-muted-foreground mb-3">Confirmados ({withoutTeam.length})</p>
            <div className="space-y-2">
              {withoutTeam.map((player) => (
                <p key={player.userId} className="text-small text-foreground">
                  {player.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {baja.length > 0 && (
          <div>
            <p className="label-caps text-muted-foreground mb-3">Se bajaron ({baja.length})</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps text-muted-foreground mb-3">Confirmados ({confirmed.length})</p>
        <div className="space-y-2">
          {confirmed.map((player) => (
            <p key={player.userId} className="text-small text-foreground">
              {player.name}
            </p>
          ))}
        </div>
      </div>

      {baja.length > 0 && (
        <div>
          <p className="label-caps text-muted-foreground mb-3">Se bajaron ({baja.length})</p>
        </div>
      )}
    </div>
  )
}
