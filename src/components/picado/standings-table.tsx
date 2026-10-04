import { cn } from "@/lib/utils";
import { FormBadge } from "./form-badge";
import type { StandingsTableProps } from "./types";

export function StandingsTable({
  rows,
  qualify,
  showBuchholz: showBuchholzProp,
  teamLabel = "Equipo",
  caption,
  className,
}: StandingsTableProps) {
  // Show Buchholz if explicitly requested or if any row has it
  const showBuchholz =
    showBuchholzProp ?? rows.some((r) => r.buchholz != null);

  // Show Form if any row has form data
  const showForm = rows.some((r) => r.form && r.form.length > 0);

  return (
    <div
      className={cn(
        "overflow-x-auto",
        "border border-border rounded-lg bg-card",
        className
      )}
    >
      <table
        className={cn(
          "w-full",
          "border-collapse",
          "font-display tabular",
          "text-card-foreground"
        )}
      >
        {caption && <caption className="text-left p-3 px-4 text-title font-semibold">{caption}</caption>}
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                "text-center label-caps",
                "text-muted-foreground",
                "w-7",
                "p-2 px-3"
              )}
            >
              #
            </th>
            <th
              scope="col"
              className={cn(
                "text-left label-caps",
                "text-muted-foreground",
                "p-2"
              )}
            >
              {teamLabel}
            </th>
            {["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((col) => (
              <th
                key={col}
                scope="col"
                className={cn(
                  "text-center label-caps",
                  "text-muted-foreground",
                  "p-2",
                  "px-1.5",
                  "whitespace-nowrap"
                )}
              >
                {col}
              </th>
            ))}
            {showBuchholz && (
              <th
                scope="col"
                className={cn(
                  "text-center label-caps",
                  "text-muted-foreground",
                  "p-2",
                  "px-1.5",
                  "whitespace-nowrap"
                )}
                title="Buchholz"
              >
                Bh
              </th>
            )}
            {showForm && (
              <th
                scope="col"
                className={cn(
                  "text-center label-caps",
                  "text-muted-foreground",
                  "p-2",
                  "px-3"
                )}
              >
                Forma
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const pos = row.pos ?? index + 1;
            const isQualified = qualify && pos <= qualify;
            const isCutLine = qualify && pos === qualify;
            const dg = row.gf - row.gc;
            const dgDisplay = dg > 0 ? `+${dg}` : dg;

            return (
              <tr
                key={row.id || row.name}
                className={cn(
                  "border-b border-border",
                  "[&:last-child>*]:border-b-0"
                )}
              >
                <td
                  className={cn(
                    "text-center text-small p-2 px-3",
                    "font-bold whitespace-nowrap",
                    isQualified ? "text-primary font-bold" : "text-muted-foreground",
                    isCutLine && "border-b-2 border-b-primary"
                  )}
                >
                  {pos}
                </td>
                <th
                  scope="row"
                  className={cn(
                    "text-left text-small font-semibold",
                    "p-2",
                    "sticky left-0 bg-card",
                    "whitespace-nowrap"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {row.color && (
                      <span
                        className="flex-none w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate max-w-[140px]">{row.name}</span>
                  </div>
                </th>
                {[row.pj, row.g, row.e, row.p, row.gf, row.gc].map((val, i) => (
                  <td
                    key={i}
                    className={cn(
                      "text-center text-small p-2 px-1.5",
                      "whitespace-nowrap",
                      "tabular"
                    )}
                  >
                    {val}
                  </td>
                ))}
                <td
                  className={cn(
                    "text-center text-small p-2 px-1.5",
                    "whitespace-nowrap",
                    "tabular"
                  )}
                >
                  {dgDisplay}
                </td>
                <td
                  className={cn(
                    "text-center text-small font-bold p-2 px-1.5",
                    "whitespace-nowrap",
                    "text-foreground",
                    "tabular"
                  )}
                >
                  {row.pts}
                </td>
                {showBuchholz && (
                  <td
                    className={cn(
                      "text-center text-small p-2 px-1.5",
                      "whitespace-nowrap",
                      "tabular"
                    )}
                  >
                    {row.buchholz != null ? row.buchholz : "–"}
                  </td>
                )}
                {showForm && (
                  <td className={cn("text-center text-small p-2 px-3", "whitespace-nowrap")}>
                    <div className="flex justify-center gap-0.5">
                      {(row.form || []).slice(-5).map((result, j) => (
                        <FormBadge key={j} result={result} />
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
