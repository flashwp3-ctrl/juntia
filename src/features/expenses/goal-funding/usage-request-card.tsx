"use client";
// 004 PR D (T062) / FR-053–FR-056, FR-092, FR-093; US-7.5–US-7.9; 04·11 B4–B7; ConfirmationBadge y solicitud pendiente
// (aprobados en su forma, decisión 22.3). Una solicitud de fondos, vista por cada parte:
// - B4, quien pide: PENDIENTE DE {nombre}, que el gasto ya está registrado y falta solo el uso de los fondos del otro, cuánto
//   pide y de qué meta, «No vence» y «Cancelar solicitud».
// - B5, a quien se pide: el gasto, el reparto, lo que ya usó quien pide, «Tu disponible en {meta}: $antes → $después» (antes
//   «Tus aportes…»; fundadores, 19 nov 2026) y que si rechaza el gasto sigue; «Aprobar $X» y «Rechazar».
// - B6 y B7: APROBADO o {nombre} NO APROBÓ, con su nota; ya sin acciones.
// Cada acción lleva la versión leída y su propia clave (nace la primera vez y se reutiliza en cada reintento), con los tres
// resultados de la máquina de escritura (FR-093). Una versión vieja, una solicitud ya resuelta o unos aportes que cambiaron
// bloquean las acciones hasta «Revisar», que pide la página otra vez (sin tiempo real, decisión 20.16); nunca se atribuye el
// cambio a nadie ni se afirma que ya se ve lo último (lecciones de los PR B y C).
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { newIdempotencyKey } from "../idempotency";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import type { WriteAction, WriteError, WriteRejectionDetail } from "@/features/shared/write-result";
import { cop, personName } from "@/features/goals/format";
import type { GoalPerson } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import { UnconfirmedClose } from "@/features/goals/goal-sheet-frame";
import { ConfirmationBadge } from "./confirmation-badge";
import { wrapLabelMd } from "./wrap-label";
import { useOptionalAnnotate } from "../annotate-provider";
import type { GoalFundingActions, RequestPayload, RequestResult, UsageRequestView } from "./types";

/** `compact`: dentro del detalle del gasto, que ya lo nombra: el título queda solo para lectores de pantalla. */
type Props = { request: UsageRequestView; people: readonly GoalPerson[]; actions: GoalFundingActions; compact?: boolean };
type Kind = "approve" | "reject" | "cancel";
const ACTION: Record<Kind, WriteAction> = { approve: "approve_usage_request", reject: "reject_usage_request", cancel: "cancel_usage_request" };

/** Lo que dice la tarjeta ante un rechazo confirmado (contracts/errors.md). */
export function requestRejection(error: WriteError, detail: WriteRejectionDetail | undefined, goalName: string) {
  switch (error) {
    case "insufficientFunds": return detail?.availableMinor ? copy.goals.errors.fundsChanged(cop(detail.availableMinor), goalName) : copy.goalExpense.errors.allocation;
    case "versionConflict": return copy.goalExpense.errors.versionConflict;
    case "requestResolved": return copy.goalExpense.errors.resolved;
    case "requestGone": return copy.goalExpense.errors.requestGone;
    case "usageExceedsExpense": return copy.goalExpense.errors.exceedsExpense;
    case "goalNotOpen": return copy.goalExpense.errors.goalClosed;
    case "alreadyDeleted": case "notFound": return copy.transaction.errors.alreadyDeleted;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return copy.errors.unexpected;
  }
}

