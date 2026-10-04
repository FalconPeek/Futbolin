"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, error, id: providedId, ...props }, ref) => {
    const id = React.useId()
    const inputId = providedId || id

    return (
      <div className="flex flex-col gap-1">
        {label && <Label htmlFor={inputId} className="text-small">{label}</Label>}
        <input
          ref={ref}
          type={type}
          id={inputId}
          data-slot="input"
          className={cn(
            "h-tap px-3 w-full bg-card text-foreground border border-input rounded-md text-body placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-destructive",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-small text-destructive">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-small text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
