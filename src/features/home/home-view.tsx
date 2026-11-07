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
import { formatMoney, type Money } from "@/domain/money";
import { groupByDay, monthSummary, type CategoryId, type Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel, daysLeftInMonth, longDate, monthName, pesos } from "@/lib/format";
import { CountingAmount } from "@/features/expenses/counting-amount";
import { HighlightRow } from "@/features/expenses/highlight-row";
import { AnnotateCta, AnnotateFirst } from "./annotate-cta";
import { HomeEmpty, HomeScope, PendingHomeRows } from "./pending-home";

const RECENT = 5;
// El ancho de cada ficha del desglose crece con su importe (en pesos), como en 04·1.
const weight = (amount: Money) => Number(amount.amountMinor) / 100;
// Fondos de categoría como clases estáticas (Tailwind no ve clases compuestas en tiempo de ejecución).
export const tileBg: Record<CategoryId, string> = {
  market: "bg-category-market-bg", restaurants: "bg-category-restaurants-bg", home: "bg-category-home-bg", transport: "bg-category-transport-bg",
  health: "bg-category-health-bg", entertainment: "bg-category-entertainment-bg", shopping: "bg-category-shopping-bg",
  services: "bg-category-services-bg", income: "bg-category-income-bg", other: "bg-category-other-bg",
};
export const categoryFg: Record<CategoryId, string> = {
  market: "text-category-market-fg", restaurants: "text-category-restaurants-fg", home: "text-category-home-fg", transport: "text-category-transport-fg",
  health: "text-category-health-fg", entertainment: "text-category-entertainment-fg", shopping: "text-category-shopping-fg",
  services: "text-category-services-fg", income: "text-category-income-fg", other: "text-category-other-fg",
};

/**
 * PR C de la 003 (T048; FR-045; US-4): con la pareja activa, Yo enseña `gasto_consumo`: sus privados más su parte de lo
 * compartido (`me_month_summary`, una sola sentencia), con «Solo tuyos» y «Tu parte compartida», y las filas compartidas
 * con «Compartido · tu parte $X» y el importe completo (`my_shared_parts`). Nunca se suma Yo + Nosotros.
 */
export type SharedPartRow = { id: string; transactionDate: string; categoryId: CategoryId; description: string | null; amount: Money; myPart: Money; payerUserId: string };
export type MeSummary = { privateMinor: string; sharedPartMinor: string; consumptionMinor: string; byCategory?: Partial<Record<CategoryId, string>> };
type HomeViewProps = { rows: readonly Transaction[]; month: string; today: string; shared?: { parts: readonly SharedPartRow[]; summary: MeSummary } };
type RecentItem = { kind: "private"; row: Transaction } | { kind: "shared"; row: SharedPartRow };

/** La fila de un gasto compartido en Yo: cuenta solo por la parte; el importe completo a la derecha (04·1 INICIO · YO). */
function SharedPartItem({ row, today }: { row: SharedPartRow; today: string }) {
  const title = row.description ?? copy.categories[row.categoryId];
  const date = dayLabel(row.transactionDate, today);
  return (
    <div data-shared-part="" className="grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2">
      <span className={`grid size-10 place-items-center rounded-[12px] ${tileBg[row.categoryId]}`}><AppIcon name={categories[row.categoryId].icon} weight="duotone" size={20} className={categoryFg[row.categoryId]} /></span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[1.3] font-semibold text-ink">{title}</span>
        <span className="flex min-w-0 items-center gap-1 text-[12px] leading-[1.35] text-ink-secondary">
          <AppIcon name="users-three" size={12} className="shrink-0" />
          <span className="truncate"><span>{copy.row.sharedPart(formatMoney(row.myPart))}</span>{` · ${date}`}</span>
        </span>
      </span>
      <span className="text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap text-expense">{formatMoney(row.amount)}</span>
    </div>
  );
}

export function HomeView({ rows, month, today, shared }: HomeViewProps) {
  const name = monthName(month);
  const summary = monthSummary(rows, month);
  const recentItems: RecentItem[] = [
    ...groupByDay(rows).flatMap(({ transactions }) => transactions).map((row) => ({ kind: "private" as const, row })),
    ...(shared?.parts ?? []).map((row) => ({ kind: "shared" as const, row })),
  ].sort((a, b) => (a.row.transactionDate === b.row.transactionDate ? 0 : a.row.transactionDate > b.row.transactionDate ? -1 : 1)).slice(0, RECENT);
  if (recentItems.length === 0) {
    return (
      <>
      <HomeScope month={month} knownIds={rows.map(({ id }) => id)} />
      <HomeEmpty month={month} today={today} empty={
        <div className="flex flex-col gap-6 pt-2">
          <ExitState icon="receipt" title={copy.home.empty.title} description={copy.home.empty.description} actions={<AnnotateFirst label={copy.home.empty.action} />} />
        </div>
      } />
      </>
    );
  }
  const byCategory = shared?.summary.byCategory
    ? Object.fromEntries(Object.entries(shared.summary.byCategory).map(([category, value]) => [category, { amountMinor: BigInt(value as string), currency: "COP" as const }]))
    : summary.byCategory;
  const spentBy = (Object.entries(byCategory) as [CategoryId, NonNullable<(typeof summary.byCategory)[CategoryId]>][])
    .sort(([, a], [, b]) => (b.amountMinor > a.amountMinor ? 1 : b.amountMinor < a.amountMinor ? -1 : 0));
  const heroMinor = shared ? BigInt(shared.summary.consumptionMinor) : summary.expenseTotal.amountMinor;
  const spent = heroMinor > 0n;
  const heroTitle = spent ? copy.home.spentIn(name) : copy.home.noExpenses(name);
  return (
    <div className="flex flex-col gap-6 pt-5 lg:gap-10 lg:pt-8">
      <HomeScope month={month} knownIds={rows.map(({ id }) => id)} />
      <section aria-labelledby="home-hero" className="flex flex-col gap-1.5 lg:gap-2.5">
        <p className="hidden text-[length:var(--body-s-size)] text-ink-secondary lg:block">{copy.home.dateLine(longDate(today), daysLeftInMonth(today))}</p>
        <h2 id="home-hero" className="font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] text-ink lg:text-[length:var(--display-l-size)] lg:leading-[var(--display-l-line)] lg:tracking-[var(--display-l-tracking)]">
          {heroTitle}
        </h2>
        {spent ? (
          <CountingAmount amountMinor={heroMinor.toString()} className="text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink lg:text-[length:var(--money-xl-size)] lg:tracking-[var(--money-xl-tracking)]" />
        ) : null}
        {shared ? (
          <div className="mt-1 flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.home.onlyYours}</p>
              <p className="text-[17px] font-semibold text-ink tabular-nums">{formatMoney({ amountMinor: BigInt(shared.summary.privateMinor), currency: "COP" })}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.home.sharedPart}</p>
              <p className="text-[17px] font-semibold text-ink tabular-nums">{formatMoney({ amountMinor: BigInt(shared.summary.sharedPartMinor), currency: "COP" })}</p>
            </div>
          </div>
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
            <PendingHomeRows month={month} today={today} knownIds={rows.map(({ id }) => id)} />
            {recentItems.map((item) => (
              <li key={`${item.kind}-${item.row.id}`}>
                {item.kind === "private"
                  ? <HighlightRow transaction={item.row} href={`/actividad/${item.row.id}?mes=${month}`} dateLabel={dayLabel(item.row.transactionDate, today)} />
                  : <SharedPartItem row={item.row} today={today} />}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
