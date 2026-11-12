"use client";
// UX lote 1, cambio 3 / 04·1 INICIO. Inicio es de servidor; las creaciones en vuelo viven en el proveedor de Anotar (cliente).
// Estas piezas las pintan: arriba de «Últimos movimientos» y, en el primer gasto, en lugar del estado vacío. F05 (auditoría de
// Impeccable; propuesta aprobada el 11 de noviembre de 2026): el total del héroe y «Solo tuyos» también las cuentan, de forma
// optimista, para que la fila y el total suban juntos; se corrigen solos al confirmar (la lista trae la fila real y el total
// del servidor la incluye) o al rechazarse (la fila se retira y vuelve lo confirmado). El desglose sigue esperando a la
// revalidación. DEC-G04: el héroe es solo gasto; aquí nunca entra lo apartado (las metas no tienen filas en vuelo).
import type { ReactNode } from "react";
import type { ContextChoice } from "@/lib/context-preference";
import { ExpenseRow } from "@/components/ui/expense-row";
import { formatMoney } from "@/domain/money";
import { monthKey } from "@/domain/transactions";
import { useHighlightId, useListScope, usePendingRows } from "@/features/expenses/annotate-provider";
import { pendingSpendMinor } from "@/features/expenses/annotate/flights";
import { CountingAmount } from "@/features/expenses/counting-amount";
import { copy } from "@/lib/copy/es";
import { dayLabel } from "@/lib/format";

function useMonthPending(month: string, knownIds: readonly string[]) {
  // Una fila ya confirmada se esconde en cuanto la lista trae la real: nunca las dos (F51-8).
  return usePendingRows().filter(({ transaction, savedId }) => monthKey(transaction.transactionDate) === month && !(savedId && knownIds.includes(savedId)));
}

/** F05: lo confirmado del servidor más los gastos en vuelo del mes que la lista aún no trae. */
function usePendingTotal(confirmedMinor: string, month: string, knownIds: readonly string[]) {
  return BigInt(confirmedMinor) + pendingSpendMinor(usePendingRows(), month, knownIds);
}

/**
 * F05: el titular y el número héroe de Inicio de Yo, con los gastos en vuelo sumados. Sin gasto (ni confirmado ni en vuelo),
 * el titular de «sin gastos» y ningún importe, como antes.
 */
const HERO_HEADING = "font-serif text-balance text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] text-ink lg:text-[length:var(--display-l-size)] lg:leading-[var(--display-l-line)] lg:tracking-[var(--display-l-tracking)]";
const HERO_AMOUNT = "text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink lg:text-[length:var(--money-xl-size)] lg:tracking-[var(--money-xl-tracking)]";

export function HomeHeroTotal({ confirmedMinor, month, knownIds, headingId, titles }: {
  confirmedMinor: string; month: string; knownIds: readonly string[]; headingId: string; titles: { spent: string; none: string };
}) {
  const total = usePendingTotal(confirmedMinor, month, knownIds);
  return (
    <>
      <h2 id={headingId} className={HERO_HEADING}>{total > 0n ? titles.spent : titles.none}</h2>
      {total > 0n ? <CountingAmount amountMinor={total.toString()} className={HERO_AMOUNT} /> : null}
    </>
  );
}

/** F05: «Solo tuyos» de Inicio de Yo con pareja, que sube con el héroe. */
function PendingAwareMoney({ confirmedMinor, month, knownIds, className }: { confirmedMinor: string; month: string; knownIds: readonly string[]; className: string }) {
  const total = usePendingTotal(confirmedMinor, month, knownIds);
  return <p data-pending-aware="" className={className}>{formatMoney({ amountMinor: total, currency: "COP" })}</p>;
}

/**
 * F05/F77-4: el desglose del héroe de Inicio de Yo con pareja, «Solo tuyos» (con los gastos privados en vuelo) y «Tu parte
 * compartida» (no tiene filas en vuelo). Lo usan la rama con movimientos y el estado vacío con un gasto en vuelo.
 */
export function HeroBreakdown({ privateMinor, sharedPartMinor, month, knownIds }: { privateMinor: string; sharedPartMinor: string; month: string; knownIds: readonly string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-8 gap-y-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.home.onlyYours}</p>
        <PendingAwareMoney confirmedMinor={privateMinor} month={month} knownIds={knownIds} className="text-[17px] font-semibold text-ink tabular-nums" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.home.sharedPart}</p>
        <p className="text-[17px] font-semibold text-ink tabular-nums">{formatMoney({ amountMinor: BigInt(sharedPartMinor), currency: "COP" })}</p>
      </div>
    </div>
  );
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

/**
 * El estado vacío de Inicio, salvo que ya haya una creación en vuelo: entonces, esa fila. F77-2 (revisión del PR #77): si la
 * fila en vuelo es un gasto, también el héroe con su total optimista (lo confirmado del mes es 0: no hay movimientos, ni
 * propios ni, en Yo con pareja, partes compartidas). Sin gasto en vuelo (solo un ingreso), ningún héroe de $0.
 */
export function HomeEmpty({ month, today, title, breakdown, empty }: {
  month: string; today: string; title: string;
  /** F77-4: en Yo con pareja, el desglose «Solo tuyos / Tu parte compartida» del mes (vacío: los dos en 0). */
  breakdown?: { privateMinor: string; sharedPartMinor: string };
  empty: ReactNode;
}) {
  const rows = usePendingRows();
  const pending = useMonthPending(month, []);
  if (pending.length === 0) return empty;
  const spending = pendingSpendMinor(rows, month, []) > 0n;
  return (
    <div className="flex flex-col gap-6 pt-5 lg:pt-8">
      {spending ? (
        <section aria-labelledby="home-hero" className="flex flex-col gap-1.5 lg:gap-2.5">
          <HomeHeroTotal confirmedMinor="0" month={month} knownIds={[]} headingId="home-hero" titles={{ spent: title, none: title }} />
          {breakdown ? <HeroBreakdown privateMinor={breakdown.privateMinor} sharedPartMinor={breakdown.sharedPartMinor} month={month} knownIds={[]} /> : null}
        </section>
      ) : null}
      <section aria-labelledby="home-recent" className="flex flex-col gap-1">
        <h2 id="home-recent" className="pb-1 font-serif text-balance text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.home.recentTitle}</h2>
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
