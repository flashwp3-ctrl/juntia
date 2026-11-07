// T061 (spec 003, PR D) / FR-025, FR-042, FR-043, FR-047; US-5.6; Q9 (el saldo es acumulado; el desglose, por mes); 02·3
// «DESGLOSE · DE DÓNDE SALE EL SALDO»; COMPONENT_SPECIFICATIONS.md §SharedBalance, A11y («la tabla de desglose está
// disponible como alternativa»). Cada gasto compartido del mes con quién pagó, el reparto y la parte de cada uno. Las filas
// se leen por cursor (`couple_expenses`); el total del mes sale de `couple_month_summary` (una sola sentencia), nunca de
// sumar la lista (FR-043). Por debajo de 768 la tabla puede desplazarse dentro de su caja: la página no.
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
  const cell = "border-b-[length:var(--border-hairline)] border-border py-2.5 align-top";
  return (
    <section id="desglose" aria-labelledby="balance-breakdown-title" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="balance-breakdown-title" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.balance.breakdown.title(name)}</h2>
        {navigation}
      </div>
      {expenses.length === 0 ? (
        <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.balance.breakdown.empty(name)}</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[320px] border-collapse text-left text-[13px] tabular-nums">
            <caption className="sr-only">{copy.balance.breakdown.caption(name)}</caption>
            <thead>
              <tr className="text-[11px] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase">
                <th scope="col" className="pr-2 pb-2 font-semibold">{copy.balance.breakdown.expense}</th>
                <th scope="col" className="pr-2 pb-2 font-semibold">{copy.balance.breakdown.payer}</th>
                {ordered.map((member) => <th key={member.userId} scope="col" className="pr-2 pb-2 text-right font-semibold">{copy.balance.breakdown.partOf(member.name)}</th>)}
                <th scope="col" className="pb-2 text-right font-semibold">{copy.balance.breakdown.amount}</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={`${cell} pr-2 font-semibold text-ink`}>{row.description ?? copy.categories[row.categoryId]}</th>
                  <td className={`${cell} pr-2 text-ink-secondary`}>{copy.shared.row.table(memberName(row.payerUserId), rowMode(row))}</td>
                  {ordered.map((member) => (
                    <td key={member.userId} className={`${cell} pr-2 text-right whitespace-nowrap text-ink`}>
                      {formatMoney(row.allocations.find((part) => part.userId === member.userId)?.amount ?? { amountMinor: 0n, currency: "COP" })}
                    </td>
                  ))}
                  <td className={`${cell} text-right font-semibold whitespace-nowrap text-ink`}>{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            {totalMinor ? (
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2 + ordered.length} className="pt-2.5 pr-2 text-[13px] font-semibold text-ink">{copy.balance.breakdown.total}</th>
                  <td className="pt-2.5 text-right text-[15px] font-semibold whitespace-nowrap text-ink">{formatMoney({ amountMinor: BigInt(totalMinor), currency: "COP" })}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </section>
  );
}
