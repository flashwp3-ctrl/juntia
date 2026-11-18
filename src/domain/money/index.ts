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
// 005 · PR B (corrección 3, INP): un solo formateador por moneda. Construirlo en cada llamada costaba la mayor parte del
// JavaScript propio de guardar en Anotar, porque cada fila y cada total lo llaman al volver a pintarse.
const currencyFormat: Record<Currency, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
};
export function formatMoney(money: Money): string {
  const negative = money.amountMinor < 0n;
  const absolute = negative ? -money.amountMinor : money.amountMinor;
  const pesos = (absolute + 50n) / 100n;
  // «$412.900», como el diseño (COMPONENT_SPECIFICATIONS.md, datos de referencia): sin el espacio que Intl pone entre el
  // símbolo y la cifra en es-CO.
  return currencyFormat[money.currency]
    .formatToParts(negative ? -pesos : pesos)
    .filter(({ type, value }) => type !== "literal" || value.trim() !== "")
    .map(({ value }) => value).join("");
}
