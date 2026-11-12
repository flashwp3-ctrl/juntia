// T046 (spec 003, PR C) / FR-019, FR-019a, FR-021; US-2.1–2.4f; Q5–Q8. El reparto de la hoja de Anotar en Nosotros y de
// Mover a Pareja, sin React: lo que la persona eligió (pagó, modo, participantes y lo que escribió) y lo que eso da con el
// monto actual. Las partes salen siempre de `splitAmount` del dominio (ADR-002, versión 1: pesos enteros, mayor residuo y
// desempate por orden de ingreso; decisión 2 de los fundadores, el peso impar va a la persona 1). El paso de dos a uno y
// de uno a dos participantes es `nextSplitOnParticipantsChange` (FR-019a). Nada de esto se guarda en el navegador.
import { nextSplitOnParticipantsChange, splitAmount, type Allocation, type SplitMode, type SplitSelection } from "@/domain/allocations";
import { formatMoney, moneyFromPesos, type Money } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import type { LastSplit, SavedShared, SharedSplitPayload, SheetMember } from "./shared-types";

/** Lo que la persona escribió: porcentajes enteros y pesos como texto, tal como están en los campos. */
export type SplitDraft = {
  payerUserId: string;
  mode: SplitMode;
  participants: string[];
  percents: Record<string, string>;
  amounts: Record<string, string>;
  /** En Importe, mientras nadie toque un campo, las partes siguen al 50/50 del monto actual. */
  amountsTouched: boolean;
  /** FR-019a: el reparto de dos que tenía la hoja antes de quitar a alguien (memoria de la hoja abierta). */
  previous?: Omit<SplitDraft, "previous" | "payerUserId">;
};

export type SplitStatus =
  | { kind: "ok"; allocations: Allocation[] }
  | { kind: "noAmount" }
  | { kind: "incomplete" }
  | { kind: "missing"; amount: Money; percent?: number }
  | { kind: "excess"; amount: Money; percent?: number };

const ordered = (members: readonly SheetMember[]) => [...members].sort((a, b) => a.joinOrder - b.joinOrder);
const me = (members: readonly SheetMember[]) => members.find((member) => member.isMe) ?? ordered(members)[0];
const DIGITS = /^[0-9]{1,9}$/;

/**
 * Al abrir (Q5): «Pagó: yo» y 50/50 entre los dos; o el reparto que usó esta persona la última vez (decisión 1). El pagador
 * es siempre quien anota: decisión de los fundadores del 12 de noviembre de 2026 (T084, 6b), que cambia Q5 y FR-021 de la
 * 003 en ese punto. En la simulación, Sara guardó gastos como «Pagó Tomás» sin darse cuenta porque se recordaba el último
 * pagador. `last.payerUserId` se sigue leyendo (del último gasto, `couple_expenses`), pero ya no decide el valor por defecto.
 */
export function initialSplit(members: readonly SheetMember[], last: LastSplit | null): SplitDraft {
  const all = ordered(members).map((member) => member.userId);
  const valid = last && members.some((m) => m.userId === last.payerUserId) && last.participants.length > 0 && last.participants.every((id) => all.includes(id));
  if (!valid) return { payerUserId: me(members).userId, mode: "equal", participants: all, percents: {}, amounts: {}, amountsTouched: false };
  const participants = all.filter((id) => last.participants.includes(id));
  const percents = last.splitMode === "percent" && last.percents && participants.length > 1
    ? Object.fromEntries(participants.map((id) => [id, String(last.percents![id] ?? 0)])) : {};
  const mode: SplitMode = participants.length === 1 ? "equal" : last.splitMode;
  return { payerUserId: me(members).userId, mode, participants, percents, amounts: {}, amountsTouched: false };
}

type SavedSplit = Pick<SavedShared, "payerUserId" | "splitMode" | "splitPercents" | "parts">;

