import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all ease-out duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-92",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:border-input",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-92",
        outline: "border border-border bg-background hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-small",
        md: "h-tap px-4",
        lg: "h-[52px] px-6 text-[17px]",
        icon: "h-tap w-tap",
        "icon-xs": "h-6 w-6",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  block = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    block?: boolean
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size, className }),
        block && "w-full"
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
