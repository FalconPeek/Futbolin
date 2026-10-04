import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        "py-12 px-4 text-center"
      )}
    >
      {Icon && (
        <Icon className="size-12 text-muted-foreground" strokeWidth={1.5} />
      )}
      <h2 className="text-title font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-small text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
