// 004 PR E (T073, T074): cómo se dicen en Análisis los importes que manda el servidor. Solo formatean: no deciden nada.
import { formatMoney } from "@/domain/money";
import { copy } from "@/lib/copy/es";

/** «$2.840.000». */
export const money = (minor: bigint) => formatMoney({ amountMinor: minor, currency: "COP" });

/** «−$200.000» con el signo menos tipográfico; positivos y cero sin signo. */
export const signedMoney = (minor: bigint) => (minor < 0n ? `−${money(-minor)}` : money(minor));

/** La etiqueta corta sobre una barra del Chart (11/600): «2,8 M», «640 mil». La cifra exacta va en la tabla equivalente. */
export function compactPesos(minor: bigint) {
  const pesos = minor / 100n;
  if (pesos >= 1_000_000n) {
    const tenths = pesos / 100_000n;
    return copy.analysis.compared.millions(`${tenths / 10n}${tenths % 10n === 0n ? "" : `,${tenths % 10n}`}`);
  }
  if (pesos >= 1_000n) return copy.analysis.compared.thousands(String(pesos / 1_000n));
  return String(pesos);
}
