// PR D de la 003 (T061) / FR-025; COMPONENT_SPECIFICATIONS.md §SharedBalance, «Codificación de la barra» (decisión 20.2:
// aprobada en su forma), con las medidas de 02·3 y 04·2. Sin React: posiciones en porcentaje de una misma escala para las
// dos personas. Cada barra parte de lo que la persona pagó y de sus liquidaciones:
// - lo que asume de verdad = pagado + liquidó − recibió (= le corresponde + saldo);
// - tramo de su color (`paid`) hasta lo pagado; pasada la marca, con contorno de tinta (`over`: puso de más);
// - tramo rayado en tinta (`settled`: liquidó), de lo pagado hasta lo que asume;
// - contorno punteado (`received`: recibió), lo que le devolvieron, al final de lo que puso;
// - hueco punteado (`missing`: le falta), de lo que asume hasta la marca.
import type { MemberBalance } from "@/domain/balances";

export type SegmentKind = "paid" | "over" | "settled" | "received" | "missing";
export type Segment = { kind: SegmentKind; start: number; end: number };
export type BarGeometry = { mark: number; segments: Segment[] };

const max = (...values: bigint[]) => values.reduce((a, b) => (b > a ? b : a));
const min = (...values: bigint[]) => values.reduce((a, b) => (b < a ? b : a));

/** La escala común: lo más largo que hay que dibujar entre las dos personas (nunca 0). */
export function balanceScale(rows: readonly MemberBalance[]): bigint {
  const longest = rows.reduce((current, row) => max(current, row.paid.amountMinor + row.settledOut.amountMinor, row.share.amountMinor), 0n);
  return longest > 0n ? longest : 1n;
}

/** La barra de una persona en porcentajes de `scale`, con dos decimales. */
export function barGeometry(row: MemberBalance, scale: bigint): BarGeometry {
  const pct = (value: bigint) => Number((value * 10000n) / scale) / 100;
  const paid = row.paid.amountMinor;
  const share = row.share.amountMinor;
  const put = paid + row.settledOut.amountMinor;
  const kept = max(0n, put - row.settledIn.amountMinor);
  const own = min(paid, kept);
  const segments: Segment[] = [];
  const add = (kind: SegmentKind, start: bigint, end: bigint) => { if (end > start) segments.push({ kind, start: pct(start), end: pct(end) }); };
  add("paid", 0n, min(own, share));
  add("over", share, own);
  add("settled", paid, kept);
  add("received", kept, put);
  add("missing", max(kept, put), share);
  return { mark: pct(share), segments };
}
