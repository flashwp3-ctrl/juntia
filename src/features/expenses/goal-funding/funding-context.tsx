"use client";
// 004 PR D (T063, T064) / FR-057, FR-071, FR-072; US-7.5, US-8.1–US-8.3. Lo que Actividad sabe del uso de metas en los gastos
// de su mes (`expense_goal_funding`, los usos de `goal_activity` y las solicitudes de `usage_requests`), al alcance de la fila
// (CON META o PENDIENTE DE {nombre}), del detalle (el uso, la solicitud, «Quitar el uso de la meta»), de la confirmación de
// eliminar (avisa del uso) y de «Mover a Pareja» (la LimitNote). Lo lee el servidor de Actividad con el contexto de la página
// (en Nosotros, solo metas compartidas; FR-085) y viaja con ella: el detalle no hace otra consulta.
import { createContext, useContext, type ReactNode } from "react";
import { cop, personName } from "@/features/goals/format";
import type { GoalPerson } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import { useOptionalAnnotate } from "../annotate-provider";
import { ConfirmationBadge, confirmationText } from "./confirmation-badge";
import { FundedMoveNote, RemoveGoalUsage } from "./remove-usage";
import { requestKey, UsageRequestCard } from "./usage-request-card";
import type { ExpenseFundingView } from "./types";

type FundingState = { byTransaction: Readonly<Record<string, ExpenseFundingView>>; people: readonly GoalPerson[] };
const FundingContext = createContext<FundingState>({ byTransaction: {}, people: [] });

export function ExpenseFundingProvider({ byTransaction, people, children }: FundingState & { children: ReactNode }) {
  return <FundingContext.Provider value={{ byTransaction, people }}>{children}</FundingContext.Provider>;
}

/** El uso de una meta en este gasto (aplicado o pedido), o `null`. */
export function useExpenseFunding(transactionId: string): ExpenseFundingView | null {
  const funding = useContext(FundingContext).byTransaction[transactionId];
  return funding && (funding.funded || BigInt(funding.pendingMinor) > 0n || funding.request) ? funding : null;
}

type RowState = { state: "funded" } | { state: "pending"; name: string };
function rowStates(funding: ExpenseFundingView | undefined, people: readonly GoalPerson[]): RowState[] {
  if (!funding) return [];
  const states: RowState[] = funding.funded ? [{ state: "funded" }] : [];
  if (funding.request?.status === "pending") states.push({ state: "pending", name: personName(people, funding.request.memberUserId) });
  return states;
}

/**
 * Para las listas: la marca de cada fila (CON META si hay uso aplicado; PENDIENTE DE {nombre} si hay una solicitud viva) y
 * su texto para el nombre accesible de la fila, que no lee lo visible (WCAG 2.5.3, como ExpenseRow).
 */
export function useFundingLookup() {
  const { byTransaction, people } = useContext(FundingContext);
  return (transactionId: string) => {
    const states = rowStates(byTransaction[transactionId], people);
    if (states.length === 0) return null;
    return {
      label: states.map((item) => confirmationText(item.state, item.state === "pending" ? item.name : undefined)).join(", "),
      node: (
        <span data-funding-badge="" className="flex flex-wrap gap-1.5">
          {states.map((item) => <ConfirmationBadge key={item.state} state={item.state} name={item.state === "pending" ? item.name : undefined} />)}
        </span>
      ),
    };
  };
}

/** La marca de una sola fila (la tabla de escritorio de Nosotros). */
export function FundingRowBadge({ transactionId }: { transactionId: string }) {
  const lookup = useFundingLookup();
  return lookup(transactionId)?.node ?? null;
}

/** El bloque del detalle de un gasto con meta: CON META, cada uso por aportante, la solicitud y «Quitar el uso». */
export function ExpenseFundingDetail({ transactionId, version }: { transactionId: string; version: number }) {
  const { people } = useContext(FundingContext);
  const funding = useExpenseFunding(transactionId);
  const actions = useOptionalAnnotate()?.goalFunding ?? null;
  if (!funding) return null;
  const hasPending = funding.request?.status === "pending";
  return (
    <section aria-label={copy.goalExpense.detail.title} data-expense-funding="" className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-border p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {funding.funded ? <ConfirmationBadge state="funded" /> : null}
        <h3 className="text-[length:var(--body-m-size)] font-semibold text-ink">{copy.goalExpense.detail.title} · {funding.goalName}</h3>
      </div>
      {funding.uses.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {funding.uses.map((use) => (
            <li key={use.memberUserId} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 text-ink-secondary">{copy.goalExpense.detail.use(funding.goalName, personName(people, use.memberUserId))}</span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">−{cop(use.amountMinor)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {funding.request && actions ? <UsageRequestCard key={requestKey(funding.request)} compact request={funding.request} people={people} actions={actions} /> : null}
      {(funding.funded || hasPending) && actions ? <RemoveGoalUsage transactionId={transactionId} version={version} goalName={funding.goalName} hasPending={hasPending} actions={actions} /> : null}
    </section>
  );
}

/** «Mover a Pareja» o, si el gasto está pagado con una meta, la LimitNote (FR-072). */
export function useFundedMove(transactionId: string) {
  const funding = useExpenseFunding(transactionId);
  return { blocked: Boolean(funding && (funding.funded || funding.request?.status === "pending")), note: <FundedMoveNote /> };
}
