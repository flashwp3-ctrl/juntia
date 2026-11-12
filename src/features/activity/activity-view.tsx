"use client";
// T067 / FR-046–FR-049; US-6.1–6.6; 04·1 ACTIVIDAD, 04·6 SIN ACTIVIDAD y 04·7 (tabla de 1440 sin «Pagó · Reparto»).
// El mes vive en la URL (`?mes=AAAA-MM`, research R8.7). Flechas de mes anterior y siguiente (Q8) con los límites del
// dominio (Q13): se aprueban viendo la pantalla. El resumen del mes es la única cifra grande; su desglose por categoría
// es a la vez el filtro de categoría. Búsqueda sin tildes y filtro de tipo en cliente (research R8.9).
// Por debajo de 1280, lista por día con ExpenseRow; desde 1280, la tabla de 04·7 (RESPONSIVE_SPECIFICATIONS.md:
// «Actividad en modo maestro-detalle desde 1280»).
import Link from "next/link";
import { useId, useMemo } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExpenseRow, rowTitle, signedAmount } from "@/components/ui/expense-row";
import { Segmented } from "@/components/ui/segmented";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { filterTransactions, groupByDay, matchesSearch, monthKey, monthSummary, type CategoryId, type Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthName, monthTitle, pesos, shortDate } from "@/lib/format";
import { AnnotateFirst } from "@/features/home/annotate-cta";
import { useHighlightId, useListScope, usePendingRows } from "@/features/expenses/annotate-provider";
import type { PendingRow } from "@/features/expenses/types";
import { excludingFilters, useActivityFilters, type ActivityFilters } from "./activity-filters";
import { GoalEntryRow, entryTitle } from "@/features/goals/goal-entry-row";
import { FundingRowBadge, useFundingLookup } from "@/features/expenses/goal-funding/funding-context";
import { cop } from "@/features/goals/format";
import type { GoalEntryView, GoalPerson } from "@/features/goals/types";

export type MonthNavigation = { previous: string | null; next: string | null };
/** 004 PR C (T050; FR-044, FR-071): los asientos de metas propios del mes (`goal_activity` en Yo) y lo apartado del mes. */
type ActivityViewProps = { rows: readonly Transaction[]; month: string; today: string; navigation: MonthNavigation; selectedId?: string; goalEntries?: readonly GoalEntryView[]; goalPeople?: readonly GoalPerson[]; setAsideMinor?: string };

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

export function MonthNav({ month, navigation }: { month: string; navigation: MonthNavigation }) {
  return (
    // Las flechas quedan en los extremos de la fila: no se mueven con el largo del nombre del mes ni con el texto al 200 %.
    <div className="flex items-center gap-2 xl:max-w-[360px]">
      <MonthArrow target={navigation.previous} direction="previous" />
      <p className="min-w-0 flex-1 text-center font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink" aria-live="polite">{monthTitle(month)}</p>
      <MonthArrow target={navigation.next} direction="next" />
    </div>
  );
}

export function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

