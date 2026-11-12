"use client";
// 004 PR C (T047, T048) / FR-042, FR-043, FR-096; US-5.6, US-5.7; Q13; 04·3 «Historial». Aportes, retiros y usos de una meta
// por mes, con autor, modo y estado; en las compartidas, el total y el número de aportes por persona (de
// `goal_member_balances`, una sola sentencia) y filtros Todos/Sara/Tomás. La lista llega completa por cursor
// (`goal_entries`, FR-096); el total de aportes de cada mes suma esa lista completa, sin anulados.
// «Anular aporte» (Q13): solo en los aportes propios no anulados, con confirmación; anula con auditoría y el asiento sigue
// en la lista, marcado. T084 (fallo 2): el botón sigue la misma regla que el servidor (`goal_entry_write`, JT204): solo si
// lo disponible de quien mira cubre el aporte entero; si ya se retiró o usó una parte, no se ofrece. Si aun así el servidor
// lo rechaza (otra pestaña), se dice. Resultado desconocido: el diálogo queda abierto con «Reintentar» (misma clave) y
// «Comprobar estado».
// T084 (fallo 1): el autor de cada asiento sale de las personas de la pareja (`people`), no de los saldos: quien se quedó
// sin aportes vivos sigue teniendo nombre en sus asientos anulados o deshechos.
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { dayLabel, monthTitle } from "@/lib/format";
import { cop } from "./format";
import { goalRejection } from "./goal-errors";
import { UnconfirmedClose } from "./goal-sheet-frame";
import { GoalEntryRow } from "./goal-entry-row";
import type { GoalActions, GoalEntryView, GoalMemberView, GoalPerson, GoalView, VoidEntryPayload } from "./types";

type Props = { goal: GoalView; entries: readonly GoalEntryView[]; members: readonly GoalMemberView[]; people: readonly GoalPerson[]; today: string; actions: GoalActions };
const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary";
const byDate = (a: GoalEntryView, b: GoalEntryView) => (a.effectiveDate !== b.effectiveDate ? (a.effectiveDate > b.effectiveDate ? -1 : 1) : a.createdAt > b.createdAt ? -1 : 1);

export function GoalHistory({ goal, entries, members, people, today, actions }: Props) {
  const router = useRouter();
  const titleId = useId();
  const me = people.find((person) => person.isMe)?.userId ?? null;
  const shared = goal.scope === "shared";
  const [who, setWho] = useState("all");
  const [target, setTarget] = useState<{ entry: GoalEntryView; key: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = useCallback((payload: VoidEntryPayload) => actions.voidEntry(payload), [actions]);
  const check = useCallback((input: Parameters<GoalActions["check"]>[0]) => actions.check(input), [actions]);
  const onOk = useCallback(() => { setTarget(null); setDone(copy.goals.history.void.done); router.refresh(); }, [router]);
  const write = useWrite<VoidEntryPayload, { entryId: string }>({ action: "void_goal_entry", run, check, onOk });

  const visible = useMemo(() => [...entries].filter((entry) => who === "all" || entry.memberUserId === who).sort(byDate), [entries, who]);
  const months = useMemo(() => {
    const groups = new Map<string, GoalEntryView[]>();
    for (const entry of visible) groups.set(entry.effectiveDate.slice(0, 7), [...(groups.get(entry.effectiveDate.slice(0, 7)) ?? []), entry]);
    return [...groups];
  }, [visible]);
  const canVoid = (entry: GoalEntryView) => entry.kind === "contribution" && !entry.voided && entry.memberUserId === me && goal.status !== "archived"
    && BigInt(goal.myAvailableMinor) >= BigInt(entry.amountMinor);
  const open = (entry: GoalEntryView) => { write.reset(); setDone(null); setTarget({ entry, key: newIdempotencyKey() }); };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-serif text-balance text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.goals.history.title}</h2>
      {shared && members.length > 0 ? (
        <ul aria-label={copy.goals.immersive.members} className="flex flex-col gap-1">
          {members.map((member) => (
            <li key={member.userId} className="text-[0.8125rem] font-medium text-ink tabular-nums">{copy.goals.immersive.member(member.name, cop(member.contributedMinor), member.contributionCount)}</li>
          ))}
        </ul>
      ) : null}
      {shared && members.length > 1 ? (
        <Segmented role="radiogroup" label={copy.goals.history.filter} value={who} onValueChange={setWho}
          options={[{ value: "all", label: copy.goals.history.all }, ...members.map((member) => ({ value: member.userId, label: member.name }))]} />
      ) : null}
      <p role="status" className="sr-only">{done ?? ""}</p>
      {months.length === 0 ? <p className="py-2 text-[length:var(--body-m-size)] text-ink-secondary">{copy.goals.history.empty}</p> : months.map(([month, list]) => {
        const contributed = list.reduce((sum, entry) => (entry.kind === "contribution" && !entry.voided ? sum + BigInt(entry.amountMinor) : sum), 0n);
        return (
          <section key={month} aria-labelledby={`${titleId}-${month}`} className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b-[length:var(--border-hairline)] border-border pb-1.5">
              <h3 id={`${titleId}-${month}`} className={overline}>{monthTitle(month)}</h3>
              {contributed > 0n ? <span className={`${overline} tabular-nums`}>{copy.goals.history.monthTotal(cop(contributed))}</span> : null}
            </div>
            <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
              {list.map((entry) => (
                <li key={entry.id}>
                  <GoalEntryRow entry={entry} people={people} dateLabel={dayLabel(entry.effectiveDate, today)} variant="history"
                    action={canVoid(entry) ? <Button size="sm" variant="ghost" icon="minus-circle" label={copy.goals.history.void.action} onClick={() => open(entry)} /> : undefined} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(next) => { if (next || write.state.phase === "pending") return; if (write.state.phase === "unknown") setConfirming(true); else setTarget(null); }}
        title={copy.goals.history.void.title}
        description={copy.goals.history.void.description}
        cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setTarget(null)} disabled={write.pending || write.locked}>{copy.goals.history.void.keep}</Button>}
        confirm={write.state.phase === "unknown" ? <span /> : (
          <Button variant="danger" loading={write.pending} onClick={() => target && void write.submit({ idempotencyKey: target.key, entryId: target.entry.id, reason: "void" })}>{copy.goals.history.void.confirm}</Button>
        )}
      >
        {write.state.phase === "rejected" ? <p role="alert" className="text-[0.8125rem] font-medium text-ink">{goalRejection(write.state.error, { voiding: true, available: write.state.detail?.availableMinor ? cop(write.state.detail.availableMinor) : undefined, prefix: copy.goals.history.void.rejected })}</p> : null}
        {write.state.phase === "unknown" ? <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} onDismiss={() => setConfirming(true)} /> : null}
        <UnconfirmedClose open={confirming} onOpenChange={setConfirming} onRetry={() => void write.retry()} onClose={() => setTarget(null)} />
      </ConfirmDialog>
    </section>
  );
}
