import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}

function Card({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && (
              <p className="text-title font-semibold margin-0">{title}</p>
            )}
            {subtitle && (
              <p className="text-small text-muted-foreground margin-0">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-title font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-small text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