function Summary({ rows, month, filters, onCategory, setAsideMinor }: { rows: readonly Transaction[]; month: string; filters: ActivityFilters; onCategory: (category: CategoryId | null) => void; setAsideMinor?: string }) {
  const summary = monthSummary(rows, month);
  const titleId = useId();
  const categories = (Object.entries(summary.byCategory) as [CategoryId, NonNullable<(typeof summary.byCategory)[CategoryId]>][])
    .sort(([, a], [, b]) => (b.amountMinor > a.amountMinor ? 1 : b.amountMinor < a.amountMinor ? -1 : 0));
  const spent = summary.expenseTotal.amountMinor > 0n;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="flex flex-col gap-0.5">
            <span id={titleId} className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.spentIn(monthName(month))}</span>
            <span className="text-[length:var(--money-m-size)] leading-[var(--money-m-line)] font-semibold tracking-[var(--money-m-tracking)] text-ink">
              {spent ? formatMoney(summary.expenseTotal) : copy.home.noExpenses(monthName(month))}
            </span>
          </p>
          {/* 004 PR C (DEC-G04): lo apartado del mes va al lado del gasto, nunca dentro. */}
          {setAsideMinor !== undefined && BigInt(setAsideMinor) > 0n ? (
            <p data-set-aside="" className="flex flex-col gap-0.5">
              <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.goals.activity.setAside}</span>
              <span className="text-[17px] leading-[var(--money-m-line)] font-semibold text-saving tabular-nums">{cop(setAsideMinor)}</span>
            </p>
          ) : null}
        </span>
        <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.count(rows.length)}</span>
      </div>
      {categories.length > 0 ? (
        <div role="group" aria-label={copy.activity.categoryFilter} className="flex gap-1.5 max-md:-mx-4 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:-my-1 max-md:px-4 max-md:py-1.5 max-md:[scrollbar-width:none] md:flex-wrap">
          {/* F16 (auditoría Impeccable, nov 2026): por debajo de 768 las fichas van en una fila con scroll horizontal, de borde a
              borde de la tarjeta, en vez de partirse una por línea y empujar la lista fuera de la primera pantalla. F78-2: el
              scroller recorta también en vertical; 6 px de relleno dejan sitio al anillo de foco (--border-focus + --focus-offset =
              4 px fuera de la ficha) y el margen negativo de 4 px conserva el alto de antes. */}
          {categories.map(([category, amount]) => {
            const pressed = filters.categoryId === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={pressed}
                onClick={() => onCategory(pressed ? null : category)}
                className={`group flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[13px] font-semibold text-ink motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${pressed ? "bg-sunken shadow-[inset_0_0_0_2px_var(--color-text-primary)]" : "shadow-[0_0_0_1.5px_var(--color-border-subtle)] hover:bg-sunken"}`}
              >
                {/* Nombre por texto oculto, no por aria-label (WCAG 2.5.3): «Transporte, 45.000 pesos». */}
                <span className="sr-only">{copy.activity.categoryChip(copy.categories[category], pesos(amount))}</span>
                <CategoryIcon kind="category" category={category} size="sm" />
                <span aria-hidden="true">{copy.categories[category]}</span>
                <span aria-hidden="true" className={`font-medium ${pressed ? "text-ink" : "text-ink-secondary group-hover:text-ink"}`}>{pesos(amount)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/** Estado de cada creación en vuelo por id (UX lote 1, cambio 3): sus filas no son enlaces y dicen «Guardando…» o «Sin confirmar». */
type PendingStates = ReadonlyMap<string, PendingRow["state"]>;
/** Solo las que viajan se pintan «Guardando…»; las confirmadas son filas normales que aún no están en la lista del servidor. */
const savingOf = (pending: PendingStates, id: string) => (pending.get(id) === "saving" ? ("saving" as const) : undefined);

/** Desempate de asientos del mismo día: el más reciente primero y, con el mismo instante, por id (orden total estable). */
const byNewest = (a: GoalEntryView, b: GoalEntryView) => (a.createdAt !== b.createdAt ? (a.createdAt > b.createdAt ? -1 : 1) : a.id > b.id ? -1 : 1);
/**
 * 004 PR C: los días del mes con movimientos o asientos de metas, del más reciente al más antiguo. Interpretación (anotada en
 * evidence.md): dentro de un día, los asientos de metas van después de los gastos e ingresos, porque el total del día que
 * encabeza el grupo es solo gasto y el ahorro no se mezcla con él (DEC-G04). La lista y la tabla usan este mismo orden.
 */
function days(rows: readonly Transaction[], goals: readonly GoalEntryView[]) {
  const byDay = new Map<string, { transactions: Transaction[]; goals: GoalEntryView[] }>();
  for (const { date, transactions } of groupByDay(rows)) byDay.set(date, { transactions: [...transactions], goals: [] });
  for (const entry of goals) {
    const day = byDay.get(entry.effectiveDate) ?? { transactions: [], goals: [] };
    day.goals.push(entry);
    byDay.set(entry.effectiveDate, day);
  }
  return [...byDay].sort(([a], [b]) => (a > b ? -1 : 1)).map(([date, day]) => ({ date, ...day, goals: day.goals.sort(byNewest) }));
}

function DayList({ rows, month, today, selectedId, pending, goals, people }: { rows: readonly Transaction[]; month: string; today: string; selectedId?: string; pending: PendingStates; goals: readonly GoalEntryView[]; people: readonly GoalPerson[] }) {
  const highlightId = useHighlightId();
  // 004 PR D (T064; FR-071): CON META en un privado pagado con una meta personal.
  const funding = useFundingLookup();
  return (
    <div className="flex flex-col gap-4 xl:hidden">
      {days(rows, goals).map(({ date, transactions, goals: dayGoals }) => {
        const label = dayLabel(date, today);
        // F51-2: el subtotal del día solo suma lo confirmado; las filas en vuelo o sin confirmar se listan, pero no cuentan.
        const spent = transactions.reduce((total, row) => (row.type === "expense" && !pending.has(row.id) ? total + row.amount.amountMinor : total), 0n);
        return (
          <section key={date} aria-labelledby={`day-${date}`} className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b-[length:var(--border-hairline)] border-border pb-1.5">
              <h2 id={`day-${date}`} className={overline}>{label === shortDate(date) ? label : `${label} · ${shortDate(date)}`}</h2>
              {spent > 0n ? <span aria-hidden="true" className={`${overline} tabular-nums`}>{pesos({ amountMinor: spent, currency: "COP" })}</span> : null}
            </div>
            <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <ExpenseRow transaction={transaction} href={detailHref(transaction.id, month)} dateLabel={label} current={transaction.id === selectedId} isNew={transaction.id === highlightId} pending={savingOf(pending, transaction.id)} temporary={pending.get(transaction.id) === "confirmed"} badge={funding(transaction.id)} />
                </li>
              ))}
              {dayGoals.map((entry) => <li key={entry.id}><GoalEntryRow entry={entry} people={people} dateLabel={label} variant="activity" /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Table({ rows, month, today, selectedId, pending, goals, people }: { rows: readonly Transaction[]; month: string; today: string; selectedId?: string; pending: PendingStates; goals: readonly GoalEntryView[]; people: readonly GoalPerson[] }) {
  const items = days(rows, goals).flatMap(({ transactions, goals: dayGoals }) => [
    ...transactions.map((transaction) => ({ kind: "transaction" as const, transaction })),
    ...dayGoals.map((entry) => ({ kind: "goal" as const, entry })),
  ]);
  const highlightId = useHighlightId();
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
        {items.map((item) => {
          if (item.kind === "goal") {
            const { entry } = item;
            // 004 PR C: el asiento de meta, con su ficha, en su lugar del orden; no cuenta en el gasto.
            return <tr key={entry.id} data-goal-row=""><td colSpan={3} className={`${cell} px-3`}><GoalEntryRow entry={entry} people={people} dateLabel={dayLabel(entry.effectiveDate, today)} variant="activity" /></td></tr>;
          }
          const { transaction } = item;
          const current = transaction.id === selectedId;
          return (
            // E5: la fila nueva se resalta también en la tabla de escritorio, como ExpenseRow.
            <tr key={transaction.id} data-new={transaction.id === highlightId ? "" : undefined} className={`group ${current ? "bg-sunken" : "hover:bg-sunken"} data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] data-[new]:motion-reduce:bg-saving-subtle`}>
              <td className={`${cell} rounded-l-[14px]`}>
                {savingOf(pending, transaction.id) ? (
                  <span data-pending="saving" aria-busy="true" data-transaction-id={transaction.id} className="flex min-h-[54px] items-center gap-3.5 pl-3 text-[15px] font-semibold text-ink">
                    <CategoryIcon kind="category" category={transaction.categoryId} size="sm" />
                    <span className="truncate">{rowTitle(transaction)}</span>
                    <span className="shrink-0 text-[12px] font-medium text-ink-secondary">{copy.row.pending.saving}</span>
                  </span>
                ) : (
                  <Link href={detailHref(transaction.id, month)} aria-current={current ? "page" : undefined} data-temp={pending.get(transaction.id) === "confirmed" ? "" : undefined} data-transaction-id={transaction.id} className="flex min-h-[54px] items-center gap-3.5 pl-3 text-[15px] font-semibold text-ink">
                    <CategoryIcon kind="category" category={transaction.categoryId} size="sm" />
                    <span className="truncate">{rowTitle(transaction)}</span>
                  </Link>
                )}
              </td>
              <td className={`${cell} font-mono text-[13px] ${current ? "text-ink" : "text-ink-secondary group-hover:text-ink group-data-[new]:text-ink"}`}>{dayLabel(transaction.transactionDate, today)}<FundingRowBadge transactionId={transaction.id} /></td>
              <td className={`${cell} rounded-r-[14px] pr-3 text-right text-[15px] font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-income" : "text-expense"}`}>{signedAmount(transaction)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ActivityView({ rows, month, today, navigation, selectedId, goalEntries = [], goalPeople = [], setAsideMinor }: ActivityViewProps) {
  const filters = useActivityFilters(month);
  // «Aportes» (FR-071) deja solo los asientos de metas; «Gastos» e «Ingresos», solo movimientos.
  // El tipo vive en el layout y se comparte entre contextos: «Aportes» solo vale si las metas se cargaron.
  const type = filters.type === "goals" && setAsideMinor === undefined ? "all" : filters.type;
  const goalsOnly = type === "goals";
  const txType = type === "all" || type === "goals" ? undefined : type;
  const visible = goalsOnly ? [] : filterTransactions(rows, { query: filters.query, type: txType, categoryId: filters.categoryId ?? undefined });
  const visibleGoals = filters.categoryId !== null || txType ? [] : goalEntries.filter((entry) => matchesSearch(entryTitle(entry, "activity"), filters.query));
  const filtering = filters.query.trim() !== "" || type !== "all" || filters.categoryId !== null;
  // Las creaciones en vuelo de este mes entran en la lista (con los mismos filtros), no en el resumen: ese espera a la revalidación.
  // Una fila ya confirmada se esconde en cuanto la lista trae la real: nunca las dos (F51-8).
  const known = new Set(rows.map(({ id }) => id));
  const listedIds = useMemo(() => rows.map(({ id }) => id), [rows]);
  // #54: los movimientos que la lista trae y los filtros dejan fuera; E5 quita solo los filtros que excluyen el recién guardado.
  const visibleIds = new Set(visible.map(({ id }) => id));
  useListScope(month, listedIds, ["me"], {
    hidden: rows.filter(({ id }) => !visibleIds.has(id)).map(({ id }) => id),
    unhide: (id) => {
      const row = rows.find((candidate) => candidate.id === id);
      if (row) filters.reveal(excludingFilters(row, { query: filters.query, type, categoryId: filters.categoryId }));
    },
  });
  const inFlight = usePendingRows().filter(({ transaction, savedId }) => monthKey(transaction.transactionDate) === month && !(savedId && known.has(savedId)));
  // Una fila ya confirmada se muestra como lo que es: la fila real (con su id y su detalle), sin «Guardando…» (F51-12).
  const shown = (row: (typeof inFlight)[number]) => (row.savedId ? { ...row.transaction, id: row.savedId } : row.transaction);
  const pendingStates: PendingStates = new Map(inFlight.map((row) => [shown(row).id, row.state]));
  const listed = [...(goalsOnly ? [] : filterTransactions(inFlight.map(shown), { query: filters.query, type: txType, categoryId: filters.categoryId ?? undefined })), ...visible];
  if (rows.length === 0 && inFlight.length === 0 && goalEntries.length === 0) {
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
            value={type}
            onValueChange={filters.setType}
            options={setAsideMinor !== undefined
              ? [{ value: "all", label: copy.activity.all }, { value: "expense", label: copy.activity.expenses }, { value: "income", label: copy.activity.incomes }, { value: "goals", label: copy.goals.activity.filter }] as const
              : [{ value: "all", label: copy.activity.all }, { value: "expense", label: copy.activity.expenses }, { value: "income", label: copy.activity.incomes }] as const}
          />
        </div>
      </div>
      <Summary rows={rows} month={month} filters={filters} onCategory={(category) => filters.setCategory(category, month)} setAsideMinor={setAsideMinor} />
      <p aria-live="polite" className="sr-only">{filtering ? copy.activity.results(listed.length + visibleGoals.length) : ""}</p>
      {listed.length === 0 && visibleGoals.length === 0 ? (
        <ExitState
          icon="magnifying-glass"
          title={copy.activity.noResults.title}
          description={copy.activity.noResults.description}
          actions={<Button variant="secondary" onClick={filters.clear}>{copy.activity.noResults.clear}</Button>}
        />
      ) : (
        <>
          <DayList rows={listed} month={month} today={today} selectedId={selectedId} pending={pendingStates} goals={visibleGoals} people={goalPeople} />
          <Table rows={listed} month={month} today={today} selectedId={selectedId} pending={pendingStates} goals={visibleGoals} people={goalPeople} />
        </>
      )}
    </div>
  );
}
