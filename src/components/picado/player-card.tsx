import { cn } from "@/lib/utils";
import type { PlayerCardProps, FieldStat, KeeperStat } from "./types";
import { tierFor, TIER_LABEL } from "./tier";

const FIELD_STATS: FieldStat[] = ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"];
const GOALKEEPER_STATS: KeeperStat[] = ["DIV", "HAN", "KIC", "REF", "POS", "SPD"];

function initials(name: string): string {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function PlayerCard(props: PlayerCardProps) {
  const tier = tierFor(props);
  const labels = props.goalkeeper ? GOALKEEPER_STATS : FIELD_STATS;
  const stats = props.stats || {};
  const styles = (props.playStyles || []).slice(0, 3);
  const size = props.size || "md";
  const isSmall = size === "sm";

  const tierBgColor =
    tier === "bronze"
      ? "bg-tier-bronze"
      : tier === "silver"
        ? "bg-tier-silver"
        : tier === "gold"
          ? "bg-tier-gold"
          : tier === "special"
            ? "bg-tier-special"
            : "bg-tier-provisional";

  const tierTextColor =
    tier === "bronze"
      ? "text-tier-bronze-ink"
      : tier === "silver"
        ? "text-tier-silver-ink"
        : tier === "gold"
          ? "text-tier-gold-ink"
          : tier === "special"
            ? "text-tier-special-ink"
            : "text-tier-provisional-ink";

  const tierVars = {
    "--pc-fill": `var(--color-tier-${tier})`,
    "--pc-ink": `var(--color-tier-${tier}-ink)`,
  } as React.CSSProperties;

  const borderStyle =
    tier === "special"
      ? {
          boxShadow:
            "inset 0 0 0 2px var(--tier-special-edge), var(--shadow-card)",
        }
      : {};

  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 rounded-card shadow-card",
        isSmall ? "w-[148px] gap-1 p-3" : "w-[200px] p-4 pb-3",
        tierBgColor,
        tierTextColor,
        props.className
      )}
      style={{ ...tierVars, ...borderStyle }}
      aria-label={`${props.name}, ${props.position}, OVR ${props.provisional ? "oculto" : props.ovr}, nivel ${TIER_LABEL[tier]}`}
    >
      {/* Top: Rating and Photo */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span
            className={cn(
              "font-display font-bold tabular",
              isSmall ? "text-[32px] leading-[30px]" : "text-ovr"
            )}
          >
            {props.provisional ? "–" : props.ovr}
          </span>
          <span
            className={cn(
              "font-display font-semibold uppercase tabular",
              isSmall ? "text-[12px] leading-[18px]" : "label-caps"
            )}
          >
            {props.position}
          </span>
        </div>

        {props.photoUrl ? (
          <img
            className={cn(
              "object-cover rounded-full",
              isSmall ? "w-[52px] h-[52px]" : "w-[76px] h-[76px]"
            )}
            src={props.photoUrl}
            alt={props.name}
          />
        ) : (
          <span
            className={cn(
              "flex items-center justify-center border-2 rounded-full font-display font-bold",
              isSmall
                ? "w-[52px] h-[52px] text-[20px]"
                : "w-[76px] h-[76px] text-[28px]"
            )}
            style={{ borderColor: "currentColor" }}
            aria-hidden="true"
          >
            {initials(props.name)}
          </span>
        )}
      </div>

      {/* Name */}
      <h3
        className={cn(
          "m-0 border-b font-display font-bold uppercase text-center text-center truncate",
          isSmall
            ? "pb-0 text-[17px] leading-[20px]"
            : "pb-2 text-[22px] leading-[24px]",
          tierTextColor
        )}
        style={{ borderColor: "currentColor" }}
      >
        {props.name}
      </h3>

      {/* Stats */}
      <dl
        className={cn(
          "m-0 grid font-variant-numeric",
          isSmall
            ? "grid-cols-2 gap-1 gap-x-4"
            : "grid-cols-2 gap-1 gap-x-4"
        )}
      >
        {labels.map((label) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt
              className={cn(
                "font-display font-semibold uppercase",
                isSmall
                  ? "text-[12px] leading-[18px]"
                  : "text-[14px] leading-[20px]"
              )}
            >
              {label}
            </dt>
            <dd
              className={cn(
                "m-0 min-w-[24px] text-right font-display font-bold tabular",
                isSmall
                  ? "text-[16px] leading-[18px]"
                  : "text-stat"
              )}
            >
              {stats[label as FieldStat | KeeperStat] != null
                ? stats[label as FieldStat | KeeperStat]
                : "–"}
            </dd>
          </div>
        ))}
      </dl>

      {/* PlayStyles */}
      {!isSmall && styles.length > 0 && (
        <ul className="m-0 mt-1 list-none p-0 flex flex-wrap gap-1 justify-center">
          {styles.map((style) => {
            const isPlus = typeof style === "object" && style.plus;
            const label = typeof style === "object" ? style.label : style;
            return (
              <li
                key={label}
                className={cn(
                  "px-2 py-0.5 border border-current rounded-full text-[11px] leading-[14px] font-semibold"
                )}
                style={
                  isPlus
                    ? {
                        background: "var(--pc-ink)",
                        color: "var(--pc-fill)",
                      }
                    : {}
                }
              >
                {label}
                {isPlus ? "+" : ""}
              </li>
            );
          })}
        </ul>
      )}

      {/* Provisional Note */}
      {tier === "provisional" && (
        <p className="m-0 text-center text-[11px] leading-[14px] font-semibold uppercase">
          Provisional · faltan votos
        </p>
      )}
    </article>
  );
}
