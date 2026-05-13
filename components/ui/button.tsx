import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Brutalist button: hard 2px border, chunky offset shadow that "presses in" on
// active. Uppercase Space Grotesk for impact. No rounded corners.
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center",
    "border-2 border-foreground font-heading font-bold uppercase tracking-wide",
    "whitespace-nowrap select-none transition-[transform,box-shadow,background-color] duration-75",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground",
    // Press effect: drop the shadow, nudge into the void.
    "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary CTA: yellow with foreground-shadow.
        default: "bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:bg-primary/90",
        // Secondary: orange shadow on dark surface.
        secondary: "bg-card text-card-foreground shadow-[3px_3px_0_0_var(--secondary)] hover:bg-muted",
        // Outline: transparent, hover fills with subtle muted.
        outline: "bg-transparent text-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:bg-muted",
        // Ghost: no border, no shadow — for low-key actions.
        ghost: "border-transparent shadow-none hover:bg-muted hover:text-foreground active:translate-x-0 active:translate-y-0",
        // Destructive: orange-red.
        destructive: "bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:bg-secondary/90",
        // Mint accent — for "go" / success actions.
        mint: "bg-mint text-mint-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:bg-mint/90",
        // Link: text-only.
        link: "border-transparent shadow-none text-foreground underline underline-offset-4 hover:text-primary active:translate-x-0 active:translate-y-0",
      },
      size: {
        default: "h-10 gap-1.5 px-4 text-xs",
        xs: "h-7 gap-1 px-2 text-[10px]",
        sm: "h-8 gap-1.5 px-3 text-[11px]",
        lg: "h-12 gap-2 px-6 text-sm",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
