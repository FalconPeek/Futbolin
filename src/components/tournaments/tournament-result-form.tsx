"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { reportTournamentResult } from "@/actions/tournaments";
import { tournamentResultSchema } from "@/lib/validators/tournaments";
import { Button } from "@/components/ui/button";

interface TeamInfo {
  name: string;
  color: string;
}

interface TournamentResultFormProps {
  matchId: string;
  tournamentId: string;
  groupId: string;
  format: "liga" | "eliminacion";
  home: TeamInfo;
  away: TeamInfo;
  initial: {
    home_score: number;
    away_score: number;
    home_pens: number | null;
    away_pens: number | null;
  } | null;
}

export function TournamentResultForm({
  matchId,
  tournamentId,
  groupId,
  format,
  home,
  away,
  initial,
}: TournamentResultFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState(initial?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(initial?.away_score ?? 0);
  const [homePens, setHomePens] = useState(
    (initial !== null && initial !== undefined ? initial.home_pens : null) as number | null
  );
  const [awayPens, setAwayPens] = useState(
    (initial !== null && initial !== undefined ? initial.away_pens : null) as number | null
  );

  // Show penalties only in eliminacion with a tie (including 0-0)
  const isTie = homeScore === awayScore;
  const showPenalties = format === "eliminacion" && isTie;

  const handleSubmit = () => {
    setError(null);

    // Validate with schema
    const validated = tournamentResultSchema.safeParse({
      format,
      home_score: homeScore,
      away_score: awayScore,
      home_pens: showPenalties ? homePens : null,
      away_pens: showPenalties ? awayPens : null,
    });

    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
      return;
    }

    startTransition(async () => {
      const result = await reportTournamentResult({
        matchId,
        tournamentId,
        groupId,
        format,
        home_score: validated.data.home_score,
        away_score: validated.data.away_score,
        home_pens: validated.data.home_pens as number | null,
        away_pens: validated.data.away_pens as number | null,
      });

      if (result.ok) {
        toast.success("Guardamos el resultado.");
        router.push(`/g/${groupId}/torneos/${tournamentId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Score inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Home team */}
        <div className="space-y-3">
          <div
            className="h-12 rounded-md flex items-center px-3"
            style={{ backgroundColor: home.color }}
          />
          <label className="block label-caps text-foreground">{home.name}</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="99"
            value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)))}
            className="w-full h-tap rounded-md border border-input bg-background px-3 py-2 text-center font-display text-score text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Goles de ${home.name}`}
          />
        </div>

        {/* Away team */}
        <div className="space-y-3">
          <div
            className="h-12 rounded-md flex items-center px-3"
            style={{ backgroundColor: away.color }}
          />
          <label className="block label-caps text-foreground">{away.name}</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="99"
            value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)))}
            className="w-full h-tap rounded-md border border-input bg-background px-3 py-2 text-center font-display text-score text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Goles de ${away.name}`}
          />
        </div>
      </div>

      {/* Penalties row (only show in eliminacion with tie) */}
      {showPenalties && (
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-small text-muted-foreground">
            En eliminación directa se define por penales.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block label-caps text-foreground">Penales</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                value={homePens ?? ""}
                onChange={(e) =>
                  setHomePens(e.target.value ? Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)) : null)
                }
                className="w-full h-tap rounded-md border border-input bg-background px-3 py-2 text-center font-display text-score text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Penales de ${home.name}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block label-caps text-foreground">Penales</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                value={awayPens ?? ""}
                onChange={(e) =>
                  setAwayPens(e.target.value ? Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)) : null)
                }
                className="w-full h-tap rounded-md border border-input bg-background px-3 py-2 text-center font-display text-score text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Penales de ${away.name}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      )}

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        variant="primary"
        size="lg"
        block
      >
        {isPending ? "Guardando…" : "Guardar resultado"}
      </Button>
    </div>
  );
}
