export const POSITIONS = [
  "POR",
  "LI",
  "DFC",
  "LD",
  "CAI",
  "CAD",
  "MCD",
  "MC",
  "MCO",
  "MI",
  "MD",
  "EI",
  "ED",
  "SD",
  "DC",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  POR: "Arquero",
  LI: "Lateral izquierdo",
  DFC: "Defensor central",
  LD: "Lateral derecho",
  CAI: "Carrilero izquierdo",
  CAD: "Carrilero derecho",
  MCD: "Volante central defensivo",
  MC: "Mediocampista central",
  MCO: "Enganche",
  MI: "Volante izquierdo",
  MD: "Volante derecho",
  EI: "Extremo izquierdo",
  ED: "Extremo derecho",
  SD: "Segundo delantero",
  DC: "Centrodelantero",
};

export type PositionGroup = "arquero" | "defensa" | "medio" | "ataque";

export function positionGroup(p: Position): PositionGroup {
  switch (p) {
    case "POR":
      return "arquero";
    case "LI":
    case "DFC":
    case "LD":
    case "CAI":
    case "CAD":
      return "defensa";
    case "MCD":
    case "MC":
    case "MCO":
    case "MI":
    case "MD":
      return "medio";
    case "EI":
    case "ED":
    case "SD":
    case "DC":
      return "ataque";
  }
}

export type RatingKind = "campo" | "arquero";

export function ratingKind(p: Position): RatingKind {
  return p === "POR" ? "arquero" : "campo";
}

export const STAT_LABELS = {
  campo: ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"],
  arquero: ["DIV", "HAN", "KIC", "REF", "POS", "SPD"],
} as const;

export function isPosition(value: string): value is Position {
  return POSITIONS.includes(value as Position);
}