export function UsageRequestCard({ request, people, actions, compact = false }: Props) {
  const router = useRouter();
  const titleId = `${useId()}-solicitud`;
  const me = people.find((person) => person.isMe);
  const requester = personName(people, request.requestedBy);
  const member = personName(people, request.memberUserId);
  const role = me?.userId === request.requestedBy ? "requester" : me?.userId === request.memberUserId ? "member" : null;
  const keys = useRef<Partial<Record<Kind, string>>>({});
  const [done, setDone] = useState<RequestResult["status"] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [kind, setKind] = useState<Kind>("approve");
  // Revisión del gestor del PR #69 (10): con un resultado desconocido, cerrar el aviso se confirma («¿Cerrar sin confirmar?»,
  // como las hojas de metas) y deja dicho que no se pudo confirmar; las acciones vuelven con la MISMA clave, así que repetirlas
  // es la misma intención (idempotente) y nunca una segunda resolución. Se pide la página otra vez para ver el estado real.
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const run = useCallback((payload: RequestPayload & { kind: Kind }) => {
    const { kind: which, ...rest } = payload;
    return which === "approve" ? actions.approve(rest) : which === "reject" ? actions.reject(rest) : actions.cancel(rest);
  }, [actions]);
  const check = useCallback((input: { action: WriteAction; idempotencyKey: string }) => actions.check(input), [actions]);
  // El resultado se dice también en el aviso del proveedor, que sobrevive al refresco que retira la tarjeta resuelta.
  const annotate = useOptionalAnnotate();
  const onOk = useCallback((result: RequestResult) => {
    setDone(result.status);
    const message = result.status === "approved" ? copy.goalExpense.request.approved(request.goalName) : result.status === "rejected" ? copy.goalExpense.request.rejected : copy.goalExpense.request.cancelled;
    annotate?.notify({ tone: "success", message });
    router.refresh();
  }, [annotate, request.goalName, router]);
  const onRejected = useCallback((error: WriteError) => { if (error !== "sessionExpired") setBlocked(true); }, []);
  const write = useWrite<RequestPayload & { kind: Kind }, RequestResult>({ action: ACTION[kind], run, check, onOk, onRejected });

  // Tras «Revisar», la página trae la solicitud otra vez: con otra versión o estado, quien la pinta cambia su `key` y la
  // tarjeta nace de nuevo, con claves nuevas y sin el bloqueo (UsageRequests y el detalle usan id, versión y estado).

  const send = (which: Kind) => {
    keys.current[which] ??= newIdempotencyKey();
    setKind(which);
    void write.submit({ kind: which, idempotencyKey: keys.current[which]!, requestId: request.id, expectedVersion: request.version });
  };

  const status = done ?? request.status;
  const busy = write.pending || write.locked;
  const amount = cop(request.amountMinor);
  const description = request.description ?? copy.goalExpense.request.expenseFallback;
  const available = request.memberAvailableMinor ? BigInt(request.memberAvailableMinor) : null;
  const after = available !== null ? available - BigInt(request.amountMinor) : null;

  const badge = status === "pending" ? <ConfirmationBadge state="pending" name={member} />
    : status === "approved" ? <ConfirmationBadge state="approved" />
      : status === "rejected" ? <ConfirmationBadge state="rejected" name={member} /> : null;

  const result = done === "approved" ? copy.goalExpense.request.approved(request.goalName)
    : done === "rejected" ? copy.goalExpense.request.rejected
      : done === "cancelled" ? copy.goalExpense.request.cancelled : null;

  return (
    <article aria-labelledby={titleId} data-usage-request={status} className="flex flex-col gap-2.5 rounded-[var(--radius-xl)] bg-raised p-4 shadow-raised">
      <div className="flex flex-wrap items-center gap-2">{badge}<span className="text-[0.75rem] font-medium text-ink-secondary">{request.goalName}</span></div>
      <h3 id={titleId} className={compact && !(role === "member" && status === "pending") ? "sr-only" : "font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink"}>
        {role === "member" && status === "pending" ? copy.goalExpense.request.title(requester) : copy.goalExpense.request.expense(description, cop(request.transactionAmountMinor))}
      </h3>
      {role === "member" ? (
        <>
          {status === "pending" ? <p className="text-[0.875rem] font-semibold text-ink">{copy.goalExpense.request.expense(description, cop(request.transactionAmountMinor))}</p> : null}
          {request.splitLabel ? <p className="text-[0.8125rem] text-ink-secondary">{copy.goalExpense.request.split(request.splitLabel)}</p> : null}
          {BigInt(request.usedMinor) > 0n ? <p className="text-[0.8125rem] text-ink-secondary">{copy.goalExpense.request.used(requester, cop(request.usedMinor))}</p> : null}
          {status === "pending" && available !== null && after !== null ? (
            <p className="text-[0.875rem] font-semibold text-ink tabular-nums">
              <span className="sr-only">{copy.goalExpense.request.yoursLabel(request.goalName, cop(available), cop(after < 0n ? 0n : after))}</span>
              <span aria-hidden="true">{copy.goalExpense.request.yours(request.goalName, cop(available), cop(after < 0n ? 0n : after))}</span>
            </p>
          ) : null}
          {status === "pending" ? <p className="text-[0.75rem] leading-[1.45] text-[var(--comp-field-muted-fg)]">{copy.goalExpense.request.rejectNote}</p> : null}
        </>
      ) : (
        <>
          {status === "pending" ? <p className="text-[0.875rem] text-ink">{copy.goalExpense.request.waiting(member)}</p> : null}
          <p className="text-[0.8125rem] text-ink-secondary">{copy.goalExpense.request.asks(amount, member, request.goalName)}</p>
          {status === "pending" ? <p className="text-[0.75rem] font-semibold text-ink-secondary">{copy.goalExpense.request.noExpiry}</p> : null}
        </>
      )}
      {status === "approved" && !done ? <p className="text-[0.8125rem] text-ink-secondary">{copy.goalExpense.detail.approvedNote(member)}</p> : null}
      {status === "rejected" && !done ? <p className="text-[0.8125rem] text-ink-secondary">{copy.goalExpense.detail.rejectedNote(member)}</p> : null}
      {result ? <p role="status" className="text-[0.8125rem] font-semibold text-ink">{result}</p> : null}
      {write.state.phase === "rejected" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-[16px] bg-danger-subtle px-3.5 py-3 text-[0.8125rem] leading-[1.45] font-medium text-ink">
          <span>{requestRejection(write.state.error, write.state.detail, request.goalName)}</span>
          {blocked ? <Button variant="secondary" icon="arrow-clockwise" className={wrapLabelMd} onClick={() => router.refresh()}>{copy.goalExpense.request.review}</Button> : null}
        </div>
      ) : null}
      {write.state.phase === "unknown" ? <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} onDismiss={() => setConfirmingClose(true)} /> : null}
      {unconfirmed && write.state.phase !== "unknown" ? <p role="status" className="text-[0.8125rem] font-semibold text-ink">{copy.goalExpense.request.closedUnconfirmed}</p> : null}
      <UnconfirmedClose open={confirmingClose} onOpenChange={setConfirmingClose} onRetry={() => void write.retry()} onClose={() => { setUnconfirmed(true); write.reset(); router.refresh(); }} />
      {status === "pending" && !blocked && write.state.phase !== "unknown" ? (
        role === "member" ? (
          <div className="flex flex-wrap gap-2">
            <Button icon="check" className={wrapLabelMd} loading={write.pending && kind === "approve"} loadingLabel={copy.goalExpense.request.approving} disabled={busy} onClick={() => send("approve")}>{copy.goalExpense.request.approve(amount)}</Button>
            <Button variant="secondary" className={wrapLabelMd} loading={write.pending && kind === "reject"} loadingLabel={copy.goalExpense.request.rejecting} disabled={busy} onClick={() => send("reject")}>{copy.goalExpense.request.reject}</Button>
          </div>
        ) : role === "requester" ? (
          <Button variant="ghost" icon="x" loading={write.pending} loadingLabel={copy.goalExpense.request.cancelling} disabled={busy} onClick={() => send("cancel")} className={`self-start ${wrapLabelMd}`}>{copy.goalExpense.request.cancel}</Button>
        ) : null
      ) : null}
    </article>
  );
}

/** La identidad de una tarjeta: una versión, un estado o unos saldos nuevos la hacen nacer de nuevo (tras «Revisar»). */
export const requestKey = (request: UsageRequestView) => [request.id, request.version, request.status, request.memberAvailableMinor ?? "", request.usedMinor].join(":");

/** Las solicitudes con las escrituras del proveedor de Anotar (que vive en el layout). */
export function PendingRequests({ requests, people }: { requests: readonly UsageRequestView[]; people: readonly GoalPerson[] }) {
  const actions = useOptionalAnnotate()?.goalFunding ?? null;
  return <UsageRequests requests={requests} people={people} actions={actions} />;
}

/** Las solicitudes de un contexto (Inicio, Actividad o la meta), en una región con nombre. */
export function UsageRequests({ requests, people, actions }: { requests: readonly UsageRequestView[]; people: readonly GoalPerson[]; actions: GoalFundingActions | null }) {
  if (requests.length === 0 || !actions) return null;
  return (
    <section aria-label={copy.goalExpense.request.region} className="flex flex-col gap-3">
      {requests.map((request) => <UsageRequestCard key={requestKey(request)} request={request} people={people} actions={actions} />)}
    </section>
  );
}
