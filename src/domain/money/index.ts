export type Currency = "COP";
export type Money = Readonly<{ amountMinor: bigint; currency: Currency }>;
export const MAX_COP_PESOS = 999_999_999n;
export function moneyFromPesos(pesos: bigint): Money {
  return { amountMinor: pesos * 100n, currency: "COP" };
}
export function parseAmountMinor(text: string): Money {
  if (typeof text !== "string" || !/^[0-9]{1,19}$/.test(text) || BigInt(text) > 9223372036854775807n) {
    throw new RangeError("invalidAmount");
  }
  return { amountMinor: BigInt(text), currency: "COP" };
}
export function serializeAmountMinor(money: Money): string {
  return money.amountMinor.toString();
}
export function formatMoney(money: Money): string {
  const negative = money.amountMinor < 0n;
  const absolute = negative ? -money.amountMinor : money.amountMinor;
  const pesos = (absolute + 50n) / 100n;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: money.currency, maximumFractionDigits: 0 })
    .format(negative ? -pesos : pesos);
}
