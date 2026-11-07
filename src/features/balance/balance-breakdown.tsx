// T061 (spec 003, PR D) / FR-025, FR-042, FR-043, FR-047; US-5.6; Q9 (el saldo es acumulado; el desglose, por mes); 02·3
// «DESGLOSE · DE DÓNDE SALE EL SALDO»; COMPONENT_SPECIFICATIONS.md §SharedBalance, A11y («la tabla de desglose está
// disponible como alternativa»). Cada gasto compartido del mes con quién pagó, el reparto y la parte de cada uno. Las filas
// se leen por cursor (`couple_expenses`); el total del mes sale de `couple_month_summary` (una sola sentencia), nunca de
// sumar la lista (FR-043).
import type { ReactNode } from "react";
import { formatMoney } from "@/domain/money";
import { rowMode } from "@/features/shared/shared-format";
import { copy } from "@/lib/copy/es";
import { monthName } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";
import type { BalanceMember } from "./types";

type Props = { month: string; expenses: readonly SharedTransaction[]; members: readonly BalanceMember[]; totalMinor: string | null; navigation?: ReactNode };

export function BalanceBreakdown({ month, expenses, members, totalMinor, navigation }: Props) {
  const name = monthName(month);
  const ordered = [...members].sort((a, b) => a.joinOrder - b.joinOrder);
  const memberName = (userId: string) => members.find((member) => member.userId === userId)?.name ?? "";
  const cell = "align-top md:border-b-[length:var(--border-hairline)] md:border-border md:py-2.5";
  return (
    <section id="desglose" aria-labelledby="balance-breakdown-title" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="balance-breakdown-title" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.balance.breakdown.title(name)}</h2>
        {navigation}
      </div>
      {expenses.length === 0 ? (
        <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.balance.breakdown.empty(name)}</p>
      ) : (
        // Por debajo de 768 cada fila se apila (gasto e importe; quién pagó y el reparto; la parte de cada uno, con su
        // inicial), como el desglose de 02·3. Los roles explícitos conservan la tabla para los lectores aunque cambie el display.
        <table role="table" className="block w-full border-collapse text-left text-[13px] tabular-nums md:table">
          <caption className="sr-only">{copy.balance.breakdown.caption(name)}</caption>
          <thead role="rowgroup" className="sr-only md:not-sr-only md:table-header-group">
            <tr role="row" className="text-[11px] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase">
              <th role="columnheader" scope="col" className="pr-2 pb-2 font-semibold">{copy.balance.breakdown.expense}</th>
              <th role="columnheader" scope="col" className="pr-2 pb-2 font-semibold">{copy.balance.breakdown.payer}</th>
              {ordered.map((member) => <th role="columnheader" key={member.userId} scope="col" className="pr-2 pb-2 text-right font-semibold">{copy.balance.breakdown.partOf(member.name)}</th>)}
              <th role="columnheader" scope="col" className="pb-2 text-right font-semibold">{copy.balance.breakdown.amount}</th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="block md:table-row-group">
            {expenses.map((row) => (
              <tr role="row" key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b-[length:var(--border-hairline)] border-border py-2.5 md:table-row md:border-0 md:py-0">
                <th role="rowheader" scope="row" className={`${cell} order-1 block min-w-0 pr-2 font-semibold break-words text-ink md:table-cell`}>{row.description ?? copy.categories[row.categoryId]}</th>
                <td role="cell" className={`${cell} order-3 col-span-2 block pr-2 text-ink-secondary md:table-cell`}>{copy.shared.row.table(memberName(row.payerUserId), rowMode(row))}</td>
                {ordered.map((member, index) => (
                  <td role="cell" key={member.userId} className={`${cell} ${index === 0 ? "order-4" : "order-5 text-right"} block pr-2 whitespace-nowrap text-ink md:table-cell md:text-right`}>
                    <span aria-hidden="true" className="mr-1 text-ink-secondary md:hidden">{member.name.charAt(0)}</span>
                    {formatMoney(row.allocations.find((part) => part.userId === member.userId)?.amount ?? { amountMinor: 0n, currency: "COP" })}
                  </td>
                ))}
                <td role="cell" className={`${cell} order-2 block text-right font-semibold whitespace-nowrap text-ink md:table-cell`}>{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          {totalMinor ? (
            <tfoot role="rowgroup" className="block md:table-footer-group">
              <tr role="row" className="flex items-baseline justify-between gap-3 md:table-row">
                <th role="rowheader" scope="row" colSpan={2 + ordered.length} className="block pt-2.5 pr-2 text-[13px] font-semibold text-ink md:table-cell">{copy.balance.breakdown.total}</th>
                <td role="cell" className="block pt-2.5 text-right text-[15px] font-semibold whitespace-nowrap text-ink md:table-cell">{formatMoney({ amountMinor: BigInt(totalMinor), currency: "COP" })}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      )}
    </section>
  );
}
