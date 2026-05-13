import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 border-2 border-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        mint: "bg-mint text-mint-foreground",
        warn: "bg-warn text-warn-foreground",
        outline: "bg-transparent text-foreground",
        muted: "bg-muted text-muted-foreground border-muted-foreground/40",
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
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
