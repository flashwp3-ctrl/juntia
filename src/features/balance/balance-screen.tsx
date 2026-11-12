// T061 (spec 003, PR D) / FR-025–FR-030, FR-042, FR-047; US-5, US-6; 04·2 BALANCE COMPARTIDO (móvil) y el destino de
// escritorio desde 1024 (§15.3). En móvil, una columna: SharedBalance con «Registrar liquidación» y «Desglose», el
// desglose del mes y las liquidaciones de ese mes. Desde 1024, dos columnas: el saldo a la izquierda; el desglose y las
// liquidaciones del mes a la derecha. Todo de vistas de grupo: nada privado (FR-037, FR-041).
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { SettlementRow } from "@/features/shared/shared-row";
import type { BalanceData } from "@/features/couple/shared-load";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthName, monthTitle } from "@/lib/format";
import { BalanceBreakdown } from "./balance-breakdown";
import { BalancePanel } from "./balance-panel";
import type { BalanceMember } from "./types";

const arrow = "grid size-11 place-items-center rounded-[var(--radius-md)] text-ink hover:bg-sunken";

function MonthArrows({ month, navigation }: Pick<BalanceData, "month" | "navigation">) {
  const link = (target: string | null, icon: "caret-left" | "caret-right") => {
    if (!target) return <span aria-hidden="true" className={`${arrow} opacity-40`}><AppIcon name={icon} weight="bold" size={18} /></span>;
    const label = icon === "caret-left" ? copy.activity.previousMonth(monthTitle(target)) : copy.activity.nextMonth(monthTitle(target));
    return (
      <Link href={`/balance?mes=${target}#desglose`} scroll={false} className={arrow}>
        <AppIcon name={icon} weight="bold" size={18} />
        <span className="sr-only">{label}</span>
      </Link>
    );
  };
  return (
    <nav aria-label={monthTitle(month)} className="flex items-center gap-1">
      {link(navigation.previous, "caret-left")}
      {link(navigation.next, "caret-right")}
    </nav>
  );
}

export function BalanceScreen({ data, members, today }: { data: BalanceData; members: readonly BalanceMember[]; today: string }) {
  return (
    // F12 (auditoría Impeccable, nov 2026): desde 1280, dos columnas iguales (6/12 – 6/12) para que la tabla del desglose,
    // de cinco columnas, se lea en una línea por gasto; de 1024 a 1279 se queda en 6/5.
    <div className="flex flex-col gap-9 pt-4 pb-6 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-12 lg:pt-8 xl:grid-cols-2">
      <div className="flex flex-col gap-9">
        <BalancePanel balance={data.balance} members={members} today={today} />
      </div>
      {/* El desglose y las liquidaciones son del mismo mes (Q9): las flechas los mueven a la vez. */}
      <div className="flex flex-col gap-9">
        <BalanceBreakdown month={data.month} expenses={data.expenses} members={members} totalMinor={data.totalMinor} navigation={<MonthArrows month={data.month} navigation={data.navigation} />} />
        <section aria-labelledby="settlements-title" className="flex flex-col gap-1">
          <h2 id="settlements-title" className="pb-1 font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.balance.settlements.title(monthName(data.month))}</h2>
          {data.settlements.length === 0 ? (
            <p className="py-2 text-[length:var(--body-m-size)] text-ink-secondary">{copy.balance.settlements.empty(monthName(data.month))}</p>
          ) : (
            <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
              {data.settlements.map((settlement) => (
                <li key={settlement.id}>
                  <SettlementRow settlement={settlement} members={members} dateLabel={dayLabel(settlement.settlementDate, today)} href={`/actividad/${settlement.id}?mes=${settlement.settlementDate.slice(0, 7)}`} />
                </li>
              ))}
            </ul>
          )}
          <p className="pt-2 text-[0.75rem] leading-[1.5] text-pretty text-ink-secondary">{copy.balance.settlements.note}</p>
        </section>
      </div>
    </div>
  );
}
