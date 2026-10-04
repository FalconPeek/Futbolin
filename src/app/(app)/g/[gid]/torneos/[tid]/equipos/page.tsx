import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { TeamEditor } from "@/components/tournaments/team-editor";

interface EquiposPageProps {
  params: Promise<{ gid: string; tid: string }>;
}

export const metadata: Metadata = {
  title: "Equipos · Picado",
};

export default async function EquiposPage({ params }: EquiposPageProps) {
  const { gid, tid } = await params;

  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/torneos/${tid}/equipos`);
  }

  // Fetch tournament details
  const { data: tournament, error: tourError } = await supabase
    .from("tournaments")
    .select("id, name, format, status, created_by, group_id, legs")
    .eq("id", tid)
    .eq("group_id", gid)
    .maybeSingle();

  if (tourError || !tournament) {
    notFound();
  }

  // Only allow draft tournaments
  if (tournament.status !== "borrador") {
    redirect(`/g/${gid}/torneos/${tid}`);
  }

  // Check if user is organizer
  const { data: groupMember } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = groupMember?.role === "admin";
  const isOrganizer = tournament.created_by === user.id || isAdmin;

  // Fetch tournament teams
  const { data: teamsData = [] } = await supabase
    .from("tournament_teams")
    .select("id, name, color")
    .eq("tournament_id", tid)
    .order("created_at");

  const teams = teamsData ?? [];

  return (
    <>
      <AppHeader
        title={tournament.name}
        backHref={`/g/${gid}/torneos`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6 pb-nav space-y-6">
        {isOrganizer ? (
          <TeamEditor
            tournamentId={tid}
            groupId={gid}
            format={tournament.format as "liga" | "eliminacion"}
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            }))}
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-title font-semibold">Equipos ({teams.length})</h2>
            {teams.length === 0 ? (
              <p className="text-body text-muted-foreground">
                El organizador está cargando los equipos.
              </p>
            ) : (
              <ul className="space-y-2">
                {teams.map((team) => (
                  <li key={team.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <div
                      className="flex-shrink-0 w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="text-body">{team.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
