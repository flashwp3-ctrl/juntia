"use client";
// 004 PR C (T047) / FR-041, FR-090, FR-093; US-6.1–6.3; Q12, Q14; DEC-G02. Retirar libera dinero propio que se apartó: solo
// de los aportes propios no usados (el retiro ajeno no se ofrece y la función lo rechaza), con motivo y fecha de hoy o
// pasada. El máximo es lo disponible de quien retira según la página; por encima no se envía y dice «Puedes retirar hasta
// $X». Es una reasignación, nunca un ingreso (glosario §9). El servidor recalcula el disponible bajo el bloqueo de la meta.
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { cop, createdDay } from "./format";
import { goalRejection } from "./goal-errors";
import { GoalSheetFrame, SheetError } from "./goal-sheet-frame";
import type { GoalActions, GoalView, SavedEntry, WithdrawPayload } from "./types";

const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

type Props = {
  open: boolean;
  onClose: (options?: { unconfirmed: boolean }) => void;
  goal: GoalView;
  /** Lo disponible de quien retira, en unidades menores (`my_available_minor`). */
  available: string;
  today: string;
  idempotencyKey: string;
  actions: GoalActions;
  onDone: (saved: SavedEntry, payload: WithdrawPayload) => void;
};

export function WithdrawSheet({ open, onClose, goal, available, today, idempotencyKey, actions, onDone }: Props) {
  const router = useRouter();
  const [pesos, setPesos] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);
  const [invalid, setInvalid] = useState<string | null>(null);
  const errorId = `${useId()}-error`;
  const min = createdDay(goal.createdAt);
  const availableMinor = BigInt(available);
  const amount = pesos !== null && pesos > 0 ? BigInt(pesos) : null;

  const run = useCallback((payload: WithdrawPayload) => actions.withdraw(payload), [actions]);
  const check = useCallback((input: Parameters<GoalActions["check"]>[0]) => actions.check(input), [actions]);
  // Un rechazo por saldo trae la página otra vez: el máximo que se ve pasa a ser el vigente.
  const onRejected = useCallback((error: WriteError) => { if (error === "insufficientFunds" || error === "goalNotOpen") router.refresh(); }, [router]);
  const write = useWrite<WithdrawPayload, SavedEntry>({ action: "withdraw_from_goal", run, check, onOk: onDone, onRejected });
  const locked = write.locked || write.pending;

  const submit = () => {
    if (amount === null) { setInvalid(copy.goals.contribute.errors.amount); return; }
    if (amount * 100n > availableMinor) { setInvalid(copy.goals.errors.insufficient(cop(availableMinor))); return; }
    if (reason.trim() === "" || reason.trim().length > 140) { setInvalid(copy.goals.withdraw.errors.reason); return; }
    if (!DATE.test(date) || date > today || date < min) { setInvalid(copy.goals.errors.date); return; }
    setInvalid(null);
    void write.submit({ idempotencyKey, goalId: goal.id, amountPesos: amount.toString(), entryDate: date, reason: reason.trim() });
  };

  const message = invalid ?? (write.state.phase === "rejected" ? goalRejection(write.state.error, { available: cop(availableMinor), prefix: copy.goals.withdrawSheet.rejected }) : null);
  const phase = write.state.phase === "unknown" ? "unknown" : write.pending ? "pending" : "idle";
  return (
    <GoalSheetFrame open={open} title={copy.goals.withdrawSheet.title} icon="arrow-u-up-left" onClose={onClose} phase={phase} onRetry={() => void write.retry()}>
      <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{goal.name}</p>
          <p className="text-[13px] font-semibold text-ink tabular-nums">{copy.goals.withdrawSheet.max(cop(availableMinor))}</p>
          <p className="text-[12px] text-ink-secondary">{copy.goals.withdrawSheet.onlyYours}</p>
        </div>
        <AmountInput label={copy.goals.withdrawSheet.amount} value={pesos} onValueChange={(next) => { setPesos(next); setInvalid(null); }} disabled={locked} className="w-full" fieldClassName="w-full" />
        <Input label={copy.goals.withdrawSheet.reason} placeholder={copy.goals.withdrawSheet.reasonPlaceholder} value={reason} maxLength={140} disabled={locked} onChange={(event) => { setReason(event.target.value); setInvalid(null); }} />
        <Input label={copy.goals.withdrawSheet.date} type="date" value={date} min={min} max={today} disabled={locked} onChange={(event) => { setDate(event.target.value); setInvalid(null); }} />
        <p className="text-[13px] leading-[1.5] text-pretty text-ink-secondary">{copy.goals.withdrawSheet.explain}</p>
        {message ? <SheetError id={errorId}>{message}</SheetError> : null}
        {write.state.phase === "unknown" ? (
          <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
        ) : (
          <Button type="submit" size="lg" variant="secondary" icon="arrow-u-up-left" className="w-full" loading={write.pending} loadingLabel={copy.goals.withdrawSheet.submitting} aria-describedby={message ? errorId : undefined}>
            {copy.goals.withdrawSheet.submit(cop((amount ?? 0n) * 100n))}
          </Button>
        )}
      </form>
    </GoalSheetFrame>
  );
}
