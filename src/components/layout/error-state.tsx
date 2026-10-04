"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Algo salió mal",
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        "py-12 px-4 text-center"
      )}
    >
      <AlertCircle className="size-12 text-destructive" strokeWidth={1.5} />
      <h2 className="text-title font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-small text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Reintentar
        </Button>
      )}
    </div>
  )
}
