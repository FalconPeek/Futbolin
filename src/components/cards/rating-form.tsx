"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { rateTeammate } from "@/actions/ratings";
import { STAT_LABELS, type RatingKind } from "@/lib/cards/positions";
import { Button } from "@/components/ui/button";

interface RatingFormProps {
  groupId: string;
  ratedId: string;
  kind: RatingKind;
  initial: number[] | null;
}

const STAT_FULL_NAMES: Record<RatingKind, string[]> = {
  campo: ["Ritmo", "Tiro", "Pase", "Regate", "Defensa", "Físico"],
  arquero: ["Estirada", "Manos", "Saque", "Reflejos", "Colocación", "Velocidad"],
};

export function RatingForm({
  groupId,
  ratedId,
  kind,
  initial,
}: RatingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize stats with initial values or 60
  const [stats, setStats] = useState<number[]>(
    initial || [60, 60, 60, 60, 60, 60]
  );

  const statLabels = STAT_LABELS[kind];
  const fullNames = STAT_FULL_NAMES[kind];

  const handleStatChange = (index: number, value: number) => {
    const newStats = [...stats];
    newStats[index] = value;
    setStats(newStats);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await rateTeammate({
        groupId,
        ratedId,
        kind,
        stats,
      });

      if (result.ok) {
        toast.success("Guardamos tu calificación.");
        router.push(`/g/${groupId}/cartas/${ratedId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6 flex flex-col">
      {/* Anonymous vote notice */}
      <p className="text-small text-muted-foreground">
        Tu voto es anónimo: nadie ve qué pusiste, solo el promedio cuando votan 3
        o más.
      </p>

      {/* Stats sliders */}
      <div className="space-y-6 flex-1">
        {statLabels.map((label, index) => (
          <div key={index} className="flex flex-col gap-3">
            <label className="label-caps text-foreground">
              {label} {fullNames[index]}
            </label>
            <input
              type="range"
              min="1"
              max="99"
              value={stats[index]}
              onChange={(e) => handleStatChange(index, parseInt(e.target.value, 10))}
              aria-label={fullNames[index]}
              className="w-full accent-primary"
              style={{ minHeight: "var(--spacing-tap)" }}
            />
            <div className="text-stat font-display text-foreground tabular">
              {stats[index]}
            </div>
          </div>
        ))}
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        variant="primary"
        size="lg"
        block
        className="mt-6"
      >
        {isPending ? "Guardando…" : "Guardar calificación"}
      </Button>
    </div>
  );
}
