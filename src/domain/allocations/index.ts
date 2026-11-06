import { MAX_COP_PESOS, type Money } from "../money";
export const SPLIT_VERSION = 1;
export type SplitMode = "equal" | "percent" | "amount";
export type OrderedMember = Readonly<{ userId: string; joinOrder: number }>;
export type Allocation = Readonly<{ userId: string; amount: Money }>;
export type SplitValues = Readonly<Record<string, number | bigint>>;
const money = (amountMinor: bigint): Money => ({ amountMinor, currency: "COP" });
export function validateSplit(amount: Money, parts: readonly Allocation[]) {
  const sum = parts.reduce((total, part) => total + part.amount.amountMinor, 0n);
  const difference = amount.amountMinor - sum;
  return {
    valid: difference === 0n && parts.length > 0 && parts.some(p => p.amount.amountMinor > 0n)
      && new Set(parts.map(p => p.userId)).size === parts.length
      && parts.every(p => p.amount.currency === amount.currency && p.amount.amountMinor >= 0n && p.amount.amountMinor % 100n === 0n),
    missing: money(difference > 0n ? difference : 0n), excess: money(difference < 0n ? -difference : 0n),
  };
}
/** ADR-002 v1: mayor residuo en pesos; la entrada se ordena por ingreso, nunca por pagador. */
export function splitAmount(amount: Money, mode: SplitMode, participants: readonly OrderedMember[], values: SplitValues = {}): Allocation[] {
  if (amount.currency !== "COP" || amount.amountMinor <= 0n || amount.amountMinor % 100n !== 0n || amount.amountMinor > MAX_COP_PESOS * 100n
    || participants.length === 0 || new Set(participants.map(p => p.userId)).size !== participants.length
    || new Set(participants.map(p => p.joinOrder)).size !== participants.length
    || participants.some(p => !Number.isInteger(p.joinOrder) || p.joinOrder < 1)) throw new RangeError("invalidSplit");
  const members = [...participants].sort((a, b) => a.joinOrder - b.joinOrder);
  if (mode === "amount") {
    const parts = members.map(p => {
      const value = values[p.userId];
      if (typeof value !== "bigint") throw new RangeError("invalidSplit");
      return { userId: p.userId, amount: money(value) };
    });
    if (!validateSplit(amount, parts).valid) throw new RangeError("invalidSplit");
    return parts;
  }
  if (mode !== "equal" && mode !== "percent") throw new RangeError("invalidSplitMode");
  const weights = members.map(p => mode === "equal" ? 1 : values[p.userId]);
  if (weights.some(w => typeof w !== "number" || !Number.isInteger(w) || w < 0 || w > 100)) throw new RangeError("invalidSplit");
  const denominator = mode === "equal" ? BigInt(members.length) : 100n;
  if (mode === "percent" && weights.reduce<number>((s, w) => s + Number(w), 0) !== 100) throw new RangeError("invalidSplit");
  const pesos = amount.amountMinor / 100n;
  const shares = members.map((p, i) => {
    const numerator = pesos * BigInt(weights[i]);
    return { ...p, pesos: numerator / denominator, remainder: numerator % denominator };
  });
  let remaining = pesos - shares.reduce((s, p) => s + p.pesos, 0n);
  for (const share of [...shares].sort((a, b) => a.remainder === b.remainder ? a.joinOrder - b.joinOrder : a.remainder > b.remainder ? -1 : 1)) {
    if (remaining === 0n) break;
    share.pesos++; remaining--;
  }
  return shares.map(p => ({ userId: p.userId, amount: money(p.pesos * 100n) }));
}
type Selection = Readonly<{ mode: SplitMode; participants: readonly OrderedMember[]; values: SplitValues }>;
export type SplitSelection = Selection & Readonly<{ previous?: Selection }>;
/** FR-019a: memoria de la hoja abierta, no una preferencia persistida. */
export function nextSplitOnParticipantsChange(previous: SplitSelection, participants: readonly OrderedMember[]): SplitSelection {
  if (participants.length === 0) throw new RangeError("invalidSplit");
  if (participants.length === 1) return { mode: "equal", participants, values: {}, previous: previous.participants.length > 1 ? previous : previous.previous };
  const candidate = previous.previous ?? previous;
  const sameMembers = candidate.participants.length === participants.length && participants.every(p => candidate.participants.some(c => c.userId === p.userId));
  const positive = candidate.mode === "equal" || participants.every(p => candidate.values[p.userId] > 0);
  if (sameMembers && positive) return { mode: candidate.mode, participants, values: candidate.values };
  return { mode: "equal", participants, values: {} };
}
