"use client";
// 004 PR D (T060) / FR-050, FR-085; US-7.1, US-7.1a; 04·11 B1. Las metas del contexto de la hoja, como un grupo de radio:
// nombre, tipo y saldo. Solo las que llegaron del servidor para ese contexto (en Nosotros, compartidas; en Yo, personales):
// nunca se pinta una meta del otro ámbito, ni deshabilitada (F63-3; lectura 12 de la spec). Debajo, la explicación genérica.
// Una meta sin fondos para usar se ve y no se puede elegir. Tab entra en la elegida; las flechas cambian de meta.
import { useRef, type KeyboardEvent } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";
import { cop } from "@/features/goals/format";
import { goalTypeIcon } from "@/features/goals/goal-card";
import type { FundingContext, FundingGoal } from "./types";

export type PickerState = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; goals: FundingGoal[] };

type Props = { state: PickerState; context: FundingContext; value: string | null; onSelect: (goal: FundingGoal) => void; onRetry: () => void; disabled: boolean };

const usable = (goal: FundingGoal) => goal.members.some((member) => BigInt(member.availableMinor) > 0n);

export function GoalPicker({ state, context, value, onSelect, onRetry, disabled }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const goals = state.kind === "ready" ? state.goals : [];
  const enabled = goals.map(usable);
  const stop = Math.max(0, goals.findIndex((goal) => goal.id === value), value ? 0 : enabled.indexOf(true));
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    for (let next = (index + step + goals.length) % goals.length, n = 0; n < goals.length; next = (next + step + goals.length) % goals.length, n++) {
      if (!enabled[next]) continue;
      onSelect(goals[next]);
      refs.current[next]?.focus();
      return;
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.75rem] font-medium text-ink-secondary">{copy.goalExpense.picker.title}</span>
      {state.kind === "loading" ? <p role="status" className="text-[0.8125rem] text-[var(--comp-field-muted-fg)]">{copy.goalExpense.picker.loading}</p> : null}
      {state.kind === "failed" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-[16px] bg-warning-subtle px-3.5 py-3 text-[0.8125rem] font-medium text-ink">
          <span>{copy.goalExpense.picker.failed}</span>
          <Button variant="secondary" icon="arrow-clockwise" onClick={onRetry}>{copy.goalExpense.picker.retry}</Button>
        </div>
      ) : null}
      {state.kind === "ready" && goals.length === 0 ? <p className="rounded-[14px] bg-sunken px-3.5 py-3 text-[0.8125rem] text-ink">{copy.goalExpense.picker.empty[context]}</p> : null}
      {state.kind === "ready" ? (
        <div role="radiogroup" aria-label={copy.goalExpense.picker.title} className="flex flex-col gap-2">
          {goals.map((goal, index) => {
            const selected = goal.id === value;
            const name = copy.goalExpense.picker.option(goal.name, cop(goal.balanceMinor));
            return (
              <button
                key={goal.id}
                ref={(node) => { refs.current[index] = node; }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={name}
                aria-disabled={!enabled[index] || undefined}
                disabled={disabled}
                tabIndex={index === stop ? 0 : -1}
                onClick={() => { if (enabled[index]) onSelect(goal); }}
                onKeyDown={(event) => move(event, index)}
                className={`flex min-h-[60px] items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-left shadow-[0_0_0_1.5px_var(--color-border-subtle)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 disabled:cursor-not-allowed ${selected ? "bg-saving-subtle shadow-[inset_0_0_0_2px_var(--color-text-primary)]" : "bg-raised hover:bg-sunken"}`}
              >
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-saving-subtle text-saving">
                  <AppIcon name={goalTypeIcon[goal.goalType]} weight="duotone" size={20} />
                </span>
                <span aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[0.9375rem] font-semibold text-ink">{goal.name}</span>
                  <span className={`text-[0.75rem] ${selected ? "text-ink" : "text-ink-secondary"}`}>{enabled[index] ? copy.goalExpense.picker.balance(cop(goal.balanceMinor)) : copy.goalExpense.picker.noFunds}</span>
                </span>
                {selected ? <AppIcon name="check-circle" weight="fill" size={20} className="shrink-0 text-ink" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="flex items-start gap-2 text-[0.75rem] leading-[1.45] text-[var(--comp-field-muted-fg)]">
        <AppIcon name="info" size={14} className="mt-px shrink-0" />
        {copy.goalExpense.picker.note[context]}
      </p>
    </div>
  );
}