/**
 * F57-1 (revisión del PR #57): quién participa en un gasto guardado sale de su modo, no de las partes positivas. `equal`
 * reparte siempre entre los dos (un equal de $1 deja a Tomás en $0 y sigue siendo de los dos); `percent`, quien tiene un
 * porcentaje mayor que 0 (100/0 es un solo participante); `amount`, quien tiene una parte mayor que 0 (FR-019a).
 */
function savedParticipants(saved: SavedSplit, members: readonly SheetMember[]) {
  const list = ordered(members);
  if (saved.splitMode === "equal") return list.map((member) => member.userId);
  if (saved.splitMode === "percent" && saved.splitPercents) return list.filter((_, index) => (saved.splitPercents![index] ?? 0) > 0).map((member) => member.userId);
  return list.filter((member) => BigInt(saved.parts[member.userId] ?? "0") > 0n).map((member) => member.userId);
}

/** Lo último que usó la persona, a partir de un gasto guardado (Q5; decisión 1). */
export function lastFromSaved(saved: SavedSplit, members: readonly SheetMember[]): LastSplit {
  const list = ordered(members);
  const participants = savedParticipants(saved, members);
  const percents = saved.splitMode === "percent" && saved.splitPercents ? Object.fromEntries(list.map((member, index) => [member.userId, saved.splitPercents![index] ?? 0])) : null;
  return { payerUserId: saved.payerUserId, splitMode: saved.splitMode, percents, participants };
}

/** El reparto de un gasto compartido guardado, para editarlo (Q12). */
export function splitFromSaved(saved: SavedSplit, members: readonly SheetMember[]): SplitDraft {
  const list = ordered(members);
  const participants = savedParticipants(saved, members);
  const mode: SplitMode = participants.length === 1 ? "equal" : saved.splitMode;
  const percents = mode === "percent" && saved.splitPercents ? Object.fromEntries(list.map((member, index) => [member.userId, String(saved.splitPercents![index] ?? 0)])) : {};
  const amounts = mode === "amount" ? Object.fromEntries(list.map((member) => [member.userId, String(BigInt(saved.parts[member.userId] ?? "0") / 100n)])) : {};
  return { payerUserId: saved.payerUserId, mode, participants, percents, amounts, amountsTouched: mode === "amount" };
}

const values = (draft: Omit<SplitDraft, "previous" | "payerUserId">) => (draft.mode === "percent"
  ? Object.fromEntries(Object.entries(draft.percents).map(([id, text]) => [id, Number(text)]))
  : draft.mode === "amount"
    ? Object.fromEntries(draft.participants.map((id) => [id, draft.amountsTouched ? (DIGITS.test(draft.amounts[id] ?? "") ? BigInt(draft.amounts[id]) : -1n) : 1n]))
    : {});

/**
 * FR-019a. Quitar o añadir a alguien de Participan, con `nextSplitOnParticipantsChange` del dominio. De dos a uno: el que
 * queda asume el 100 % y la hoja recuerda el reparto de dos. De uno a dos: vuelve ese reparto solo si sus dos partes eran
 * positivas; si no (100/0, o ninguno), 50/50 con las dos personas.
 */
export function toggleParticipant(draft: SplitDraft, userId: string, members: readonly SheetMember[]): SplitDraft {
  const list = ordered(members);
  const next = draft.participants.includes(userId) ? draft.participants.filter((id) => id !== userId) : list.map((m) => m.userId).filter((id) => id === userId || draft.participants.includes(id));
  if (next.length === 0) return draft;
  const order = (ids: readonly string[]) => ids.map((id) => ({ userId: id, joinOrder: list.find((m) => m.userId === id)!.joinOrder }));
  const current = { mode: draft.mode, participants: draft.participants, percents: draft.percents, amounts: draft.amounts, amountsTouched: draft.amountsTouched };
  const remembered = draft.previous;
  const selection: SplitSelection = {
    mode: current.mode, participants: order(current.participants), values: values(current),
    previous: remembered ? { mode: remembered.mode, participants: order(remembered.participants), values: values(remembered) } : undefined,
  };
  const result = nextSplitOnParticipantsChange(selection, order(next));
  if (result.participants.length === 1) return { ...draft, mode: "equal", participants: next, previous: draft.participants.length > 1 ? current : draft.previous };
  // De uno a dos: el dominio devolvió el reparto recordado (con dos partes positivas) o un 50/50 nuevo.
  if (remembered && result.mode === remembered.mode && (result.mode !== "equal" || remembered.mode === "equal")) return { payerUserId: draft.payerUserId, ...remembered, participants: next };
  return { payerUserId: draft.payerUserId, mode: "equal", participants: next, percents: {}, amounts: {}, amountsTouched: false };
}

