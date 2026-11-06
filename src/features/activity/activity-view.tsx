"use client";
// T067 / FR-046–FR-049; US-6.1–6.6; 04·1 ACTIVIDAD, 04·6 SIN ACTIVIDAD y 04·7 (tabla de 1440 sin «Pagó · Reparto»).
// El mes vive en la URL (`?mes=AAAA-MM`, research R8.7). Flechas de mes anterior y siguiente (Q8) con los límites del
// dominio (Q13): se aprueban viendo la pantalla. El resumen del mes es la única cifra grande; su desglose por categoría
// es a la vez el filtro de categoría. Búsqueda sin tildes y filtro de tipo en cliente (research R8.9).
// Por debajo de 1280, lista por día con ExpenseRow; desde 1280, la tabla de 04·7 (RESPONSIVE_SPECIFICATIONS.md:
// «Actividad en modo maestro-detalle desde 1280»).
import Link from "next/link";
import { useId } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExpenseRow, rowTitle, signedAmount } from "@/components/ui/expense-row";
import { Segmented } from "@/components/ui/segmented";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { filterTransactions, groupByDay, monthSummary, type CategoryId, type Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthName, monthTitle, pesos, shortDate } from "@/lib/format";
import { AnnotateFirst } from "@/features/home/annotate-cta";
import { useActivityFilters, type ActivityFilters } from "./activity-filters";

export type MonthNavigation = { previous: string | null; next: string | null };
type ActivityViewProps = { rows: readonly Transaction[]; month: string; today: string; navigation: MonthNavigation; selectedId?: string };

const detailHref = (id: string, month: string) => `/actividad/${id}?mes=${month}`;
const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary";

function MonthArrow({ target, direction }: { target: string | null; direction: "previous" | "next" }) {
  const icon = direction === "previous" ? "caret-left" : "caret-right";
  const box = "grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]";
  if (!target) {
    // Sin mes al que ir: el control sigue en su sitio (sin saltos de layout) y se presenta desactivado.
    return <span aria-hidden="true" className={`${box} text-ink-secondary opacity-40`}><AppIcon name={icon} weight="bold" size={20} /></span>;
  }
  const label = monthTitle(target);
  return (
    <Link href={`/actividad?mes=${target}`} aria-label={direction === "previous" ? copy.activity.previousMonth(label) : copy.activity.nextMonth(label)} className={`${box} bg-raised text-ink shadow-raised hover:bg-sunken`}>
      <AppIcon name={icon} weight="bold" size={20} />
    </Link>
  );
}

