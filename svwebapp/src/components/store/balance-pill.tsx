import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface BalancePillProps {
  balance: number;
  currencySymbol: string;
  className?: string;
}

export function BalancePill({
  balance,
  currencySymbol,
  className,
}: BalancePillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary",
        className
      )}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {formatCurrency(balance, currencySymbol)}
    </div>
  );
}
