"use client";
// 004 PR C (T046) / FR-030, FR-031, FR-093, FR-094; US-4.2; Q15. Crear y editar una meta: nombre, tipo (el ícono del
// fallback, los siete `goal_type` aprobados), objetivo positivo en pesos enteros y fecha objetivo opcional (mes y año).
// Crear en Yo hace una meta personal y en Nosotros una compartida (DEC-G01); el contexto queda fijo al abrir la hoja
// (FR-099). Editar lleva la versión leída: con una versión vieja falla, no cambia nada y lo dice. Resultado desconocido:
// campos bloqueados, «Reintentar» con la misma clave y «Comprobar estado» (`write_status`).
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { goalTypeIcon } from "./goal-card";
import { goalRejection } from "./goal-errors";
import { GoalSheetFrame, SheetError } from "./goal-sheet-frame";
import { GOAL_TYPES, type CreateGoalPayload, type GoalActions, type GoalType, type GoalView, type PlanningContext, type SavedGoal, type UpdateGoalPayload } from "./types";

type Props = {
  open: boolean;
  onClose: (options?: { unconfirmed: boolean }) => void;
  /** Sin meta: crear en `context`. Con meta: editarla. */
  goal?: GoalView;
  context: PlanningContext;
  today: string;
  idempotencyKey: string;
  actions: GoalActions;
  /** Quién más puede editar (para «{nombre} cambió esta meta»). */
  partnerName?: string | null;
  onDone: (saved: SavedGoal) => void;
};

type Payload = CreateGoalPayload | UpdateGoalPayload;
const select = "min-h-12 w-full rounded-[var(--radius-md)] bg-sunken px-3 text-[length:var(--body-m-size)] font-medium text-ink shadow-[var(--comp-field-inset)] focus-visible:outline-[length:var(--border-focus)] focus-visible:outline-offset-[var(--focus-offset)] focus-visible:outline-focus focus-visible:outline-solid disabled:opacity-60";

export function GoalFormSheet({ open, onClose, goal, context, today, idempotencyKey, actions, partnerName, onDone }: Props) {
  const router = useRouter();
  const editing = Boolean(goal);
  const [name, setName] = useState(goal?.name ?? "");
  const [goalType, setGoalType] = useState<GoalType>(goal?.goalType ?? "other");
  const [target, setTarget] = useState<number | null>(goal ? Number(BigInt(goal.targetMinor) / 100n) : null);
  const [month, setMonth] = useState(goal?.targetMonth ? goal.targetMonth.slice(5, 7) : "");
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(goal?.targetMonth ? goal.targetMonth.slice(0, 4) : String(thisYear + 1));
  const [invalid, setInvalid] = useState<string | null>(null);
  const id = useId();
  const errorId = `${id}-error`;
  const years = [...Array(11).keys()].map((index) => String(thisYear + index));
  if (goal?.targetMonth && !years.includes(goal.targetMonth.slice(0, 4))) years.unshift(goal.targetMonth.slice(0, 4));

  const run = useCallback((payload: Payload) => ("goalId" in payload ? actions.update(payload) : actions.create(payload)), [actions]);
  const check = useCallback((input: Parameters<GoalActions["check"]>[0]) => actions.check(input), [actions]);
  const onRejected = useCallback((error: WriteError) => { if (error === "versionConflict") router.refresh(); }, [router]);
  const write = useWrite<Payload, SavedGoal>({ action: editing ? "update_goal" : "create_goal", run, check, onOk: onDone, onRejected });
  const locked = write.locked || write.pending;

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.length > 60) { setInvalid(copy.goals.form.errors.name); return; }
    if (!(GOAL_TYPES as readonly string[]).includes(goalType)) { setInvalid(copy.goals.form.errors.type); return; }
    if (target === null || target < 1 || target > 999_999_999) { setInvalid(copy.goals.form.errors.target); return; }
    if (month !== "" && !years.includes(year)) { setInvalid(copy.goals.form.errors.month); return; }
    setInvalid(null);
    const base = { idempotencyKey, name: trimmed, goalType, targetPesos: String(target), targetMonth: month === "" ? null : `${year}-${month}-01` };
    void write.submit(goal ? { ...base, goalId: goal.id, expectedVersion: goal.version } : { ...base, context });
  };

  const message = invalid ?? (write.state.phase === "rejected" ? goalRejection(write.state.error, { changedBy: partnerName ?? undefined, prefix: copy.goals.sheet.rejected }) : null);
  const phase = write.state.phase === "unknown" ? "unknown" : write.pending ? "pending" : "idle";
  return (
    <GoalSheetFrame open={open} title={editing ? copy.goals.sheet.editTitle : copy.goals.sheet.createTitle} icon="flag-banner" onClose={onClose} phase={phase} onRetry={() => void write.retry()}>
      <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4">
        <Input label={copy.goals.sheet.name} value={name} maxLength={60} disabled={locked} onChange={(event) => { setName(event.target.value); setInvalid(null); }} />
        <fieldset disabled={locked} className="flex flex-col gap-2">
          <legend className="pb-2 text-[length:var(--label-m-size)] font-semibold text-ink">{copy.goals.sheet.type}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {GOAL_TYPES.map((type) => (
              <label key={type} className="group relative flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-2 text-center text-[12px] leading-tight font-semibold text-ink shadow-[0_0_0_1.5px_var(--color-border-subtle)] has-[:checked]:bg-saving-subtle has-[:checked]:shadow-[inset_0_0_0_2px_var(--color-text-primary)] has-[:focus-visible]:outline-[length:var(--border-focus)] has-[:focus-visible]:outline-offset-[var(--focus-offset)] has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid">
                <input type="radio" name={`${id}-type`} value={type} checked={goalType === type} onChange={() => setGoalType(type)} className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-[14px] opacity-0" />
                <AppIcon name={goalTypeIcon[type]} weight="duotone" size={22} className="text-saving" />
                <span>{copy.goals.types[type]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <AmountInput label={copy.goals.sheet.target} value={target} onValueChange={(next) => { setTarget(next); setInvalid(null); }} disabled={locked} className="w-full" fieldClassName="w-full" />
        <fieldset disabled={locked} className="flex flex-col gap-2">
          <legend className="pb-1 text-[length:var(--label-m-size)] font-semibold text-ink">{copy.goals.sheet.month}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-ink-secondary">
              {copy.goals.sheet.monthLabel}
              <select value={month} onChange={(event) => setMonth(event.target.value)} className={select}>
                <option value="">{copy.goals.sheet.clearMonth}</option>
                {copy.dates.months.map((label, index) => <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-ink-secondary">
              {copy.goals.sheet.yearLabel}
              <select value={year} disabled={month === ""} onChange={(event) => setYear(event.target.value)} className={select}>
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[12px] text-ink-secondary">{copy.goals.sheet.monthHelp}</p>
        </fieldset>
        {editing ? null : <p className="flex items-start gap-2 text-[13px] leading-[1.45] text-ink-secondary"><AppIcon name={context === "us" ? "users-three" : "lock-simple"} size={16} className="mt-0.5 shrink-0" />{copy.goals.sheet.scopeNote[context]}</p>}
        {message ? <SheetError id={errorId}>{message}</SheetError> : null}
        {write.state.phase === "unknown" ? (
          <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
        ) : (
          <Button type="submit" size="lg" icon="check" className="w-full" loading={write.pending} loadingLabel={copy.goals.sheet.submitting} aria-describedby={message ? errorId : undefined}>
            {editing ? copy.goals.sheet.submitEdit : copy.goals.sheet.submitCreate}
          </Button>
        )}
      </form>
    </GoalSheetFrame>
  );
}
