import { ListOrdered } from "lucide-react";
import { StandingsTable } from "@/components/picado/standings-table";
import { EmptyState } from "@/components/layout/empty-state";
import { TopList } from "./top-list";
import type { PlayerStandingsRow } from "@/lib/standings/players";

interface RankingViewProps {
  rows: PlayerStandingsRow[];
}

export function RankingView({ rows }: RankingViewProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="Todavía no hay partidos jugados"
        description="Cuando cierren el primer partido vas a ver la tabla acá."
      />
    );
  }

  // Prepare top scorers: sorted by goals desc, then by name asc
  const topScorers = [...rows]
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name, "es-AR");
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      value: r.goals,
    }));

  // Prepare top assists: sorted by assists desc, then by name asc
  const topAssists = [...rows]
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.name.localeCompare(b.name, "es-AR");
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      value: r.assists,
    }));

  // Prepare top MVPs: sorted by mvps desc, then by name asc
  const topMVPs = [...rows]
    .sort((a, b) => {
      if (b.mvps !== a.mvps) return b.mvps - a.mvps;
      return a.name.localeCompare(b.name, "es-AR");
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      value: r.mvps,
    }));

  return (
    <div className="space-y-4">
      <StandingsTable rows={rows} teamLabel="Jugador" />
      <TopList title="Goleadores" rows={topScorers} unit="goles" />
      <TopList title="Asistidores" rows={topAssists} unit="asistencias" />
      <TopList title="MVP" rows={topMVPs} unit="premios" />
    </div>
  );
}
