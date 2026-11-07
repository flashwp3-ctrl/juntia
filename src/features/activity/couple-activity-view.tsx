"use client";
// T049 (spec 003, PR C) / FR-037, FR-042, FR-046; US-3.2, US-3.4–3.6; 04·1 ACTIVIDAD en Nosotros, 04·6 SIN ACTIVIDAD y la
// tabla de 1440 de 04·7 con «Pagó · Reparto». Los gastos compartidos y las liquidaciones del mes (`couple_expenses` y
// `couple_settlements`, por cursor), agrupados por día; cada gasto con «Pagó X · reparto» y cada liquidación con su ficha
// de contorno y «Liquidado · no es un gasto» (no cuenta en el total ni en las categorías, FR-029). Búsqueda sin tildes y
// filtro de categoría en cliente sobre lo compartido; nada privado llega aquí. Flechas de mes como en Yo
// (`couple_transaction_months`). Desde 1280, la tabla con el panel de detalle a la derecha (lo pone ActivityScreen).
import Link from "next/link";
import { useId, useMemo } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import type { Settlement } from "@/domain/balances";
import { formatMoney } from "@/domain/money";
import { matchesSearch, type CategoryId } from "@/domain/transactions";
import { AnnotateFirst } from "@/features/home/annotate-cta";
import type { CoupleMemberView } from "@/features/home/couple-home-view";
import { memberName, rowMode } from "@/features/shared/shared-format";
import { SettlementRow, SharedRow } from "@/features/shared/shared-row";
import { useHighlightId } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthName, pesos, shortDate } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";
import { MonthNav, SearchField, type MonthNavigation } from "./activity-view";
import { useActivityFilters } from "./activity-filters";

export type CoupleSettlementView = Settlement & { id: string; settlementDate: string; createdAt: string; note: string | null; version: number };
type Props = { expenses: readonly SharedTransaction[]; settlements: readonly CoupleSettlementView[]; month: string; today: string; navigation: MonthNavigation; members: readonly CoupleMemberView[]; selectedId?: string };
type Item = { kind: "expense"; date: string; createdAt: string; row: SharedTransaction } | { kind: "settlement"; date: string; createdAt: string; row: CoupleSettlementView };

const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary";
const detailHref = (id: string, month: string) => `/actividad/${id}?mes=${month}`;

export function CoupleActivityView({ expenses, settlements, month, today, navigation, members, selectedId }: Props) {
  const filters = useActivityFilters(month);
  const titleId = useId();
  const highlightId = useHighlightId();
  const filtering = filters.query.trim() !== "" || filters.categoryId !== null;
  const visibleExpenses = expenses.filter((row) => matchesSearch(row.description, filters.query) && (filters.categoryId === null || row.categoryId === filters.categoryId));
  const items: Item[] = useMemo(() => [
    ...visibleExpenses.map((row) => ({ kind: "expense" as const, date: row.transactionDate, createdAt: row.createdAt, row })),
    ...(filtering ? [] : settlements.map((row) => ({ kind: "settlement" as const, date: row.settlementDate, createdAt: row.createdAt, row }))),
  ].sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : a.createdAt > b.createdAt ? -1 : 1)), [visibleExpenses, settlements, filtering]);
  const total = expenses.reduce((sum, row) => sum + row.amount.amountMinor, 0n);
  const byCategory = new Map<CategoryId, bigint>();
  for (const row of expenses) byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0n) + row.amount.amountMinor);
  const chips = [...byCategory].sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0));

  if (expenses.length === 0 && settlements.length === 0) {
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
        <SearchField value={filters.query} onChange={filters.setQuery} />
      </div>
      <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="flex flex-col gap-0.5">
            <span id={titleId} className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.spentTogether(monthName(month))}</span>
            <span className="text-[length:var(--money-m-size)] leading-[var(--money-m-line)] font-semibold tracking-[var(--money-m-tracking)] text-ink">{formatMoney({ amountMinor: total, currency: "COP" })}</span>
          </p>
          <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.activity.count(expenses.length)}</span>
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
      <p aria-live="polite" className="sr-only">{filtering ? copy.activity.results(visibleExpenses.length) : ""}</p>
      {items.length === 0 ? (
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
                          : <SettlementRow settlement={item.row} members={members} dateLabel={label} />}
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
                if (item.kind === "settlement") {
                  return (
                    <tr key={item.row.id} className={item.row.status === "voided" ? "opacity-60" : undefined}>
                      <td className={`${cell} pl-3`}><span className="flex min-h-[54px] items-center gap-3.5 text-[15px] font-semibold text-ink">{copy.shared.row.settlementTitle(memberName(members, item.row.fromUserId), memberName(members, item.row.toUserId))}</span></td>
                      <td className={`${cell} text-[13px] text-ink-secondary`}>{copy.shared.row.settlement}</td>
                      <td className={`${cell} font-mono text-[13px] text-ink-secondary`}>{dayLabel(item.row.settlementDate, today)}</td>
                      <td className={`${cell} pr-3 text-right text-[15px] font-semibold whitespace-nowrap text-ink-secondary`}>{formatMoney(item.row.amount)}</td>
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
