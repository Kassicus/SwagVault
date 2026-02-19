import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        {
          "text-lg": size === "sm",
          "text-xl": size === "md",
          "text-3xl": size === "lg",
        },
        className
      )}
    >
      <span className="text-primary">Swag</span>
      <span className="text-foreground">Vault</span>
    </span>
  );
}
