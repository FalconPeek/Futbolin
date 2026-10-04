import type * as React from "react";

/** Botón. Un solo `primary` por pantalla. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /** sm 36px · md 44px (tap-min) · lg 52px. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Ocupa todo el ancho (acciones al pie de pantallas mobile). */
  block?: boolean;
  children: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.ReactElement;

/** Campo de texto con etiqueta, ayuda y error. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Texto de ayuda debajo del campo. */
  hint?: string;
  /** Mensaje de error; reemplaza a `hint` y marca el campo como inválido. */
  error?: string;
}
export declare function Input(props: InputProps): React.ReactElement;

/** Etiqueta corta de estado. */
export interface BadgeProps {
  /** @default "neutral" */
  variant?: "neutral" | "primary" | "gold" | "info" | "destructive";
  children: React.ReactNode;
  className?: string;
}
export declare function Badge(props: BadgeProps): React.ReactElement;

/** Contenedor de superficie con encabezado opcional. */
export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Elemento a la derecha del título (un Button ghost, un Badge). */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}
export declare function Card(props: CardProps): React.ReactElement;

/** Resultado de un partido en la racha: G ganado, E empatado, P perdido. */
export interface FormBadgeProps {
  result: "G" | "E" | "P";
}
export declare function FormBadge(props: FormBadgeProps): React.ReactElement;

export type FieldStat = "RIT" | "TIR" | "PAS" | "REG" | "DEF" | "FIS";
export type KeeperStat = "DIV" | "HAN" | "KIC" | "REF" | "POS" | "SPD";
export type CardTier = "bronze" | "silver" | "gold" | "special" | "provisional";

/** Carta de jugador estilo FC 26. */
export interface PlayerCardProps {
  name: string;
  /** Posición principal: POR, LI, DFC, LD, CAI, CAD, MCD, MC, MCO, MI, MD, EI, ED, SD, DC. */
  position: string;
  /** OVR de la posición principal (1–99). */
  ovr: number;
  /** Stats de cara. Campo: RIT TIR PAS REG DEF FIS. Arquero: DIV HAN KIC REF POS SPD. */
  stats: Partial<Record<FieldStat | KeeperStat, number>>;
  /** Usa las etiquetas de arquero. */
  goalkeeper?: boolean;
  /** Fuerza el nivel; si no, se calcula: provisional > special (≥85 o mvp) > gold (≥75) > silver (≥65) > bronze. */
  tier?: CardTier;
  /** Menos de 3 raters distintos: carta gris y OVR oculto. */
  provisional?: boolean;
  /** MVP del último partido: carta especial. */
  mvp?: boolean;
  /** Máximo 3 se muestran. `{label, plus: true}` para PlayStyle+. */
  playStyles?: Array<string | { label: string; plus?: boolean }>;
  /** Foto recortada cuadrada; sin foto se muestran iniciales. */
  photoUrl?: string;
  /** md 200px · sm 148px (listas, cancha). @default "md" */
  size?: "md" | "sm";
  className?: string;
}
export declare function PlayerCard(props: PlayerCardProps): React.ReactElement;

export interface StandingsRow {
  id?: string;
  /** Posición; por defecto el índice + 1. */
  pos?: number;
  /** Equipo, club o jugador. */
  name: string;
  /** Color primario del club (punto junto al nombre). */
  color?: string;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number;
  pts: number;
  /** Desempate de suizo. */
  buchholz?: number;
  /** Últimos resultados, el más reciente al final; se muestran 5. */
  form?: Array<"G" | "E" | "P">;
}

/** Tabla de posiciones de liga, grupo o suizo. */
export interface StandingsTableProps {
  rows: StandingsRow[];
  /** Cuántos clasifican: marca las posiciones y dibuja la línea de corte. */
  qualify?: number;
  /** Por defecto: visible si alguna fila trae `buchholz`. */
  showBuchholz?: boolean;
  /** Encabezado de la columna de nombre. @default "Equipo" */
  teamLabel?: string;
  caption?: string;
  className?: string;
}
export declare function StandingsTable(props: StandingsTableProps): React.ReactElement;