/** Cambio de modo: Porcentaje empieza en 50/50 y Importe sigue al 50/50 hasta que se toque un campo. */
export function setMode(draft: SplitDraft, mode: SplitMode, members: readonly SheetMember[]): SplitDraft {
  if (mode === draft.mode) return draft;
  const ids = ordered(members).filter((m) => draft.participants.includes(m.userId)).map((m) => m.userId);
  const percents = mode === "percent" && Object.keys(draft.percents).length === 0 ? Object.fromEntries(ids.map((id, index) => [id, index === 0 ? "50" : "50"])) : draft.percents;
  return { ...draft, mode, percents, amounts: mode === "amount" ? {} : draft.amounts, amountsTouched: false };
}

/** Lo que dan el reparto y el monto actual (E3 con la cifra exacta; decisión 3: en Porcentaje, pesos y porcentaje). */
export function evaluateSplit(draft: SplitDraft, amountPesos: number | null, members: readonly SheetMember[]): SplitStatus {
  if (amountPesos === null || amountPesos <= 0) return { kind: "noAmount" };
  const total = moneyFromPesos(BigInt(amountPesos));
  const list = ordered(members).filter((m) => draft.participants.includes(m.userId));
  const people = list.map((m) => ({ userId: m.userId, joinOrder: m.joinOrder }));
  if (people.length === 1) return { kind: "ok", allocations: splitAmount(total, "equal", people) };
  if (draft.mode === "equal" || (draft.mode === "amount" && !draft.amountsTouched)) return { kind: "ok", allocations: splitAmount(total, "equal", people) };
  if (draft.mode === "percent") {
    const parts = people.map((p) => draft.percents[p.userId] ?? "");
    if (parts.some((text) => !/^[0-9]{1,3}$/.test(text) || Number(text) > 100)) return { kind: "incomplete" };
    const sum = parts.reduce((acc, text) => acc + Number(text), 0);
    const diff = 100 - sum;
    const amount = moneyFromPesos((BigInt(amountPesos) * BigInt(Math.abs(diff))) / 100n);
    if (diff > 0) return { kind: "missing", amount, percent: diff };
    if (diff < 0) return { kind: "excess", amount, percent: -diff };
    return { kind: "ok", allocations: splitAmount(total, "percent", people, Object.fromEntries(people.map((p) => [p.userId, Number(draft.percents[p.userId])]))) };
  }
  const parts = people.map((p) => draft.amounts[p.userId] ?? "");
  if (parts.some((text) => !DIGITS.test(text))) return { kind: "incomplete" };
  const sum = parts.reduce((acc, text) => acc + BigInt(text), 0n);
  const diff = BigInt(amountPesos) - sum;
  if (diff > 0n) return { kind: "missing", amount: moneyFromPesos(diff) };
  if (diff < 0n) return { kind: "excess", amount: moneyFromPesos(-diff) };
  if (parts.every((text) => BigInt(text) === 0n)) return { kind: "incomplete" };
  return { kind: "ok", allocations: people.map((p) => ({ userId: p.userId, amount: moneyFromPesos(BigInt(draft.amounts[p.userId])) })) };
}

