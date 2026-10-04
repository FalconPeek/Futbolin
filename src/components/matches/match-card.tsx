import Link from "next/link"
import { MapPin } from "lucide-react"
import { formatMatchDate } from "@/lib/format/date"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: {
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
}

export function MatchCard({ match }: MatchCardProps) {
  const total = match.playersPerTeam * 2
  const statusBadgeVariant =
    match.status === "programado" ? "info" : match.status === "finalizado" ? "neutral" : "destructive"
  const statusLabel =
    match.status === "programado" ? "Programado" : match.status === "finalizado" ? "Finalizado" : "Cancelado"

  return (
    <Link
      href={`/g/${match.groupId}/partidos/${match.id}`}
      className={cn(
        "flex flex-col gap-3 p-4",
        "bg-card border border-border rounded-lg",
        "hover:bg-accent transition-colors",
        "active:brightness-95"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-body-strong">{formatMatchDate(match.scheduledAt)}</p>
          <div className="flex items-center gap-1 mt-1 text-small text-muted-foreground">
            <MapPin className="size-4 flex-shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>
        </div>
        {match.status === "finalizado" && match.scoreA !== null && match.scoreB !== null && (
          <div className="flex-shrink-0 text-right">
            <p className="font-display text-display tabular">
              {match.scoreA} – {match.scoreB}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-small tabular text-muted-foreground">
          {match.confirmed}/{total} confirmados
        </p>
        <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
      </div>
    </Link>
  )
}
