// T049 (spec 003, PR C): Actividad en Nosotros. Andamio para ver en rojo T043; la implementación llega en T049.
import type { Settlement } from "@/domain/balances";
import type { SharedTransaction } from "@/lib/db/types";
import type { CoupleMemberView } from "@/features/home/couple-home-view";
import type { MonthNavigation } from "./activity-view";

export type CoupleSettlementView = Settlement & { id: string; settlementDate: string; createdAt: string; note: string | null; version: number };
type Props = { expenses: readonly SharedTransaction[]; settlements: readonly CoupleSettlementView[]; month: string; today: string; navigation: MonthNavigation; members: readonly CoupleMemberView[]; selectedId?: string };
export function CoupleActivityView(props: Props) { void props; return null; }
