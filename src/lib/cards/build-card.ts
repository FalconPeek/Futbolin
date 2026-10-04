import { computeOvr } from "./ovr";
import { STAT_LABELS, type Position } from "./positions";
import type { PlayerCardProps, FieldStat, KeeperStat } from "@/components/picado/types";

export const MIN_RATERS = 3;

export type CardRow = {
  user_id: string;
  display_name: string;
  nickname: string | null;
  position: Position;
  kind: "campo" | "arquero";
  raters: number;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  s4: number | null;
  s5: number | null;
  s6: number | null;
};

export interface BuiltCard extends PlayerCardProps {
  userId: string;
  raters: number;
}

export function buildCard(
  row: CardRow,
  opts?: { mvp?: boolean }
): BuiltCard {
  const name = row.nickname || row.display_name;
  const position = row.position;
  const goalkeeper = row.kind === "arquero";
  const provisional = row.raters < MIN_RATERS || [row.s1, row.s2, row.s3, row.s4, row.s5, row.s6].some(s => s === null);

  const stats: Partial<Record<FieldStat | KeeperStat, number>> = {};
  let ovr = 0;

  if (!provisional) {
    const statValues = [row.s1, row.s2, row.s3, row.s4, row.s5, row.s6] as number[];
    const labels = STAT_LABELS[row.kind];

    labels.forEach((label, i) => {
      stats[label] = statValues[i];
    });

    ovr = computeOvr(position, statValues);
  }

  return {
    name,
    position,
    ovr,
    stats,
    goalkeeper,
    provisional,
    mvp: opts?.mvp ?? false,
    userId: row.user_id,
    raters: row.raters,
  };
}

export function sortCards(cards: BuiltCard[]): BuiltCard[] {
  return [...cards].sort((a, b) => {
    // Non-provisional cards by OVR descending
    if (!a.provisional && !b.provisional) {
      if (b.ovr !== a.ovr) {
        return b.ovr - a.ovr;
      }
      // Same OVR: sort by name ascending (es-AR)
      return a.name.localeCompare(b.name, "es-AR");
    }

    // Non-provisional before provisional
    if (!a.provisional && b.provisional) return -1;
    if (a.provisional && !b.provisional) return 1;

    // Both provisional: sort by name ascending (es-AR)
    return a.name.localeCompare(b.name, "es-AR");
  });
}
