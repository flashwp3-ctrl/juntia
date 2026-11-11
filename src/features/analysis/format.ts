// 004 PR E (T073, T074): cómo se dicen en Análisis los importes que manda el servidor. Solo formatean: no deciden nada.
import { formatMoney } from "@/domain/money";
import { copy } from "@/lib/copy/es";

/** «$2.840.000». */
export const money = (minor: bigint) => formatMoney({ amountMinor: minor, currency: "COP" });

/** «−$200.000» con el signo menos tipográfico; positivos y cero sin signo. */
export const signedMoney = (minor: bigint) => (minor < 0n ? `−${money(-minor)}` : money(minor));

/**
 * La etiqueta corta sobre una barra del Chart (11/600): «2,8 M», «640 mil», redondeada a la décima de millón o al millar más
 * cercano (revisión del PR #71, 5: $2.990.000 es «3 M», no «2,9 M»). La cifra exacta va en la tabla equivalente.
 */
export function compactPesos(minor: bigint) {
  const pesos = (minor + 50n) / 100n;
  const tenths = (pesos + 50_000n) / 100_000n;
  if (tenths >= 10n) return copy.analysis.compared.millions(`${tenths / 10n}${tenths % 10n === 0n ? "" : `,${tenths % 10n}`}`);
  const thousands = (pesos + 500n) / 1_000n;
  if (thousands >= 1n) return copy.analysis.compared.thousands(String(thousands));
  return String(pesos);
}
