export type CurrencyConfig = {
  name: string;
  symbol: string;
  decimal_places: number;
};

export function formatAmount(minorUnits: bigint | number, c: CurrencyConfig): string {
  const value = Number(minorUnits) / 10 ** c.decimal_places;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: c.decimal_places,
    maximumFractionDigits: c.decimal_places,
  });
  return `${c.symbol}${formatted}`;
}
