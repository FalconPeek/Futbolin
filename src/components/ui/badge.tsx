import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center h-6 px-2 rounded-sm text-caption font-semibold whitespace-nowrap border",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-foreground border-transparent",
        primary: "bg-primary text-primary-foreground border-transparent",
        gold: "bg-transparent text-gold border-gold",
        info: "bg-transparent text-info border-info",
        destructive: "bg-destructive text-destructive-foreground border-transparent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
