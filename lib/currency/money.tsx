import { formatAmount, type CurrencyConfig } from './format';

export function Money({
  amount,
  currency,
}: {
  amount: bigint | number;
  currency: CurrencyConfig;
}) {
  return <span className="tabular-nums">{formatAmount(amount, currency)}</span>;
}
