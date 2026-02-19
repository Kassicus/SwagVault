import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        {
          "bg-primary/10 text-primary": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "bg-success/10 text-success": variant === "success",
          "bg-warning/10 text-warning": variant === "warning",
          "bg-destructive/10 text-destructive": variant === "destructive",
          "border border-border text-foreground": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
