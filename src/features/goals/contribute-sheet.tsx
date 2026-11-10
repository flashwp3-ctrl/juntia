"use client";
// 004 PR C (T047) / FR-040, FR-077, FR-090, FR-093, FR-094; US-5.1, US-5.3, US-5.4; Q12; 04·3 «Registrar aporte».
// - Sin «¿Quién aporta?»: aporta quien registra (DEC-G06); la función no acepta otro aportante.
// - Vista previa «Con este aporte $X · N %» con el porcentaje truncado (FR-034), calculada del saldo que se ve; la
//   escritura vuelve a calcular y validar todo en SQL (FR-090) y, si la vista previa quedó vieja, gana el servidor.
// - Modo «Apartado en Juntia» por defecto o «Transferencia declarada» (DEC-G03); nunca «Depositado» ni «verificada».
// - Fecha de hoy o pasada, nunca futura ni anterior a la creación de la meta (Q12).
// - Una meta lograda no admite aportes (FR-032). Resultado desconocido: nunca afirma nada, bloquea los campos y ofrece
//   «Reintentar» (misma clave, misma carga) y «Comprobar estado». La clave nace al abrir la hoja; nada va al navegador.
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { cop, createdDay, percentOf } from "./format";
import { goalRejection } from "./goal-errors";
import { GoalSheetFrame, SheetError } from "./goal-sheet-frame";
import type { ContributePayload, GoalActions, GoalView, PlanningContext, SavedEntry } from "./types";

const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const MAX_PESOS = 999_999_999n;

type Props = {
  open: boolean;
  onClose: (options?: { unconfirmed: boolean }) => void;
  goal: GoalView;
  context: PlanningContext;
  today: string;
  idempotencyKey: string;
  actions: GoalActions;
  onDone: (saved: SavedEntry, payload: ContributePayload) => void;
};

export function ContributeSheet({ open, onClose, goal, context, today, idempotencyKey, actions, onDone }: Props) {
  const router = useRouter();
  const [pesos, setPesos] = useState<number | null>(null);
  const [mode, setMode] = useState<ContributePayload["fundingMode"]>("reserved");
  const [date, setDate] = useState(today);
  const [invalid, setInvalid] = useState<string | null>(null);
  const errorId = `${useId()}-error`;
  const min = createdDay(goal.createdAt);
  const amount = pesos !== null && pesos > 0 ? BigInt(pesos) : null;

  const run = useCallback((payload: ContributePayload) => actions.contribute(payload), [actions]);
  const check = useCallback((input: Parameters<GoalActions["check"]>[0]) => actions.check(input), [actions]);
  const onRejected = useCallback((error: WriteError) => { if (error === "goalNotOpen" || error === "versionConflict") router.refresh(); }, [router]);
  const write = useWrite<ContributePayload, SavedEntry>({ action: "contribute_to_goal", run, check, onOk: onDone, onRejected });
  const locked = write.locked || write.pending;

  const submit = () => {
    if (amount === null || amount > MAX_PESOS) { setInvalid(copy.goals.contribute.errors.amount); return; }
    if (!DATE.test(date) || date > today || date < min) { setInvalid(copy.goals.errors.date); return; }
    setInvalid(null);
    void write.submit({ idempotencyKey, goalId: goal.id, amountPesos: amount.toString(), entryDate: date, fundingMode: mode });
  };

  const after = amount !== null ? BigInt(goal.balanceMinor) + amount * 100n : null;
  const message = invalid ?? (write.state.phase === "rejected" ? goalRejection(write.state.error, { prefix: copy.goals.contribute.rejected }) : null);
  const phase = write.state.phase === "unknown" ? "unknown" : write.pending ? "pending" : "idle";
  return (
    <GoalSheetFrame open={open} title={copy.goals.contribute.title} icon="piggy-bank" onClose={onClose} phase={phase} onRetry={() => void write.retry()}>
      {goal.status !== "active" ? (
        <p className="rounded-[14px] bg-sunken px-3 py-2.5 text-[13px] font-medium text-ink">{goal.status === "completed" ? copy.goals.immersive.completedNote : copy.goals.immersive.readOnly}</p>
      ) : (
        <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4">
          <p className="text-center font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{goal.name}</p>
          <AmountInput label={copy.goals.contribute.amount} value={pesos} onValueChange={(next) => { setPesos(next); setInvalid(null); }} disabled={locked} className="w-full" fieldClassName="w-full" />
          {after !== null ? (
            <p aria-live="polite" className="rounded-[14px] bg-saving-subtle px-3 py-2.5 text-[14px] font-semibold text-ink tabular-nums">
              {copy.goals.contribute.preview(cop(after), percentOf(after, BigInt(goal.targetMinor)))}
            </p>
          ) : null}
          <p className="text-[13px] leading-[1.5] text-pretty text-ink-secondary">{copy.goals.contribute.explain[context]}</p>
          <div className="flex flex-col gap-2">
            <Segmented role="radiogroup" label={copy.goals.contribute.mode} stretch disabled={locked}
              options={[{ value: "reserved", label: copy.goals.contribute.modes.reserved }, { value: "transferred_declared", label: copy.goals.contribute.modes.transferred_declared }] as const}
              value={mode} onValueChange={setMode} />
            {mode === "transferred_declared" ? <p className="text-[12px] leading-[1.45] text-ink-secondary">{copy.goals.contribute.modeHelp}</p> : null}
          </div>
          <Input label={copy.goals.contribute.date} type="date" value={date} min={min} max={today} disabled={locked} onChange={(event) => { setDate(event.target.value); setInvalid(null); }} />
          {message ? <SheetError id={errorId}>{message}</SheetError> : null}
          {write.state.phase === "unknown" ? (
            <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
          ) : (
            <Button type="submit" size="lg" icon="piggy-bank" className="w-full" loading={write.pending} loadingLabel={copy.goals.contribute.submitting} aria-describedby={message ? errorId : undefined}>
              {copy.goals.contribute.submit(cop((amount ?? 0n) * 100n))}
            </Button>
          )}
        </form>
      )}
    </GoalSheetFrame>
  );
}
