import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { TournamentView } from "@/components/tournaments/tournament-view";

export const metadata = {
  title: "Torneo · Picado",
};

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ gid: string; tid: string }>;
}) {
  const { gid, tid } = await params;
  const client = await createClient();

  // Obtener el torneo
  const { data: tournament, error: tournamentError } = await client
    .from("tournaments")
    .select("id, name, format, legs, status, created_by, group_id")
    .eq("id", tid)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // Si está en borrador, redirigir a cargar equipos
  if (tournament.status === "borrador") {
    redirect(`/g/${gid}/torneos/${tid}/equipos`);
  }

  // Obtener la sesión para verificar permisos
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/torneos/${tid}`);
  }

  // Verificar que el usuario es miembro del grupo
  const { data: membership } = await client
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Verificar si es organizador del torneo
  const { data: groupAdmins } = await client
    .from("group_members")
    .select("user_id")
    .eq("group_id", gid)
    .eq("role", "admin");

  const isOrganizer =
    tournament.created_by === user.id ||
    (groupAdmins?.some((admin) => admin.user_id === user.id) ?? false);

  // Obtener equipos del torneo
  const { data: teams = [] } = await client
    .from("tournament_teams")
    .select("id, name, color")
    .eq("tournament_id", tid)
    .order("created_at");

  // Obtener partidos del torneo
  const { data: matches = [] } = await client
    .from("tournament_matches")
    .select(
      "id, round, slot, home_team_id, away_team_id, home_score, away_score, home_pens, away_pens, status"
    )
    .eq("tournament_id", tid)
    .order("round")
    .order("slot");

  // Describir el torneo (formato + cantidad de equipos)
  const formatLabel =
    tournament.format === "liga" ? "Liga" : "Eliminación directa";
  const teamCount = teams ? teams.length : 0;
  const description = `${formatLabel} · ${teamCount} equipo${teamCount !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title={tournament.name} backHref={`/g/${gid}/torneos`} />

      <div className="flex-1 overflow-auto pb-nav">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4 space-y-4">
          {/* Descripción del torneo */}
          <p className="text-small text-muted-foreground">{description}</p>

          {/* Contenido */}
          <TournamentView
            format={tournament.format as "liga" | "eliminacion"}
            status={tournament.status as "borrador" | "en_curso" | "finalizado"}
            teams={teams || []}
            matches={matches || []}
            isOrganizer={isOrganizer}
            groupId={gid}
            tournamentId={tid}
          />
        </div>
      </div>
    </div>
  );
}
