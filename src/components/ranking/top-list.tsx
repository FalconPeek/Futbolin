import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface TopListRow {
  id: string;
  name: string;
  value: number;
}

interface TopListProps {
  title: string;
  rows: TopListRow[];
  unit?: string;
}

export function TopList({ title, rows, unit }: TopListProps) {
  // Sin valor (0) no se lista; el orden ya viene definido por quien la arma
  const filtered = rows.filter((r) => r.value > 0);

  return (
    <Card title={title}>
      {filtered.length === 0 ? (
        <p className="text-small text-muted-foreground">Todavía nadie.</p>
      ) : (
        <ol className="space-y-2">
          {filtered.slice(0, 5).map((row, index) => (
            <li
              key={row.id}
              className={cn(
                "flex items-center justify-between gap-3",
                "py-1.5 px-2",
                "text-body"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-display tabular text-muted-foreground w-6 text-center">
                  {index + 1}
                </span>
                <span className="truncate text-foreground">{row.name}</span>
              </div>
              <span
                className="font-display tabular text-foreground shrink-0"
                title={unit ? `${row.value} ${unit}` : undefined}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
