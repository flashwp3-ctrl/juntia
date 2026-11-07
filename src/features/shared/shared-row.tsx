"use client";
// T048, T049 (spec 003, PR C) / FR-044, FR-046; US-3.4; 04·1 (Recientes y ACTIVIDAD en Nosotros) y 04·7. La fila de un gasto
// compartido: el avatar de quien pagó (color, patrón e inicial por orden de ingreso), la descripción, «Pagó Tomás · 50/50 ·
// hoy» (y «movido desde Yo» para su autora) y el importe completo. Toda la fila es un enlace al detalle con el nombre
// accesible completo; lo visible queda fuera del árbol accesible (WCAG 2.5.3, como ExpenseRow). La liquidación es otra
// variante: ficha de contorno y «Liquidado · no es un gasto», sin enlace en el PR C (su detalle llega con el PR D).
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { CategoryIcon } from "@/components/ui/category-icon";
import { initialOf } from "@/domain/account";
import { formatMoney } from "@/domain/money";
import type { Settlement } from "@/domain/balances";
import { useHighlightId } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { pesos } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";
import { memberName, rowMode, type MemberRef } from "./shared-format";

export type { MemberRef } from "./shared-format";

type SharedRowProps = { row: SharedTransaction; members: readonly MemberRef[]; href: string; dateLabel: string; current?: boolean };

export function SharedRow({ row, members, href, dateLabel, current = false }: SharedRowProps) {
  const highlightId = useHighlightId();
  const payer = members.find((member) => member.userId === row.payerUserId);
  const title = row.description ?? copy.categories[row.categoryId];
  const meta = copy.shared.row.meta(payer?.name ?? "", rowMode(row));
  const moved = row.movedFromMe ? ` · ${copy.move.movedFromMe}` : "";
  const name = copy.shared.row.accessibleName({ title, amount: pesos(row.amount), category: copy.categories[row.categoryId], date: dateLabel, meta: meta + moved });
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      data-transaction-id={row.id}
      data-new={row.id === highlightId ? "" : undefined}
      className="group grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] py-2 aria-[current=page]:bg-sunken hover:bg-sunken data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] data-[new]:motion-reduce:bg-saving-subtle"
    >
      <span className="sr-only">{name}</span>
      <CategoryIcon kind="category" category={row.categoryId} />
      <span aria-hidden="true" className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[1.3] font-semibold text-ink">{title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.35] text-ink-secondary group-hover:text-ink group-aria-[current=page]:text-ink group-data-[new]:text-ink">
          {payer ? <Avatar person={payer.joinOrder} initial={initialOf(payer.name)} size={16} /> : null}
          <span className="truncate"><span>{meta}</span>{moved}{` · ${dateLabel}`}</span>
        </span>
      </span>
      <span aria-hidden="true" data-row-amount="" className="text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap text-expense">{formatMoney(row.amount)}</span>
    </Link>
  );
}

/** La liquidación en Actividad (ExpenseRow, variante liquidación): ficha de contorno y «Liquidado · no es un gasto». */
export function SettlementRow({ settlement, members, dateLabel }: { settlement: Settlement & { id: string }; members: readonly MemberRef[]; dateLabel: string }) {
  const title = copy.shared.row.settlementTitle(memberName(members, settlement.fromUserId), memberName(members, settlement.toUserId));
  return (
    <div data-settlement-id={settlement.id} className={`grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2 ${settlement.status === "voided" ? "opacity-60" : ""}`}>
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-border-emphasis text-ink-secondary">
        <AppIcon name="arrows-left-right" size={18} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[1.3] font-semibold text-ink">{title}</span>
        <span className="truncate text-[12px] leading-[1.35] text-ink-secondary"><span>{copy.shared.row.settlement}</span>{` · ${dateLabel}`}</span>
      </span>
      <span className="text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap text-ink-secondary">{formatMoney(settlement.amount)}</span>
    </div>
  );
}
