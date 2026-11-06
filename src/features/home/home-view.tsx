// T066 / FR-040–FR-042, FR-045; US-5.1, US-5.2, US-5.4, US-5.7; 04·1 INICIO · YO sin los bloques compartidos (Q5) y el
// escritorio de 04·7 sin los módulos compartidos. Un solo número héroe: el gasto del mes (handoff, «Auditoría anti-slop»).
// Nada de presupuesto, «restante», «excedido», «te alcanza» ni barras de límite (FR-041; DEC-R01, DEC-R17). Los
// ingresos no se restan ni se suman al gasto (FR-019): aparecen como filas, nunca en el héroe ni en el desglose.
// Totales y desglose por el dominio (research R8.9); las filas vienen de la vista my_transactions. P0-1, PR D (E5): el
// total cuenta hacia arriba al guardar y la fila nueva queda resaltada.
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { categories } from "@/components/ui/category-icon";
import { ExitState } from "@/components/shell/provisional-state";
import type { Money } from "@/domain/money";
import { groupByDay, monthSummary, type CategoryId, type Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel, daysLeftInMonth, longDate, monthName, pesos } from "@/lib/format";
import { CountingAmount } from "@/features/expenses/counting-amount";
import { HighlightRow } from "@/features/expenses/highlight-row";
import { AnnotateCta, AnnotateFirst } from "./annotate-cta";
import { HomeEmpty, PendingHomeRows } from "./pending-home";

const RECENT = 5;
// El ancho de cada ficha del desglose crece con su importe (en pesos), como en 04·1.
const weight = (amount: Money) => Number(amount.amountMinor) / 100;
// Fondos de categoría como clases estáticas (Tailwind no ve clases compuestas en tiempo de ejecución).
const tileBg: Record<CategoryId, string> = {
  market: "bg-category-market-bg", restaurants: "bg-category-restaurants-bg", home: "bg-category-home-bg", transport: "bg-category-transport-bg",
  health: "bg-category-health-bg", entertainment: "bg-category-entertainment-bg", shopping: "bg-category-shopping-bg",
  services: "bg-category-services-bg", income: "bg-category-income-bg", other: "bg-category-other-bg",
};
const categoryFg: Record<CategoryId, string> = {
  market: "text-category-market-fg", restaurants: "text-category-restaurants-fg", home: "text-category-home-fg", transport: "text-category-transport-fg",
  health: "text-category-health-fg", entertainment: "text-category-entertainment-fg", shopping: "text-category-shopping-fg",
  services: "text-category-services-fg", income: "text-category-income-fg", other: "text-category-other-fg",
};

type HomeViewProps = { rows: readonly Transaction[]; month: string; today: string };

export function HomeView({ rows, month, today }: HomeViewProps) {
  const name = monthName(month);
  const summary = monthSummary(rows, month);
  const recent = groupByDay(rows).flatMap(({ transactions }) => transactions).slice(0, RECENT);
  if (recent.length === 0) {
    return (
      <HomeEmpty month={month} today={today} empty={
        <div className="flex flex-col gap-6 pt-2">
          <ExitState icon="receipt" title={copy.home.empty.title} description={copy.home.empty.description} actions={<AnnotateFirst label={copy.home.empty.action} />} />
        </div>
      } />
    );
  }
  const spentBy = (Object.entries(summary.byCategory) as [CategoryId, NonNullable<(typeof summary.byCategory)[CategoryId]>][])
    .sort(([, a], [, b]) => (b.amountMinor > a.amountMinor ? 1 : b.amountMinor < a.amountMinor ? -1 : 0));
  const spent = summary.expenseTotal.amountMinor > 0n;
  const heroTitle = spent ? copy.home.spentIn(name) : copy.home.noExpenses(name);
  return (
    <div className="flex flex-col gap-6 pt-5 lg:gap-10 lg:pt-8">
      <section aria-labelledby="home-hero" className="flex flex-col gap-1.5 lg:gap-2.5">
        <p className="hidden text-[length:var(--body-s-size)] text-ink-secondary lg:block">{copy.home.dateLine(longDate(today), daysLeftInMonth(today))}</p>
        <h2 id="home-hero" className="font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] text-ink lg:text-[length:var(--display-l-size)] lg:leading-[var(--display-l-line)] lg:tracking-[var(--display-l-tracking)]">
          {heroTitle}
        </h2>
        {spent ? (
          <CountingAmount amountMinor={summary.expenseTotal.amountMinor.toString()} className="text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink lg:text-[length:var(--money-xl-size)] lg:tracking-[var(--money-xl-tracking)]" />
        ) : null}
      </section>
      <AnnotateCta />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
        {spentBy.length > 0 ? (
          <section aria-labelledby="home-breakdown" className="flex flex-col gap-3 lg:order-2 lg:rounded-[var(--radius-xl)] lg:p-5 lg:shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
            <h2 id="home-breakdown" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.home.breakdownTitle}</h2>
            <ul className="flex flex-wrap gap-2">
              {spentBy.map(([category, amount]) => (
                <li
                  key={category}
                  aria-label={copy.activity.categoryChip(copy.categories[category], pesos(amount))}
                  style={{ flexGrow: weight(amount) }}
                  className={`flex min-h-[88px] min-w-[100px] basis-[100px] flex-col justify-between gap-1.5 rounded-[16px] px-3 py-2.5 ${tileBg[category]}`}
                >
                  <span aria-hidden="true" className="flex min-w-0 flex-col items-start gap-1 text-[length:var(--label-s-size)] font-semibold text-ink">
                    <AppIcon name={categories[category].icon} weight="duotone" size={18} className={categoryFg[category]} />
                    <span className="max-w-full truncate">{copy.categories[category]}</span>
                  </span>
                  <span aria-hidden="true" className="text-[13px] font-semibold text-ink">{pesos(amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section aria-labelledby="home-recent" className="flex flex-col gap-1 lg:order-1">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <h2 id="home-recent" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.home.recentTitle}</h2>
            <Link href={`/actividad?mes=${month}`} className="inline-flex min-h-11 items-center text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4">{copy.home.seeAll}</Link>
          </div>
          <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
            <PendingHomeRows month={month} today={today} />
            {recent.map((transaction) => (
              <li key={transaction.id}>
                <HighlightRow transaction={transaction} href={`/actividad/${transaction.id}?mes=${month}`} dateLabel={dayLabel(transaction.transactionDate, today)} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
