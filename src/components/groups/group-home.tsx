"use client"

import Link from "next/link"
import { Star, IdCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchCard } from "@/components/matches/match-card"
import { TournamentCard } from "@/components/tournaments/tournament-card"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  id: string
  groupId: string
  scheduledAt: string
  location: string
  playersPerTeam: number
  confirmed: number
  status: "programado" | "finalizado" | "cancelado"
  scoreA: number | null
  scoreB: number | null
}

interface TournamentCardProps {
  id: string
  groupId: string
  name: string
  format: "liga" | "eliminacion"
  teamCount: number
  status: "borrador" | "en_curso" | "finalizado"
  championName: string | null
}

interface PendingVote {
  matchId: string
  label: string
}

interface GroupHomeProps {
  groupId: string
  nextMatch: MatchCardProps | null
  pendingVotes: PendingVote[]
  unratedCount: number
  tournaments: TournamentCardProps[]
}

export function GroupHome({
  groupId,
  nextMatch,
  pendingVotes,
  unratedCount,
  tournaments,
}: GroupHomeProps) {
  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 py-6 space-y-6">
      {/* Próximo partido section */}
      <section>
        <h2 className="text-title font-semibold mb-4">Próximo partido</h2>
        {nextMatch ? (
          <MatchCard match={nextMatch} />
        ) : (
          <>
            <p className="text-body text-muted-foreground mb-4">
              No hay partidos programados.
            </p>
            <Button asChild variant="primary" block>
              <Link href={`/g/${groupId}/partidos/nuevo`}>Crear partido</Link>
            </Button>
          </>
        )}
      </section>

      {/* Pendientes section */}
      <section>
        <h2 className="text-title font-semibold mb-4">Pendientes</h2>
        {pendingVotes.length === 0 && unratedCount === 0 ? (
          <p className="text-body text-muted-foreground">Estás al día.</p>
        ) : (
          <div className="space-y-3">
            {/* Votos MVP pendientes */}
            {pendingVotes.map((vote) => (
              <Link
                key={vote.matchId}
                href={`/g/${groupId}/partidos/${vote.matchId}`}
                className={cn(
                  "flex items-center gap-3 p-4",
                  "bg-card border border-border rounded-lg",
                  "hover:bg-accent transition-colors",
                  "active:brightness-95",
                  "min-h-tap"
                )}
              >
                <Star className="size-5 flex-shrink-0 text-gold" />
                <span className="text-body flex-1 min-w-0 truncate">
                  Votá al MVP del partido del {vote.label}
                </span>
              </Link>
            ))}

            {/* Calificaciones pendientes */}
            {unratedCount > 0 && (
              <Link
                href={`/g/${groupId}/cartas`}
                className={cn(
                  "flex items-center justify-between gap-3 p-4",
                  "bg-card border border-border rounded-lg",
                  "hover:bg-accent transition-colors",
                  "active:brightness-95",
                  "min-h-tap"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IdCard className="size-5 flex-shrink-0" />
                  <span className="text-body flex-1 truncate">
                    Calificá a tus compañeros
                  </span>
                </div>
                <span className="text-small text-muted-foreground flex-shrink-0 tabular">
                  {unratedCount} sin calificar
                </span>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Torneos en curso section */}
      <section>
        <h2 className="text-title font-semibold mb-4">Torneos en curso</h2>
        {tournaments.length === 0 ? (
          <>
            <p className="text-body text-muted-foreground mb-4">
              No hay torneos en curso.
            </p>
            <Button asChild variant="ghost">
              <Link href={`/g/${groupId}/torneos`}>Ver torneos</Link>
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
