import { type Metadata } from "next"
import Link from "next/link"
import { Plus, CalendarDays } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/empty-state"
import { MatchCard } from "@/components/matches/match-card"

interface PartidosPageProps {
  params: Promise<{ gid: string }>
}

export const metadata: Metadata = {
  title: "Partidos · Picado",
}

export default async function PartidosPage({ params }: PartidosPageProps) {
  const { gid } = await params

  const supabase = await createClient()

  // Get all matches with attendance count
  const { data: matchesData } = await supabase
    .from("matches")
    .select(
      `
      id,
      scheduled_at,
      location,
      players_per_team,
      status,
      score_a,
      score_b,
      match_players(attendance)
    `
    )
    .eq("group_id", gid)
    .order("scheduled_at", { ascending: true })

  // Transform the data
  const matches = (matchesData || []).map((m) => {
    const confirmed = (m.match_players as unknown as Array<{ attendance: string }>)?.filter(
      (mp) => mp.attendance === "confirmado"
    ).length ?? 0

    return {
      id: m.id,
      groupId: gid,
      scheduledAt: m.scheduled_at,
      location: m.location,
      playersPerTeam: m.players_per_team,
      confirmed,
      status: m.status as "programado" | "finalizado" | "cancelado",
      scoreA: m.score_a,
      scoreB: m.score_b,
    }
  })

  // Separate matches
  const proximosMatches = matches
    .filter((m) => m.status === "programado")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const jugadosMatches = matches
    .filter((m) => m.status !== "programado")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  const hasMatches = matches.length > 0

  if (!hasMatches) {
    return (
      <>
        <AppHeader
          title="Partidos"
          backHref={`/g/${gid}`}
          right={
            <Link href={`/g/${gid}/partidos/nuevo`} aria-label="Crear partido">
              <Button variant="ghost" size="icon">
                <Plus className="size-5" />
              </Button>
            </Link>
          }
        />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <EmptyState
            icon={CalendarDays}
            title="Todavía no hay partidos"
            description="Armá el primero y avisale al grupo."
            action={
              <Button asChild variant="primary">
                <Link href={`/g/${gid}/partidos/nuevo`}>Crear partido</Link>
              </Button>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <AppHeader
        title="Partidos"
        backHref={`/g/${gid}`}
        right={
          <Link href={`/g/${gid}/partidos/nuevo`} aria-label="Crear partido">
            <Button variant="ghost" size="icon">
              <Plus className="size-5" />
            </Button>
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6 space-y-6 pb-nav">
        {proximosMatches.length > 0 && (
          <section>
            <h2 className="label-caps px-4 mb-3 text-muted-foreground">Próximos</h2>
            <div className="space-y-3">
              {proximosMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
            <Button asChild variant="primary" size="lg" block className="mt-4">
              <Link href={`/g/${gid}/partidos/nuevo`}>Crear partido</Link>
            </Button>
          </section>
        )}

        {jugadosMatches.length > 0 && (
          <section>
            <h2 className="label-caps px-4 mb-3 text-muted-foreground">Jugados</h2>
            <div className="space-y-3">
              {jugadosMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
