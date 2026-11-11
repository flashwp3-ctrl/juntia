"use client";
// T049 (spec 003, PR C) / FR-037, FR-042, FR-046; US-3.2, US-3.4–3.6; 04·1 ACTIVIDAD en Nosotros, 04·6 SIN ACTIVIDAD y la
// tabla de 1440 de 04·7 con «Pagó · Reparto». Los gastos compartidos y las liquidaciones del mes (`couple_expenses` y
// `couple_settlements`, por cursor), agrupados por día; cada gasto con «Pagó X · reparto» y cada liquidación con su ficha
// de contorno y «Liquidado · no es un gasto» (no cuenta en el total ni en las categorías, FR-029). Búsqueda sin tildes y
// filtro de categoría en cliente sobre lo compartido; nada privado llega aquí. Flechas de mes como en Yo
// (`couple_transaction_months`). Desde 1280, la tabla con el panel de detalle a la derecha (lo pone ActivityScreen).
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import type { Settlement } from "@/domain/balances";
import { formatMoney } from "@/domain/money";
import { matchesSearch, type CategoryId } from "@/domain/transactions";
import { AnnotateFirst } from "@/features/home/annotate-cta";
import type { CoupleMemberView, CoupleMonthSummary } from "@/features/home/couple-home-view";
import { memberName, rowMode } from "@/features/shared/shared-format";
import { SettlementRow, SharedRow } from "@/features/shared/shared-row";
import { useHighlightId, useListScope } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthName, pesos, shortDate } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";
import { MonthNav, SearchField, type MonthNavigation } from "./activity-view";
import { Segmented } from "@/components/ui/segmented";
import { GoalEntryRow, entryTitle } from "@/features/goals/goal-entry-row";
import { FundingRowBadge } from "@/features/expenses/goal-funding/funding-context";
import { cop } from "@/features/goals/format";
import type { GoalEntryView } from "@/features/goals/types";
import { useActivityFilters } from "./activity-filters";

export type CoupleSettlementView = Settlement & { id: string; settlementDate: string; createdAt: string; note: string | null; version: number };
/** F57-2 (revisión del PR #57): `summary` es `couple_month_summary` del mes; el total, el desglose y el conteo salen de ahí (FR-043), nunca de sumar la lista paginada, que solo se pinta, se filtra y se busca. */
/** 004 PR C (T050; FR-044, FR-071): `goalEntries`, los asientos de metas compartidas del mes (`goal_activity`, por cursor), y
 * `setAsideMinor`, lo apartado del mes (`metric_months`): van aparte del gasto, nunca dentro de su total. */
type Props = { expenses: readonly SharedTransaction[]; settlements: readonly CoupleSettlementView[]; month: string; today: string; navigation: MonthNavigation; members: readonly CoupleMemberView[]; summary: CoupleMonthSummary | null; selectedId?: string; goalEntries?: readonly GoalEntryView[]; setAsideMinor?: string };
type Item = { kind: "expense"; date: string; createdAt: string; row: SharedTransaction } | { kind: "settlement"; date: string; createdAt: string; row: CoupleSettlementView }
  | { kind: "goal"; date: string; createdAt: string; row: GoalEntryView };

const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary";
const detailHref = (id: string, month: string) => `/actividad/${id}?mes=${month}`;

