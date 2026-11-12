// 004 PR C (T048, T050) / FR-042–FR-044; US-5.2, US-6.1; ExpenseRow, variante aporte (COMPONENT_SPECIFICATIONS) y
// DESIGN_SYSTEM §3, «Forma = tipo de fila»: un asiento de meta nunca parece un gasto ni un ingreso.
// - Aporte: ficha redonda con fondo de ahorro y `piggy-bank`, «+» y verde de ahorro, «ahorro, no es consumo».
// - Retiro: ficha redonda neutra con `arrow-u-up-left`, «Retiro de la meta» con su motivo si lo hay, sin «+», sin ficha ni
//   color de ingreso (glosario §9; ADR-011 fila 5; texto de los fundadores del 12 de noviembre de 2026, T084).
// - Uso: «Uso de {meta}»; el gasto real ya está en el consumo del mes (T084: sin «no es un gasto nuevo»).
// - Autor: de las personas de la pareja (`people`), nunca de los saldos, que omiten a quien no tiene asientos vivos (T084).
// - Anulado: sigue en la lista, tachado y marcado ANULADO (o DESHECHO, si fue el «Deshacer» de 6 s; o USO QUITADO, si se quitó
//   el uso de la meta desde el gasto: 004 PR D, T063).
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { cop, personName } from "./format";
import type { GoalEntryView, GoalPerson } from "./types";

type Props = {
  entry: GoalEntryView;
  people: readonly GoalPerson[];
  dateLabel: string;
  /** Actividad (con el nombre de la meta) o el historial de la meta. */
  variant: "activity" | "history";
  /** Acción propia del asiento (Anular aporte, en el historial). */
  action?: ReactNode;
};

/** La ficha de cada tipo de asiento; Actividad la reutiliza en su tabla de escritorio (F07). */
export const goalEntryChips: Record<GoalEntryView["kind"], { icon: AppIconName; className: string }> = {
  contribution: { icon: "piggy-bank", className: "bg-saving-subtle text-saving" },
  withdrawal: { icon: "arrow-u-up-left", className: "bg-sunken text-ink" },
  usage: { icon: "receipt", className: "border-[1.5px] border-dashed border-border-emphasis text-ink" },
};

export function entryTitle(entry: GoalEntryView, variant: Props["variant"]) {
  const goal = entry.goalName ?? "";
  if (entry.kind === "contribution") return variant === "activity" ? copy.goals.activity.contribution(goal) : copy.goals.history.contribution;
  if (entry.kind === "withdrawal") return copy.goals.activity.withdrawal;
  return variant === "activity" ? copy.goals.activity.usage(goal) : copy.goals.history.usage(entry.transactionDescription ?? copy.goals.history.usageFallback);
}

/** La línea secundaria del asiento; Actividad la repite en su tabla de escritorio (F07, F78-1). */
export function entryMeta(entry: GoalEntryView, people: readonly GoalPerson[], variant: Props["variant"]) {
  const who = personName(people, entry.memberUserId ?? entry.createdBy);
  if (entry.kind === "contribution") {
    if (variant === "activity") return copy.goals.activity.contributionMeta(who);
    return [copy.goals.history.by(who), entry.fundingMode ? copy.goals.contribute.modes[entry.fundingMode] : null].filter(Boolean).join(" · ");
  }
  if (entry.kind === "withdrawal") return variant === "activity" ? copy.goals.activity.withdrawalMeta(entry.goalName ?? "", who, entry.reason) : [entry.reason, who].filter(Boolean).join(" · ");
  // 004 PR D (B4): en Actividad, el uso dice de quién son los aportes que se usaron.
  const description = entry.transactionDescription ?? copy.goals.history.usageFallback;
  return variant === "activity" ? copy.goalExpense.detail.rowMeta(who, description) : description;
}

/** La marca de un asiento anulado: ANULADO, DESHECHO (el «Deshacer» de 6 s) o USO QUITADO. */
export function voidedLabel(entry: GoalEntryView) {
  return entry.voidedReason === "undo" ? copy.goals.history.undone : entry.voidedReason === "remove_usage" ? copy.goalExpense.usageRemoved : copy.goals.history.voided;
}

export function GoalEntryRow({ entry, people, dateLabel, variant, action }: Props) {
  const chip = goalEntryChips[entry.kind];
  const amount = entry.kind === "contribution" ? `+${cop(entry.amountMinor)}` : `−${cop(entry.amountMinor)}`;
  const title = entryTitle(entry, variant);
  return (
    <div data-goal-entry={entry.kind} data-entry-id={entry.id} className="grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2">
      <span data-goal-chip="" aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full ${chip.className}`}>
        <AppIcon name={chip.icon} weight="duotone" size={20} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`truncate text-[15px] leading-[1.3] font-semibold text-ink ${entry.voided ? "line-through decoration-1" : ""}`}>{title}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] leading-[1.35] text-ink-secondary">
          <span className="truncate">{entryMeta(entry, people, variant)}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{dateLabel}</span>
          {entry.voided ? (
            <span className="rounded-full border-[1.5px] border-dashed border-border-emphasis px-1.5 text-[10px] font-semibold tracking-[0.06em] text-ink">
              {voidedLabel(entry)}
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span className={`text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap tabular-nums ${entry.voided ? "text-ink-secondary line-through" : entry.kind === "contribution" ? "text-saving" : "text-ink-secondary"}`}>{amount}</span>
        {action}
      </span>
    </div>
  );
}
