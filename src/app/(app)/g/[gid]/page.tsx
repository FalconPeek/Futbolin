import { type Metadata } from "next"
import Link from "next/link"
import { Users } from "lucide-react"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { GroupHome } from "@/components/groups/group-home"
import { formatMatchDate } from "@/lib/format/date"

interface GroupPageProps {
  params: Promise<{ gid: string }>
}

export const metadata: Metadata = {
  title: "Inicio · Picado",
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { gid } = await params

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get group details
  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", gid)
    .maybeSingle()

  if (!group) {
    notFound()
  }

  // Get next match (programado status, scheduled_at >= now, limit 1)
  const { data: nextMatchData } = await supabase
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
    .eq("status", "programado")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)

  let nextMatch = null
  if (nextMatchData && nextMatchData.length > 0) {
    const m = nextMatchData[0]
    const confirmed = (m.match_players as unknown as Array<{ attendance: string }>)?.filter(
      (mp) => mp.attendance === "confirmado"
    ).length ?? 0

    nextMatch = {
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
  }

  // Get pending MVP votes
  // 1. Get finalized matches from last 72 hours where user played
  const now = new Date()
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()
  const { data: finalized } = await supabase
    .from("matches")
    .select(
      `
      id,
      scheduled_at,
      finalized_at,
      match_players!inner(user_id, team, attendance)
    `
    )
    .eq("group_id", gid)
    .eq("status", "finalizado")
    .gte("finalized_at", seventyTwoHoursAgo)
    .filter("match_players.user_id", "eq", user.id)
    .filter("match_players.team", "not.is", null)
    .filter("match_players.attendance", "eq", "confirmado")

  const pendingVotes: Array<{ matchId: string; label: string }> = []

  if (finalized && finalized.length > 0) {
    for (const match of finalized) {
      // Check MVP voting status for this match
      const { data: mvpSummary, error: mvpError } = await supabase.rpc(
        "get_match_mvp_summary",
        { p_match_id: match.id }
      )

      if (!mvpError && mvpSummary && mvpSummary[0]) {
        const summary = mvpSummary[0]
        // Vote is pending if: voting isn't closed AND user hasn't voted yet
        if (!summary.closed && !summary.my_vote) {
          const label = formatMatchDate(match.scheduled_at)
          pendingVotes.push({
            matchId: match.id,
            label,
          })
        }
      }
    }
  }

  // Get unrated count (members in group except current user, minus already rated)
  // First, get all members of the group
  const { data: allMembers } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", gid)

  const memberCount = (allMembers?.length ?? 0) - 1 // Exclude self

  // Get already rated count
  const { count: ratedCount } = await supabase
    .from("player_ratings")
    .select("rated_id", { count: "exact" })
    .eq("group_id", gid)
    .eq("rater_id", user.id)

  const unratedCount = Math.max(0, memberCount - (ratedCount ?? 0))

  // Get tournaments en_curso for this group
  const { data: tournamentsData } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      format,
      status,
      tournament_teams(count)
    `
    )
    .eq("group_id", gid)
    .eq("status", "en_curso")

  const tournaments = (tournamentsData || []).map((t) => {
    const teamCount = (
      t.tournament_teams as unknown as Array<{ count?: number }>
    )?.length ?? 0

    return {
      id: t.id,
      groupId: gid,
      name: t.name,
      format: t.format as "liga" | "eliminacion",
      teamCount,
      status: t.status as "borrador" | "en_curso" | "finalizado",
      championName: null,
    }
  })

  return (
    <>
      <AppHeader
        title={group.name}
        right={
          <Link href={`/g/${gid}/miembros`} aria-label="Miembros">
            <Button variant="ghost" size="icon">
              <Users className="size-5" />
            </Button>
          </Link>
        }
      />
      <GroupHome
        groupId={gid}
        nextMatch={nextMatch}
        pendingVotes={pendingVotes}
        unratedCount={unratedCount}
        tournaments={tournaments}
      />
    </>
  )
}
