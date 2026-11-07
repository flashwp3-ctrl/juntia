// T049 (spec 003, PR C): detalle de un gasto compartido. Andamio para ver en rojo T043.
import type { SharedTransaction } from "@/lib/db/types";
import type { CoupleMemberView } from "@/features/home/couple-home-view";
export function SharedDetail(props: { expense: SharedTransaction; members: readonly CoupleMemberView[]; closeHref: string }) { void props; return null; }
