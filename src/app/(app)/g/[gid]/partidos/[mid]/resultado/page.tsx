import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { ResultForm } from "@/components/matches/result-form"

interface PageProps {
  params: Promise<{
    gid: string
    mid: string
  }>
}

export async function generateMetadata() {
  return {
    title: "Cargar resultado · Picado",
  }
}

export default async function ResultPage({ params }: PageProps) {
  const { gid, mid } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/partidos/${mid}/resultado`)
  }

  // Get match data
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, group_id, status, created_by")
    .eq("id", mid)
    .eq("group_id", gid)
    .single()

  if (matchError || !match) {
    notFound()
  }

  // Check if user is group admin or match creator
  const { data: adminData } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .single()

  const isAdmin = adminData?.role === "admin"
  const isOrganizer = match.created_by === user.id

  if (!isAdmin && !isOrganizer) {
    redirect(`/g/${gid}/partidos/${mid}`)
  }

  // Check if match is in programado status
  if (match.status !== "programado") {
    redirect(`/g/${gid}/partidos/${mid}`)
  }

  // Get players with team assignments
  const { data: players, error: playersError } = await supabase
    .from("match_players")
    .select(
      `user_id, team,
       profiles(display_name, nickname)`
    )
    .eq("match_id", mid)
    .not("team", "is", null)
    .eq("attendance", "confirmado")

  if (playersError || !players) {
    notFound()
  }

  // Map players to form format
  const formattedPlayers = players.map((p) => {
    const profile = p.profiles as { display_name: string; nickname: string | null } | null
    return {
      userId: p.user_id,
      name: profile?.nickname || profile?.display_name || "Jugador",
      team: p.team as "A" | "B",
    }
  })

  // Check if any team is empty
  const teamA = formattedPlayers.filter((p) => p.team === "A")
  const teamB = formattedPlayers.filter((p) => p.team === "B")

  if (teamA.length === 0 || teamB.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-nav">
        <AppHeader
          title="Cargar resultado"
          backHref={`/g/${gid}/partidos/${mid}`}
        />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <div className="text-center space-y-4">
            <p className="text-body text-foreground">Primero armá los equipos.</p>
            <a
              href={`/g/${gid}/partidos/${mid}/equipos`}
              className="text-primary hover:underline"
            >
              Ir a armar equipos
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      <AppHeader
        title="Cargar resultado"
        backHref={`/g/${gid}/partidos/${mid}`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
        <ResultForm
          matchId={mid}
          groupId={gid}
          players={formattedPlayers}
        />
      </div>
    </div>
  )
}
