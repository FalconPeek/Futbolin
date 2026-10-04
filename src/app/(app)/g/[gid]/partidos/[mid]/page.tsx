import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatMatchDate } from "@/lib/format/date"
import { AppHeader } from "@/components/layout/app-header"
import { ErrorState } from "@/components/layout/error-state"
import { Badge } from "@/components/ui/badge"
import { AttendanceToggle } from "@/components/matches/attendance-toggle"
import { MatchActions } from "@/components/matches/match-actions"
import { MvpVote } from "@/components/matches/mvp-vote"
import { TeamLists } from "@/components/matches/team-lists"

interface PartidoPageProps {
  params: Promise<{ gid: string; mid: string }>
}

export const metadata: Metadata = {
  title: "Partido · Picado",
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_BADGE = {
  programado: { variant: "info", label: "Programado" },
  finalizado: { variant: "neutral", label: "Finalizado" },
  cancelado: { variant: "destructive", label: "Cancelado" },
} as const

export default async function PartidoPage({ params }: PartidoPageProps) {
  const { gid, mid } = await params

  if (!UUID_REGEX.test(mid)) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/partidos/${mid}`)
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, group_id, scheduled_at, location, players_per_team, status, score_a, score_b, created_by, finalized_at"
    )
    .eq("id", mid)
    .eq("group_id", gid)
    .maybeSingle()

  if (matchError) {
    return (
      <>
        <AppHeader title="Partido" backHref={`/g/${gid}/partidos`} />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <ErrorState description="No pudimos cargar el partido. Probá de nuevo en un rato." />
        </div>
      </>
    )
  }

  if (!match) {
    notFound()
  }

  const isFinalized = match.status === "finalizado"

  const [playersResult, memberResult, summaryResult] = await Promise.all([
    supabase
      .from("match_players")
      .select("user_id, attendance, team, goals, assists, profiles(display_name, nickname)")
      .eq("match_id", mid),
    supabase
      .from("group_members")
      .select("role")
      .eq("group_id", gid)
      .eq("user_id", user.id)
      .maybeSingle(),
    isFinalized
      ? supabase.rpc("get_match_mvp_summary", { p_match_id: mid })
      : Promise.resolve(null),
  ])

  if (playersResult.error) {
    return (
      <>
        <AppHeader title={formatMatchDate(match.scheduled_at)} backHref={`/g/${gid}/partidos`} />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <ErrorState description="No pudimos cargar los jugadores. Probá de nuevo en un rato." />
        </div>
      </>
    )
  }

  const players = (playersResult.data ?? []).map((p) => ({
    userId: p.user_id,
    name: p.profiles?.nickname || p.profiles?.display_name || "Jugador",
    attendance: p.attendance,
    team: p.team,
    goals: p.goals,
    assists: p.assists,
  }))

  const confirmedCount = players.filter((p) => p.attendance === "confirmado").length
  const capacity = match.players_per_team * 2
  const me = players.find((p) => p.userId === user.id) ?? null
  const isOrganizer = match.created_by === user.id || memberResult.data?.role === "admin"
  const statusBadge = STATUS_BADGE[match.status]

  const summary = summaryResult?.data?.[0] ?? null
  const myVote = summary?.my_vote ?? null
  const candidates = players
    .filter((p) => p.team !== null && p.attendance === "confirmado" && p.userId !== user.id)
    .map((p) => ({ userId: p.userId, name: p.name }))
  const iPlayed = me !== null && me.team !== null && me.attendance === "confirmado"
  const canVote = summary !== null && iPlayed && myVote === null && !summary.closed
  const mvpNames = summary
    ? players.filter((p) => summary.mvp_ids.includes(p.userId)).map((p) => p.name)
    : []

  return (
    <>
      <AppHeader title={formatMatchDate(match.scheduled_at)} backHref={`/g/${gid}/partidos`} />
      <div className="mx-auto flex w-full max-w-screen-sm flex-col gap-6 px-4 py-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-body text-muted-foreground">
            <MapPin className="size-5 shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-small tabular text-muted-foreground">
              {confirmedCount}/{capacity} confirmados
            </p>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </section>

        {match.status === "programado" && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="label-caps text-muted-foreground">¿Venís?</h2>
              <AttendanceToggle
                matchId={mid}
                groupId={gid}
                myStatus={me?.attendance ?? null}
              />
            </section>

            <section>
              <TeamLists players={players} status={match.status} />
            </section>

            {isOrganizer && (
              <section className="flex flex-col gap-3">
                <h2 className="label-caps text-muted-foreground">Organizador</h2>
                <MatchActions matchId={mid} groupId={gid} />
              </section>
            )}
          </>
        )}

        {match.status === "finalizado" && (
          <>
            <section>
              <TeamLists
                players={players}
                status={match.status}
                scoreA={match.score_a ?? undefined}
                scoreB={match.score_b ?? undefined}
              />
            </section>

            <section>
              {summary ? (
                <MvpVote
                  matchId={mid}
                  groupId={gid}
                  candidates={candidates}
                  canVote={canVote}
                  myVote={myVote}
                  eligible={summary.eligible}
                  votesCast={summary.votes_cast}
                  closed={summary.closed}
                  mvpNames={mvpNames}
                />
              ) : (
                <p className="text-small text-muted-foreground">
                  No pudimos cargar la votación del MVP.
                </p>
              )}
            </section>
          </>
        )}

        {match.status === "cancelado" && (
          <p className="text-body text-muted-foreground">Este partido se canceló.</p>
        )}
      </div>
    </>
  )
}
