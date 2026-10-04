/**
 * Generates a human-readable label for a tournament round.
 *
 * For league ("liga"): "Fecha N"
 * For elimination ("eliminacion"): counts from the last round backwards:
 *   - Last round: "Final"
 *   - Second to last: "Semifinal"
 *   - Third to last: "Cuartos de final"
 *   - Fourth to last: "Octavos de final"
 *   - Earlier rounds: "Ronda N"
 */
export function roundLabel(
  format: "liga" | "eliminacion",
  round: number,
  totalRounds: number
): string {
  if (format === "liga") {
    return `Fecha ${round}`;
  }

  // For elimination, count from the end
  const roundsFromEnd = totalRounds - round + 1;

  switch (roundsFromEnd) {
    case 1:
      return "Final";
    case 2:
      return "Semifinal";
    case 3:
      return "Cuartos de final";
    case 4:
      return "Octavos de final";
    default:
      return `Ronda ${round}`;
  }
}
