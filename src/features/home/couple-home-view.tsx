// T048 (spec 003, PR C) / FR-037, FR-041, FR-044, FR-048, FR-049; US-3.1, US-3.2, US-3.6; interpretación I3; 04·1 INICIO ·
// NOSOTROS y el escritorio de 04·7, sin los bloques de metas ni «apartaron» (P0-3). Un solo número héroe: el gasto
// compartido del mes (`couple_month_summary`, una sola sentencia). El saldo de una línea («POR SALDAR · Tomás le debe a
// Sara $X · Ver balance») sale de `couple_balance`; desde 1024, el módulo de Balance del PR D. Nada privado de ninguno de los
// dos: todo lo que pinta llega de vistas de grupo. Nada de presupuesto, «restante», «excedido» ni «te alcanza».
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { categories } from "@/components/ui/category-icon";
import { ExitState } from "@/components/shell/provisional-state";
import type { MemberBalance } from "@/domain/balances";
import type { CategoryId } from "@/domain/transactions";
import { groupByDay } from "@/domain/transactions";
import { CountingAmount } from "@/features/expenses/counting-amount";
import { SharedRow } from "@/features/shared/shared-row";
import { copy } from "@/lib/copy/es";
import { HomeScope } from "./pending-home";
import { dayLabel, daysLeftInMonth, longDate, monthName, pesos } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";
import { AnnotateCta, AnnotateFirst } from "./annotate-cta";
import { BalanceLine } from "./balance-line";
import { BalancePanel } from "@/features/balance/balance-panel";
import { categoryFg, tileBg } from "./home-view";
import type { HomeGoals } from "@/features/goals/types";
import { GoalsModule, SetAsideLine } from "./goals-home";

export { BalanceLine } from "./balance-line";
export type CoupleMemberView = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };
export type CoupleMonthSummary = { totalMinor: string; count: number; byCategory: Partial<Record<CategoryId, string>> };
/** 004 PR C (T050; FR-070): lo apartado del mes y las metas compartidas; `undefined` mientras la lectura no existe o falló. */
type Props = { month: string; today: string; summary: CoupleMonthSummary | null; balance: readonly MemberBalance[]; rows: readonly SharedTransaction[]; members: readonly CoupleMemberView[]; goals?: HomeGoals };

const RECENT = 5;

export function CoupleHomeView({ month, today, summary, balance, rows, members, goals }: Props) {
  const name = monthName(month);
  const recent = groupByDay(rows).flatMap(({ transactions }) => transactions).slice(0, RECENT);
  // Sin ningún gasto compartido en la pareja (saldo sin movimiento y mes vacío): 04·6, nunca «Al día $0».
  const nothingYet = rows.length === 0 && balance.every((row) => row.paid.amountMinor === 0n && row.settledOut.amountMinor === 0n);
  // F69-5 (revisión del PR #69): Inicio de Nosotros monta su mes y avisa de los ids que trae, como Inicio de Yo; E5 decide
  // por ellos si la fila recién anotada puede estar aquí.
  const scope = <HomeScope month={month} knownIds={rows.map((row) => row.id)} contexts={["us"]} />;
  if (nothingYet) {
    return (
      <div className="flex flex-col gap-6 pt-2">
        {scope}
        <ExitState icon="users-three" title={copy.couple.home.empty.title} description={copy.couple.home.empty.description} actions={<AnnotateFirst label={copy.couple.home.empty.action} />} />
        {/* 004 PR C: sin gastos compartidos, las metas siguen aquí (el ahorro no depende del gasto). */}
        {goals ? <div className="flex flex-col gap-6 lg:max-w-[560px]"><SetAsideLine goals={goals} context="us" /><GoalsModule goals={goals} context="us" today={today} /></div> : null}
      </div>
    );
  }
  const spentBy = (Object.entries(summary?.byCategory ?? {}) as [CategoryId, string][])
    .map(([category, value]) => [category, BigInt(value)] as const)
    .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0));
  const total = summary ? BigInt(summary.totalMinor) : 0n;
  return (
    <div className="flex flex-col gap-6 pt-5 lg:gap-10 lg:pt-8">
      {scope}
      <section aria-labelledby="couple-hero" className="flex flex-col gap-1.5 lg:gap-2.5">
        <p className="hidden text-[length:var(--body-s-size)] text-ink-secondary lg:block">{copy.home.dateLine(longDate(today), daysLeftInMonth(today))}</p>
        <h2 id="couple-hero" className="font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] text-ink lg:text-[length:var(--display-l-size)] lg:leading-[var(--display-l-line)] lg:tracking-[var(--display-l-tracking)]">
          {copy.couple.home.spentIn(name)}
        </h2>
        <CountingAmount amountMinor={total.toString()} className="text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink lg:text-[length:var(--money-xl-size)] lg:tracking-[var(--money-xl-tracking)]" />
      </section>
      {/* DEC-G04: el ahorro del mes, aparte del héroe y nunca sumado a él. */}
      {goals ? <div className="lg:-mt-4 lg:max-w-[560px]"><SetAsideLine goals={goals} context="us" /></div> : null}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6 lg:order-2">
          {/* PR D (T061; 04·7, RESPONSIVE «Shared Balance»): por debajo de 1024, la línea de saldo con «Ver balance»; desde
              1024, el módulo con barras de 16 px, «Desglose» y «Registrar liquidación». */}
          <div className="lg:hidden"><BalanceLine balance={balance} members={members} /></div>
          <div data-balance-line="" className="hidden lg:block"><BalancePanel balance={balance} members={members} today={today} variant="module" /></div>
          <AnnotateCta />
          {goals ? <GoalsModule goals={goals} context="us" today={today} /> : null}
          {spentBy.length > 0 ? (
            <section aria-labelledby="couple-breakdown" className="flex flex-col gap-3 lg:rounded-[var(--radius-xl)] lg:p-5 lg:shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
              <h2 id="couple-breakdown" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.home.breakdownTitle}</h2>
              <ul className="flex flex-wrap gap-2">
                {spentBy.map(([category, amountMinor]) => {
                  const amount = { amountMinor, currency: "COP" as const };
                  const grow = Number(amountMinor / 100n);
                  return (
                    <li key={category} aria-label={copy.activity.categoryChip(copy.categories[category], pesos(amount))} style={{ flexGrow: grow }} className={`flex min-h-[88px] min-w-[100px] basis-[100px] flex-col justify-between gap-1.5 rounded-[16px] px-3 py-2.5 ${tileBg[category]}`}>
                      <span aria-hidden="true" className="flex min-w-0 flex-col items-start gap-1 text-[length:var(--label-s-size)] font-semibold text-ink">
                        <AppIcon name={categories[category].icon} weight="duotone" size={18} className={categoryFg[category]} />
                        <span className="max-w-full truncate">{copy.categories[category]}</span>
                      </span>
                      <span aria-hidden="true" className="text-[13px] font-semibold text-ink">{pesos(amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
        <section aria-labelledby="couple-recent" className="flex flex-col gap-1 lg:order-1">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <h2 id="couple-recent" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.couple.home.recentTitle}</h2>
            <Link href={`/actividad?mes=${month}`} className="inline-flex min-h-11 items-center text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4">{copy.home.seeAll}</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-3 text-[length:var(--body-m-size)] text-ink-secondary">{copy.couple.home.empty.description}</p>
          ) : (
            <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
              {recent.map((row) => (
                <li key={row.id}><SharedRow row={row} members={members} href={`/actividad/${row.id}?mes=${month}`} dateLabel={dayLabel(row.transactionDate, today)} /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
