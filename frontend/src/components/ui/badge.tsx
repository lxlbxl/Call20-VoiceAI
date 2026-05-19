import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-800",
        warning:
          "border-transparent bg-amber-100 text-amber-800",
        destructive:
          "border-transparent bg-red-100 text-red-800",
        info:
          "border-transparent bg-blue-100 text-blue-800",
        outline:
          "border-[var(--border)] text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }