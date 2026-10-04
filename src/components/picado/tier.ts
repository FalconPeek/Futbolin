import type { CardTier } from "./types";

export function tierFor(p: {
  ovr: number;
  provisional?: boolean;
  mvp?: boolean;
  tier?: CardTier;
}): CardTier {
  if (p.tier) return p.tier;
  if (p.provisional) return "provisional";
  if (p.mvp || p.ovr >= 85) return "special";
  if (p.ovr >= 75) return "gold";
  if (p.ovr >= 65) return "silver";
  return "bronze";
}

export const TIER_LABEL: Record<CardTier, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
  special: "Especial",
  provisional: "Provisional",
};
