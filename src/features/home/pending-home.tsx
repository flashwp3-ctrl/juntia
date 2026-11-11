"use client";
// UX lote 1, cambio 3 / 04·1 INICIO. Inicio es de servidor; las creaciones en vuelo viven en el proveedor de Anotar (cliente).
// Estas dos piezas las pintan: arriba de «Últimos movimientos» y, en el primer gasto, en lugar del estado vacío. El gasto del
// mes y el desglose no las cuentan: esperan a la revalidación, que es la única que sabe si el servidor escribió.
import type { ReactNode } from "react";
import type { ContextChoice } from "@/lib/context-preference";
import { ExpenseRow } from "@/components/ui/expense-row";
import { monthKey } from "@/domain/transactions";
import { useHighlightId, useListScope, usePendingRows } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { dayLabel } from "@/lib/format";

function useMonthPending(month: string, knownIds: readonly string[]) {
  // Una fila ya confirmada se esconde en cuanto la lista trae la real: nunca las dos (F51-8).
  return usePendingRows().filter(({ transaction, savedId }) => monthKey(transaction.transactionDate) === month && !(savedId && knownIds.includes(savedId)));
}

/** Los `<li>` de las filas en vuelo del mes, para ir dentro de la lista de recientes. */
export function PendingHomeRows({ month, today, knownIds }: { month: string; today: string; knownIds: readonly string[] }) {
  const highlightId = useHighlightId();
  return useMonthPending(month, knownIds).map(({ key, state, transaction, savedId }) => (
    <li key={key}>
      {/* Confirmada: fila normal con su id real y su detalle, sin «Guardando…» (F51-12). */}
      {savedId
        ? <ExpenseRow transaction={{ ...transaction, id: savedId }} href={`/actividad/${savedId}?mes=${month}`} dateLabel={dayLabel(transaction.transactionDate, today)} isNew={highlightId === savedId} temporary />
        : <ExpenseRow transaction={transaction} href="" dateLabel={dayLabel(transaction.transactionDate, today)} pending={state === "saving" ? "saving" : undefined} />}
    </li>
  ));
}

/** El estado vacío de Inicio, salvo que ya haya una creación en vuelo: entonces, esa fila. */
export function HomeEmpty({ month, today, empty }: { month: string; today: string; empty: ReactNode }) {
  const pending = useMonthPending(month, []);
  if (pending.length === 0) return empty;
  return (
    <div className="flex flex-col gap-6 pt-5 lg:pt-8">
      <section aria-labelledby="home-recent" className="flex flex-col gap-1">
        <h2 id="home-recent" className="pb-1 font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.home.recentTitle}</h2>
        <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
          <PendingHomeRows month={month} today={today} knownIds={[]} />
        </ul>
      </section>
    </div>
  );
}

/** Inicio monta su mes y avisa de los ids reales que trae (F51-12). No pinta nada: vive en los dos estados de Inicio (con y sin movimientos). */
export function HomeScope({ month, knownIds, contexts }: { month: string; knownIds: readonly string[]; contexts: readonly ContextChoice[] }) {
  useListScope(month, knownIds, contexts);
  return null;
}
