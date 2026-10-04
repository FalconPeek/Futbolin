import { cn } from "@/lib/utils";
import type { FormBadgeProps } from "./types";

const FORM_LABEL = { G: "Ganado", E: "Empatado", P: "Perdido" };

export function FormBadge({ result }: FormBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "w-[22px] h-[22px]",
        "rounded-sm",
        "font-display text-[13px] font-bold leading-none",
        "border border-transparent",
        result === "G" && "bg-primary text-primary-foreground",
        result === "E" && "bg-muted text-muted-foreground border-border",
        result === "P" && "bg-transparent text-destructive border-destructive"
      )}
      title={FORM_LABEL[result]}
      aria-label={FORM_LABEL[result]}
    >
      {result}
    </span>
  );
}
