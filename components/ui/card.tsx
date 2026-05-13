import * as React from "react"

import { cn } from "@/lib/utils"

// Brutalist card: hard 2px foreground border, optional offset shadow accent.
// `accent` controls the shadow color: foreground (default), primary (yellow),
// secondary (orange), mint, or none for a flat card.

type CardAccent = "foreground" | "primary" | "secondary" | "mint" | "none"

const accentShadow: Record<CardAccent, string> = {
  foreground: "shadow-[5px_5px_0_0_var(--foreground)]",
  primary: "shadow-[5px_5px_0_0_var(--primary)]",
  secondary: "shadow-[5px_5px_0_0_var(--secondary)]",
  mint: "shadow-[5px_5px_0_0_var(--mint)]",
  none: "",
}

function Card({
  className,
  size = "default",
  accent = "foreground",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  accent?: CardAccent
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card relative flex flex-col gap-4 border-2 border-foreground bg-card py-5 text-sm text-card-foreground",
        "data-[size=sm]:gap-3 data-[size=sm]:py-4",
        accentShadow[accent],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 px-5 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-xl font-bold uppercase tracking-tight leading-none group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t-2 border-foreground bg-muted/40 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
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
