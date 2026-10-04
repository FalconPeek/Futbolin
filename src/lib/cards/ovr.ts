import { Position, positionGroup } from "./positions";

export const OVR_WEIGHTS: Record<
  "arquero" | "defensa" | "medio" | "ataque",
  readonly [number, number, number, number, number, number]
> = {
  arquero: [0.22, 0.22, 0.1, 0.22, 0.2, 0.04],
  defensa: [0.15, 0.03, 0.12, 0.1, 0.4, 0.2],
  medio: [0.12, 0.14, 0.3, 0.24, 0.1, 0.1],
  ataque: [0.22, 0.32, 0.1, 0.22, 0.02, 0.12],
};

export function computeOvr(
  position: Position,
  stats: readonly number[]
): number {
  if (stats.length !== 6) {
    throw new Error("Stats must have exactly 6 values");
  }

  const group = positionGroup(position);
  const weights = OVR_WEIGHTS[group];

  const weighted = weights.reduce((sum, weight, index) => {
    return sum + weight * (stats[index] ?? 0);
  }, 0);

  const rounded = Math.round(weighted);

  return Math.max(1, Math.min(99, rounded));
}
