import { type Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import {
  tournamentChampion,
  type TournamentTeam,
  type TournamentMatch,
} from "@/lib/standings/teams";

interface TorneosPageProps {
  params: Promise<{ gid: string }>;
}

export const metadata: Metadata = {
  title: "Torneos · Picado",
};

export default async function TorneosPage({ params }: TorneosPageProps) {
  const { gid } = await params;

  const supabase = await createClient();

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      format,
      status,
      created_at,
      tournament_teams (
        id,
        name,
        color
      ),
      tournament_matches (
        id,
        round,
        slot,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_pens,
        away_pens,
        status
      )
    `
    )
    .eq("group_id", gid)
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  const tournamentsWithChampion = (tournaments || []).map((tournament) => {
    const teams = (tournament.tournament_teams || []) as TournamentTeam[];
    const matches = (tournament.tournament_matches || []) as TournamentMatch[];

    let championName: string | null = null;
    if (tournament.status === "finalizado") {
      const championId = tournamentChampion(tournament.format, teams, matches);
      if (championId) {
        const championTeam = teams.find((t) => t.id === championId);
        championName = championTeam?.name || null;
      }
    }

    return {
      id: tournament.id,
      groupId: gid,
      name: tournament.name,
      format: tournament.format as "liga" | "eliminacion",
      teamCount: teams.length,
      status: tournament.status as "borrador" | "en_curso" | "finalizado",
      championName,
    };
  });

  const ongoingTournaments = tournamentsWithChampion.filter(
    (t) => t.status === "borrador" || t.status === "en_curso"
  );
  const finishedTournaments = tournamentsWithChampion.filter(
    (t) => t.status === "finalizado"
  );

  const hasAnyTournaments =
    ongoingTournaments.length > 0 || finishedTournaments.length > 0;

  return (
    <>
      <AppHeader
        title="Torneos"
        right={
          <Link
            href={`/g/${gid}/torneos/nuevo`}
            className="flex items-center justify-center w-tap h-tap text-foreground hover:text-primary rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Crear torneo"
          >
            <Plus className="size-5" />
          </Link>
        }
      />

      {!hasAnyTournaments ? (
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <EmptyState
            title="Todavía no hay torneos"
            description="Armá una liga o una copa con eliminación directa."
            action={
              <Button asChild size="lg" block>
                <Link href={`/g/${gid}/torneos/nuevo`}>Crear torneo</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6 space-y-6">
          {ongoingTournaments.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-small font-semibold uppercase tracking-widest text-muted-foreground">
                En curso
              </h2>
              <div className="space-y-2">
                {ongoingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </section>
          )}

          {finishedTournaments.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-small font-semibold uppercase tracking-widest text-muted-foreground">
                Terminados
              </h2>
              <div className="space-y-2">
                {finishedTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </section>
          )}

          <Button asChild size="lg" block>
            <Link href={`/g/${gid}/torneos/nuevo`}>Crear torneo</Link>
          </Button>
        </div>
      )}
    </>
  );
}
