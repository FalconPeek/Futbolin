import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TournamentCardProps {
  tournament: {
    id: string;
    groupId: string;
    name: string;
    format: "liga" | "eliminacion";
    teamCount: number;
    status: "borrador" | "en_curso" | "finalizado";
    championName: string | null;
  };
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const formatLabel = tournament.format === "liga" ? "Liga" : "Eliminación directa";
  const teamLabel = tournament.teamCount === 1 ? "equipo" : "equipos";

  const statusBadgeVariant =
    tournament.status === "en_curso" ? "primary" : "neutral";
  const statusLabel =
    tournament.status === "borrador"
      ? "Borrador"
      : tournament.status === "en_curso"
        ? "En curso"
        : "Finalizado";

  const href =
    tournament.status === "borrador"
      ? `/g/${tournament.groupId}/torneos/${tournament.id}/equipos`
      : `/g/${tournament.groupId}/torneos/${tournament.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "block p-4 rounded-lg bg-card border border-border",
        "hover:bg-accent transition-colors",
        "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-title font-semibold flex-1 truncate">
            {tournament.name}
          </h3>
          <Badge variant={statusBadgeVariant} className="flex-shrink-0">
            {statusLabel}
          </Badge>
        </div>

        <p className="text-small text-muted-foreground font-display tabular">
          {formatLabel} · {tournament.teamCount} {teamLabel}
        </p>

        {tournament.championName && (
          <Badge variant="gold" className="w-fit gap-1 flex items-center">
            <Trophy className="size-4" />
            Campeón: {tournament.championName}
          </Badge>
        )}
      </div>
    </Link>
  );
}
