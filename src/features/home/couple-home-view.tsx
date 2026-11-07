// T048 (spec 003, PR C): Inicio en Nosotros. Andamio para ver en rojo T043; la implementación llega en T048.
import type { MemberBalance } from "@/domain/balances";
import type { CategoryId } from "@/domain/transactions";
import type { SharedTransaction } from "@/lib/db/types";

export type CoupleMemberView = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };
export type CoupleMonthSummary = { totalMinor: string; count: number; byCategory: Partial<Record<CategoryId, string>> };
type Props = { month: string; today: string; summary: CoupleMonthSummary | null; balance: readonly MemberBalance[]; rows: readonly SharedTransaction[]; members: readonly CoupleMemberView[] };

export function CoupleHomeView(props: Props) { void props; return null; }
export function BalanceLine(props: { balance: readonly MemberBalance[]; members: readonly CoupleMemberView[] }) { void props; return null; }
