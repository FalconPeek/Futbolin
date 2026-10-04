import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  title: string
  backHref?: string
  right?: React.ReactNode
}

export function AppHeader({ title, backHref, right }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "bg-background border-b border-border",
        "px-4 h-14",
        "flex items-center justify-between gap-4"
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Volver"
            className={cn(
              "flex-shrink-0 flex items-center justify-center",
              "w-tap h-tap min-h-tap",
              "text-foreground hover:text-primary",
              "rounded-md transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <h1 className="text-title font-semibold truncate">{title}</h1>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
  )
}
