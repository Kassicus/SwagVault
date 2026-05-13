import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border-2 border-foreground bg-background px-3 py-1 text-sm text-foreground transition-colors outline-none",
        "file:inline-flex file:h-7 file:border-2 file:border-foreground file:bg-card file:px-2 file:text-xs file:font-bold file:uppercase file:text-foreground hover:file:bg-muted",
        "placeholder:text-muted-foreground/70",
        "focus-visible:bg-card focus-visible:shadow-[3px_3px_0_0_var(--primary)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[3px_3px_0_0_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
