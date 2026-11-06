import { type Money } from "../money";
import { type Allocation, type OrderedMember, validateSplit } from "../allocations";
export type SharedExpense = Readonly<{ amount: Money; payerUserId: string; status: "active" | "voided"; allocations: readonly Allocation[] }>;
export type Settlement = Readonly<{ amount: Money; fromUserId: string; toUserId: string; status: "active" | "voided" }>;
export type MemberBalance = Readonly<{ userId: string; paid: Money; share: Money; settledOut: Money; settledIn: Money; net: Money }>;
const money = (amountMinor: bigint): Money => ({ currency: "COP", amountMinor });
export function computeBalance(expenses: readonly SharedExpense[], settlements: readonly Settlement[], members: readonly OrderedMember[]): MemberBalance[] {
  const totals = new Map(members.map(m => [m.userId, { paid: 0n, share: 0n, settledOut: 0n, settledIn: 0n }]));
  if (totals.size !== members.length) throw new RangeError("invalidMembers");
  const member = (id: string) => { const value = totals.get(id); if (!value) throw new RangeError("notCoupleMember"); return value; };
  for (const expense of expenses) {
    if (expense.status !== "active") continue;
    if (!validateSplit(expense.amount, expense.allocations).valid) throw new RangeError("invalidSplit");
    member(expense.payerUserId).paid += expense.amount.amountMinor;
    for (const part of expense.allocations) member(part.userId).share += part.amount.amountMinor;
  }
  for (const settlement of settlements) {
    if (settlement.status !== "active") continue;
    if (settlement.amount.currency !== "COP" || settlement.amount.amountMinor <= 0n || settlement.amount.amountMinor % 100n !== 0n || settlement.fromUserId === settlement.toUserId) throw new RangeError("invalidSettlement");
    member(settlement.fromUserId).settledOut += settlement.amount.amountMinor;
    member(settlement.toUserId).settledIn += settlement.amount.amountMinor;
  }
  return [...members].sort((a, b) => a.joinOrder - b.joinOrder).map(m => {
    const t = member(m.userId);
    return { userId: m.userId, paid: money(t.paid), share: money(t.share), settledOut: money(t.settledOut), settledIn: money(t.settledIn), net: money(t.paid - t.share + t.settledOut - t.settledIn) };
  });
}
/** P0 solo sugiere para una pareja; el cálculo de balances sí admite N. */
export function settlementSuggestion(balance: readonly MemberBalance[]) {
  const debtor = balance.filter(b => b.net.amountMinor < 0n);
  const creditor = balance.filter(b => b.net.amountMinor > 0n);
  if (debtor.length === 0 && creditor.length === 0) return null;
  if (debtor.length !== 1 || creditor.length !== 1 || debtor[0].net.amountMinor + creditor[0].net.amountMinor !== 0n) throw new RangeError("invalidCoupleBalance");
  return { fromUserId: debtor[0].userId, toUserId: creditor[0].userId, amount: creditor[0].net };
}