function MonthNav({ month, navigation }: { month: string; navigation: MonthNavigation }) {
  return (
    // Las flechas quedan en los extremos de la fila: no se mueven con el largo del nombre del mes ni con el texto al 200 %.
    <div className="flex items-center gap-2 xl:max-w-[360px]">
      <MonthArrow target={navigation.previous} direction="previous" />
      <p className="min-w-0 flex-1 text-center font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink" aria-live="polite">{monthTitle(month)}</p>
      <MonthArrow target={navigation.next} direction="next" />
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-sunken px-[14px] text-[length:var(--body-m-size)] text-ink shadow-[var(--comp-field-inset)] focus-within:outline-[length:var(--border-focus)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus focus-within:outline-solid">
      <AppIcon name="magnifying-glass" size={18} className="shrink-0 text-ink-secondary" />
      <span id={id} className="sr-only">{copy.activity.searchLabel}</span>
      <input
        type="search"
        aria-labelledby={id}
        value={value}
        placeholder={copy.activity.searchPlaceholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent font-medium placeholder:text-[var(--comp-field-muted-fg)] focus-visible:outline-none"
      />
    </label>
  );
}

function Summary({ rows, month, filters, onCategory }: { rows: readonly Transaction[]; month: string; filters: ActivityFilters; onCategory: (category: CategoryId | null) => void }) {
  const summary = monthSummary(rows, month);
  const titleId = useId();
  const categories = (Object.entries(summary.byCategory) as [CategoryId, NonNullable<(typeof summary.byCategory)[CategoryId]>][])
    .sort(([, a], [, b]) => (b.amountMinor > a.amountMinor ? 1 : b.amountMinor < a.amountMinor ? -1 : 0));
  const spent = summary.expenseTotal.amountMinor > 0n;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="flex flex-col gap-0.5">
          <span id={titleId} className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.spentIn(monthName(month))}</span>
          <span className="text-[length:var(--money-m-size)] leading-[var(--money-m-line)] font-semibold tracking-[var(--money-m-tracking)] text-ink">
            {spent ? formatMoney(summary.expenseTotal) : copy.home.noExpenses(monthName(month))}
          </span>
        </p>
        <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.count(rows.length)}</span>
      </div>
      {categories.length > 0 ? (
        <div role="group" aria-label={copy.activity.categoryFilter} className="flex flex-wrap gap-1.5">
          {categories.map(([category, amount]) => {
            const pressed = filters.categoryId === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={pressed}
                aria-label={copy.activity.categoryChip(copy.categories[category], pesos(amount))}
                onClick={() => onCategory(pressed ? null : category)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[13px] font-semibold text-ink motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${pressed ? "bg-sunken shadow-[inset_0_0_0_2px_var(--color-text-primary)]" : "shadow-[0_0_0_1.5px_var(--color-border-subtle)] hover:bg-sunken"}`}
              >
                <CategoryIcon kind="category" category={category} size="sm" />
                <span aria-hidden="true">{copy.categories[category]}</span>
                <span aria-hidden="true" className="font-medium text-ink-secondary">{pesos(amount)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function DayList({ rows, month, today, selectedId }: { rows: readonly Transaction[]; month: string; today: string; selectedId?: string }) {
  return (
    <div className="flex flex-col gap-4 xl:hidden">
      {groupByDay(rows).map(({ date, transactions }) => {
        const label = dayLabel(date, today);
        const spent = transactions.reduce((total, row) => (row.type === "expense" ? total + row.amount.amountMinor : total), 0n);
        return (
          <section key={date} aria-labelledby={`day-${date}`} className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b-[length:var(--border-hairline)] border-border pb-1.5">
              <h2 id={`day-${date}`} className={overline}>{label === shortDate(date) ? label : `${label} · ${shortDate(date)}`}</h2>
              {spent > 0n ? <span aria-hidden="true" className={`${overline} tabular-nums`}>{pesos({ amountMinor: spent, currency: "COP" })}</span> : null}
            </div>
            <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <ExpenseRow transaction={transaction} href={detailHref(transaction.id, month)} dateLabel={label} current={transaction.id === selectedId} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Table({ rows, month, today, selectedId }: { rows: readonly Transaction[]; month: string; today: string; selectedId?: string }) {
  const sorted = groupByDay(rows).flatMap(({ transactions }) => transactions);
  const cell = "border-b-[length:var(--border-hairline)] border-border py-0";
  return (
    <table className="hidden w-full border-collapse text-left xl:table">
      <caption className="sr-only">{copy.activity.table.caption}</caption>
      <thead>
        <tr className={overline}>
          <th scope="col" className="pb-2.5 pl-[60px] font-semibold">{copy.activity.table.description}</th>
          <th scope="col" className="pb-2.5 font-semibold">{copy.activity.table.date}</th>
          <th scope="col" className="pb-2.5 pr-3 text-right font-semibold">{copy.activity.table.amount}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((transaction) => {
          const current = transaction.id === selectedId;
          return (
            <tr key={transaction.id} className={`group ${current ? "bg-sunken" : "hover:bg-sunken"}`}>
              <td className={`${cell} rounded-l-[14px]`}>
                <Link href={detailHref(transaction.id, month)} aria-current={current ? "page" : undefined} className="flex min-h-[54px] items-center gap-3.5 pl-3 text-[15px] font-semibold text-ink">
                  <CategoryIcon kind="category" category={transaction.categoryId} size="sm" />
                  <span className="truncate">{rowTitle(transaction)}</span>
                </Link>
              </td>
              <td className={`${cell} font-mono text-[13px] text-ink-secondary`}>{dayLabel(transaction.transactionDate, today)}</td>
              <td className={`${cell} rounded-r-[14px] pr-3 text-right text-[15px] font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-income" : "text-expense"}`}>{signedAmount(transaction)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ActivityView({ rows, month, today, navigation, selectedId }: ActivityViewProps) {
  const filters = useActivityFilters(month);
  const visible = filterTransactions(rows, { query: filters.query, type: filters.type === "all" ? undefined : filters.type, categoryId: filters.categoryId ?? undefined });
  const filtering = filters.query.trim() !== "" || filters.type !== "all" || filters.categoryId !== null;
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4 pt-5 lg:pt-8">
        <MonthNav month={month} navigation={navigation} />
        <ExitState icon="tray" title={copy.activity.empty.title} description={copy.activity.empty.description} actions={<AnnotateFirst label={copy.activity.empty.action} />} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-5 lg:gap-5 lg:pt-8">
      <div className="flex flex-col gap-3">
        <MonthNav month={month} navigation={navigation} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchField value={filters.query} onChange={filters.setQuery} />
          <Segmented
            role="radiogroup"
            label={copy.activity.type}
            value={filters.type}
            onValueChange={filters.setType}
            options={[{ value: "all", label: copy.activity.all }, { value: "expense", label: copy.activity.expenses }, { value: "income", label: copy.activity.incomes }] as const}
          />
        </div>
      </div>
      <Summary rows={rows} month={month} filters={filters} onCategory={(category) => filters.setCategory(category, month)} />
      <p aria-live="polite" className="sr-only">{filtering ? copy.activity.results(visible.length) : ""}</p>
      {visible.length === 0 ? (
        <ExitState
          icon="magnifying-glass"
          title={copy.activity.noResults.title}
          description={copy.activity.noResults.description}
          actions={<Button variant="secondary" onClick={filters.clear}>{copy.activity.noResults.clear}</Button>}
        />
      ) : (
        <>
          <DayList rows={visible} month={month} today={today} selectedId={selectedId} />
          <Table rows={visible} month={month} today={today} selectedId={selectedId} />
        </>
      )}
    </div>
  );
}