export function CoupleActivityView({ expenses, settlements, month, today, navigation, members, summary, selectedId, goalEntries = [], setAsideMinor }: Props) {
  const filters = useActivityFilters(month);
  const router = useRouter();
  const titleId = useId();
  const highlightId = useHighlightId();
  // F69-5: Actividad de Nosotros monta su mes y avisa de los ids que trae (E5 decide por ellos).
  const listedIds = useMemo(() => expenses.map((row) => row.id), [expenses]);
  useListScope(month, listedIds);
  // El tipo vive en el layout y se comparte con Yo: aquí no hay «Ingresos» (pasa a «Todos») y «Aportes» solo vale si las metas
  // se cargaron; si no, «Todos». El valor normalizado manda en el control, en el filtrado y en el anuncio del conteo.
  const type = filters.type === "income" || (filters.type === "goals" && setAsideMinor === undefined) ? "all" : filters.type;
  const goalsOnly = type === "goals";
  const filtering = filters.query.trim() !== "" || filters.categoryId !== null || type !== "all";
  const visibleExpenses = goalsOnly ? [] : expenses.filter((row) => matchesSearch(row.description, filters.query) && (filters.categoryId === null || row.categoryId === filters.categoryId));
  // Los asientos de metas no tienen categoría: con una categoría elegida o «Gastos» no se muestran; la búsqueda mira su título.
  const visibleGoals = filters.categoryId !== null || type === "expense" ? [] : goalEntries.filter((row) => matchesSearch(entryTitle(row, "activity"), filters.query));
  const items: Item[] = [
    ...visibleExpenses.map((row) => ({ kind: "expense" as const, date: row.transactionDate, createdAt: row.createdAt, row })),
    ...(filtering ? [] : settlements.map((row) => ({ kind: "settlement" as const, date: row.settlementDate, createdAt: row.createdAt, row }))),
    ...visibleGoals.map((row) => ({ kind: "goal" as const, date: row.effectiveDate, createdAt: row.createdAt, row })),
  ].sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : (a.kind === "goal") !== (b.kind === "goal") ? (a.kind === "goal" ? 1 : -1) : a.createdAt !== b.createdAt ? (a.createdAt > b.createdAt ? -1 : 1) : a.row.id > b.row.id ? -1 : 1));
  const total = summary ? BigInt(summary.totalMinor) : 0n;
  const chips = (Object.entries(summary?.byCategory ?? {}) as [CategoryId, string][]).map(([category, value]) => [category, BigInt(value)] as const)
    .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0));

  // F57-7 (revisión del PR #57): el vacío de 04·6 solo si el resumen tampoco tiene gastos. Si el resumen dice que hay y la
  // lista llegó vacía, se ve el resumen y la lista dice, sin cifras inventadas, que no se cargó.
  const stale = expenses.length === 0 && settlements.length === 0 && (summary?.count ?? 0) > 0;
  if (expenses.length === 0 && settlements.length === 0 && goalEntries.length === 0 && !stale) {
    return (
      <div className="flex flex-col gap-4 pt-5 lg:pt-8">
        <MonthNav month={month} navigation={navigation} />
        <ExitState icon="tray" title={copy.activity.coupleEmpty.title} description={copy.activity.coupleEmpty.description} actions={<AnnotateFirst label={copy.activity.coupleEmpty.action} />} />
      </div>
    );
  }

  const days = new Map<string, Item[]>();
  for (const item of items) days.set(item.date, [...(days.get(item.date) ?? []), item]);

  return (
    <div className="flex flex-col gap-4 pt-5 lg:gap-5 lg:pt-8">
      <div className="flex flex-col gap-3">
        <MonthNav month={month} navigation={navigation} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchField value={filters.query} onChange={filters.setQuery} />
          {setAsideMinor !== undefined ? (
            <Segmented role="radiogroup" label={copy.activity.type} value={type} onValueChange={filters.setType}
              options={[{ value: "all", label: copy.activity.all }, { value: "expense", label: copy.activity.expenses }, { value: "goals", label: copy.goals.activity.filter }] as const} />
          ) : null}
        </div>
      </div>
      <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <span className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="flex flex-col gap-0.5">
              <span id={titleId} className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{setAsideMinor !== undefined ? copy.goals.activity.spent(monthName(month)) : copy.activity.spentTogether(monthName(month))}</span>
              <span className="text-[length:var(--money-m-size)] leading-[var(--money-m-line)] font-semibold tracking-[var(--money-m-tracking)] text-ink">{formatMoney({ amountMinor: total, currency: "COP" })}</span>
            </p>
            {/* DEC-G04: lo apartado va al lado, nunca dentro del gasto. */}
            {setAsideMinor !== undefined && BigInt(setAsideMinor) > 0n ? (
              <p data-set-aside="" className="flex flex-col gap-0.5">
                <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.goals.activity.setAside}</span>
                <span className="text-[17px] leading-[var(--money-m-line)] font-semibold text-saving tabular-nums">{cop(setAsideMinor)}</span>
              </p>
            ) : null}
          </span>
          <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.count(summary?.count ?? 0)}</span>
        </div>
        {chips.length > 0 ? (
          <div role="group" aria-label={copy.activity.categoryFilter} className="flex flex-wrap gap-1.5">
            {chips.map(([category, amountMinor]) => {
              const pressed = filters.categoryId === category;
              const amount = { amountMinor, currency: "COP" as const };
              return (
                <button key={category} type="button" aria-pressed={pressed} onClick={() => filters.setCategory(pressed ? null : category, month)}
                  className={`group flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[13px] font-semibold text-ink motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${pressed ? "bg-sunken shadow-[inset_0_0_0_2px_var(--color-text-primary)]" : "shadow-[0_0_0_1.5px_var(--color-border-subtle)] hover:bg-sunken"}`}>
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
      <p aria-live="polite" className="sr-only">{filtering ? copy.activity.results(visibleExpenses.length + visibleGoals.length) : ""}</p>
      {stale ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-[16px] bg-sunken px-3.5 py-3 text-[13px] leading-[1.45] font-medium text-ink">
          <span>{copy.activity.coupleStale.text}</span>
          <Button variant="secondary" icon="arrow-clockwise" onClick={() => router.refresh()}>{copy.activity.coupleStale.action}</Button>
        </div>
      ) : items.length === 0 ? (
        <ExitState icon="magnifying-glass" title={copy.activity.noResults.title} description={copy.activity.noResults.description} actions={<Button variant="secondary" onClick={filters.clear}>{copy.activity.noResults.clear}</Button>} />
      ) : (
        <>
          <div className="flex flex-col gap-4 xl:hidden">
            {[...days].map(([date, dayItems]) => {
              const label = dayLabel(date, today);
              const spent = dayItems.reduce((sum, item) => (item.kind === "expense" ? sum + item.row.amount.amountMinor : sum), 0n);
              return (
                <section key={date} aria-labelledby={`couple-day-${date}`} className="flex flex-col">
                  <div className="flex items-baseline justify-between gap-3 border-b-[length:var(--border-hairline)] border-border pb-1.5">
                    <h2 id={`couple-day-${date}`} className={overline}>{label === shortDate(date) ? label : `${label} · ${shortDate(date)}`}</h2>
                    {spent > 0n ? <span aria-hidden="true" className={`${overline} tabular-nums`}>{pesos({ amountMinor: spent, currency: "COP" })}</span> : null}
                  </div>
                  <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
                    {dayItems.map((item) => (
                      <li key={item.row.id}>
                        {item.kind === "expense"
                          ? <SharedRow row={item.row} members={members} href={detailHref(item.row.id, month)} dateLabel={label} current={item.row.id === selectedId} />
                          : item.kind === "goal" ? <GoalEntryRow entry={item.row} people={members} dateLabel={label} variant="activity" />
                          : <SettlementRow settlement={item.row} members={members} dateLabel={label} href={detailHref(item.row.id, month)} current={item.row.id === selectedId} />}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <table className="hidden w-full border-collapse text-left xl:table">
            <caption className="sr-only">{copy.activity.table.caption}</caption>
            <thead>
              <tr className={overline}>
                <th scope="col" className="pb-2.5 pl-[60px] font-semibold">{copy.activity.table.description}</th>
                <th scope="col" className="pb-2.5 font-semibold">{copy.activity.table.paidSplit}</th>
                <th scope="col" className="pb-2.5 font-semibold">{copy.activity.table.date}</th>
                <th scope="col" className="pb-2.5 pr-3 text-right font-semibold">{copy.activity.table.amount}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cell = "border-b-[length:var(--border-hairline)] border-border py-0";
                if (item.kind === "goal") {
                  return (
                    <tr key={item.row.id}>
                      <td colSpan={4} className={`${cell} px-3`}><GoalEntryRow entry={item.row} people={members} dateLabel={dayLabel(item.row.effectiveDate, today)} variant="activity" /></td>
                    </tr>
                  );
                }
                if (item.kind === "settlement") {
                  return (
                    <tr key={item.row.id} className={item.row.id === selectedId ? "bg-sunken" : "hover:bg-sunken"}>
                      {/* PR D (T062): la liquidación lleva a su detalle, con «Anular»; anulada, sigue en el historial y lo dice. */}
                      <td className={`${cell} rounded-l-[14px]`}>
                        <Link href={detailHref(item.row.id, month)} aria-current={item.row.id === selectedId ? "page" : undefined} data-settlement-id={item.row.id} className="flex min-h-[54px] items-center gap-3.5 pl-3 text-[15px] font-semibold text-ink">
                          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-border-emphasis text-ink"><AppIcon name="arrows-left-right" size={15} /></span>
                          <span className={`truncate ${item.row.status === "voided" ? "line-through" : ""}`}>{copy.shared.row.settlementTitle(memberName(members, item.row.fromUserId), memberName(members, item.row.toUserId))}</span>
                        </Link>
                      </td>
                      <td className={`${cell} text-[13px] ${item.row.id === selectedId ? "text-ink" : "text-ink-secondary"}`}>{item.row.status === "voided" ? `${copy.shared.row.settlement} · ${copy.balance.settlements.voided}` : copy.shared.row.settlement}</td>
                      <td className={`${cell} font-mono text-[13px] ${item.row.id === selectedId ? "text-ink" : "text-ink-secondary"}`}>{dayLabel(item.row.settlementDate, today)}</td>
                      <td className={`${cell} rounded-r-[14px] pr-3 text-right text-[15px] font-semibold whitespace-nowrap ${item.row.id === selectedId ? "text-ink" : "text-ink-secondary"}`}>{formatMoney(item.row.amount)}</td>
                    </tr>
                  );
                }
                const row = item.row;
                const current = row.id === selectedId;
                return (
                  <tr key={row.id} data-new={row.id === highlightId ? "" : undefined} className={`group ${current ? "bg-sunken" : "hover:bg-sunken"} data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] data-[new]:motion-reduce:bg-saving-subtle`}>
                    <td className={`${cell} rounded-l-[14px]`}>
                      <Link href={detailHref(row.id, month)} aria-current={current ? "page" : undefined} data-transaction-id={row.id} className="flex min-h-[54px] items-center gap-3.5 pl-3 text-[15px] font-semibold text-ink">
                        <CategoryIcon kind="category" category={row.categoryId} size="sm" />
                        <span className="truncate">{row.description ?? copy.categories[row.categoryId]}</span>
                      </Link>
                    </td>
                    <td className={`${cell} text-[13px] ${current ? "text-ink" : "text-ink-secondary group-hover:text-ink"}`}>
                      {copy.shared.row.table(memberName(members, row.payerUserId), rowMode(row))}{row.movedFromMe ? ` · ${copy.move.movedFromMe}` : ""}
                      <FundingRowBadge transactionId={row.id} />
                    </td>
                    <td className={`${cell} font-mono text-[13px] ${current ? "text-ink" : "text-ink-secondary group-hover:text-ink"}`}>{dayLabel(row.transactionDate, today)}</td>
                    <td className={`${cell} rounded-r-[14px] pr-3 text-right text-[15px] font-semibold whitespace-nowrap text-expense`}>{formatMoney(row.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