/** Importe con las partes «automáticas» (aún sin tocar): lo que muestran los campos. */
export function shownAmounts(draft: SplitDraft, amountPesos: number | null, members: readonly SheetMember[]): Record<string, string> {
  if (draft.mode !== "amount" || draft.amountsTouched) return draft.amounts;
  const status = evaluateSplit({ ...draft, mode: "equal" }, amountPesos, members);
  return status.kind === "ok" ? Object.fromEntries(status.allocations.map((a) => [a.userId, String(a.amount.amountMinor / 100n)])) : {};
}

/** Texto del aviso de E3, o `null` si el reparto cuadra. */
export function splitMessage(status: SplitStatus): string | null {
  if (status.kind === "missing") return status.percent !== undefined ? copy.shared.split.missingPercent(formatMoney(status.amount), status.percent) : copy.shared.split.missing(formatMoney(status.amount));
  if (status.kind === "excess") return status.percent !== undefined ? copy.shared.split.excessPercent(formatMoney(status.amount), status.percent) : copy.shared.split.excess(formatMoney(status.amount));
  return null;
}

const nameOf = (members: readonly SheetMember[], id: string) => members.find((m) => m.userId === id)?.name ?? "";

/** La etiqueta del modo en el resumen y en las filas: «50/50», «55/45» o «Importe» (04·1, 04·7). */
export function modeLabel(draft: Pick<SplitDraft, "mode" | "percents" | "participants">, members: readonly SheetMember[]): string {
  if (draft.mode === "equal") return copy.shared.mode.equal;
  if (draft.mode === "amount") return copy.shared.mode.amount;
  const list = ordered(members);
  const numbers = list.map((m) => Number(draft.percents[m.userId] ?? "NaN"));
  return numbers.every((n) => Number.isInteger(n)) && numbers.reduce((a, b) => a + b, 0) === 100 ? copy.shared.mode.percentOf(numbers) : copy.shared.mode.percent;
}

/** Las dos líneas de la fila resumen de 60 px (2a): quién pagó y el reparto; quién participa con cuánto, o el aviso. */
export function summaryLines(draft: SplitDraft, status: SplitStatus, members: readonly SheetMember[]): { first: string; second: string; invalid: boolean } {
  const payer = nameOf(members, draft.payerUserId);
  const people = ordered(members).filter((m) => draft.participants.includes(m.userId));
  const message = splitMessage(status);
  if (people.length === 1) {
    const second = status.kind === "ok" ? copy.shared.summary.one(people[0].name, formatMoney(status.allocations[0].amount)) : people[0].name;
    return { first: copy.shared.summary.single(payer), second, invalid: false };
  }
  const first = copy.shared.summary.paid(payer, modeLabel(draft, members));
  if (message) return { first, second: message, invalid: true };
  const names = copy.shared.summary.both(people[0].name, people[1].name);
  if (status.kind !== "ok") return { first, second: names, invalid: status.kind === "incomplete" };
  const [a, b] = status.allocations;
  if (a.amount.amountMinor === b.amount.amountMinor) return { first, second: copy.shared.summary.each(names, formatMoney(a.amount)), invalid: false };
  return { first, second: copy.shared.summary.parts(status.allocations.map((part) => [nameOf(members, part.userId), formatMoney(part.amount)] as const)), invalid: false };
}

/** Lo que viaja a la Server Action: el modo, los participantes y los valores; las partes las calcula el servidor. */
export function splitPayload(draft: SplitDraft, status: SplitStatus, members: readonly SheetMember[]): SharedSplitPayload | null {
  if (status.kind !== "ok") return null;
  const participants = ordered(members).filter((m) => draft.participants.includes(m.userId)).map((m) => m.userId);
  const single = participants.length === 1;
  const mode: SplitMode = single ? "equal" : draft.mode;
  return {
    payerUserId: draft.payerUserId, splitMode: mode, participants,
    percents: mode === "percent" ? Object.fromEntries(participants.map((id) => [id, Number(draft.percents[id])])) : null,
    amountsPesos: mode === "amount" ? Object.fromEntries(status.allocations.map((part) => [part.userId, String(part.amount.amountMinor / 100n)])) : null,
  };
}
