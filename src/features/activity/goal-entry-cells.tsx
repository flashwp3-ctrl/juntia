// F07 (auditoría Impeccable, nov 2026); RESPONSIVE_SPECIFICATIONS: «desde xl, tabla con encabezados». Un asiento de meta
// (aporte, retiro o uso) en la tabla de escritorio de Actividad, en las MISMAS columnas que los gastos: la ficha redonda y
// el título en DESCRIPCIÓN, quién y de qué en PAGÓ · REPARTO, la fecha en FECHA y el importe en MONTO (tabla de Nosotros).
// F78-1 (revisión del gestor): nada de lo que dice la fila móvil desaparece en la tabla. La columna 2 repite la línea
// secundaria de GoalEntryRow (`entryMeta`) para el retiro («Japón · Tomás») y el uso («Aportes de Sara · Pasajes»); en el
// aporte dice «Sara · aporte», porque «ahorro, no es consumo» ya lo cuentan la ficha de ahorro y el «+» verde.
// Antes ocupaba la fila entera (`colSpan`) con la fecha en el subtítulo y la tabla dejaba de escanearse justo ahí.
// Conserva lo que dice GoalEntryRow: la ficha de cada tipo (DESIGN_SYSTEM §3, «Forma = tipo de fila»), «+» y verde de
// ahorro solo en el aporte, «−» sin color de ingreso en retiro y uso, y anulado tachado con su marca.
import { AppIcon } from "@/components/ui/app-icon";
import { cop, personName } from "@/features/goals/format";
import { entryMeta, entryTitle, goalEntryChips, voidedLabel } from "@/features/goals/goal-entry-row";
import type { GoalEntryView, GoalPerson } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";

type Props = {
  entry: GoalEntryView;
  people: readonly GoalPerson[];
  dateLabel: string;
};

const cell = "border-b-[length:var(--border-hairline)] border-border py-0";

export function GoalEntryCells({ entry, people, dateLabel }: Props) {
  const chip = goalEntryChips[entry.kind];
  const amount = entry.kind === "contribution" ? `+${cop(entry.amountMinor)}` : `−${cop(entry.amountMinor)}`;
  const who = personName(people, entry.memberUserId ?? entry.createdBy);
  return (
    <tr data-goal-row="" data-goal-entry={entry.kind} data-entry-id={entry.id}>
      <td className={`${cell} rounded-l-[14px]`}>
        <span className="flex min-h-[54px] items-center gap-3.5 pl-3">
          <span data-goal-chip="" aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full ${chip.className}`}>
            <AppIcon name={chip.icon} weight="duotone" size={16} />
          </span>
          <span className={`truncate text-[15px] font-semibold text-ink ${entry.voided ? "line-through decoration-1" : ""}`}>{entryTitle(entry, "activity")}</span>
          {entry.voided ? (
            <span className="shrink-0 rounded-full border-[1.5px] border-dashed border-border-emphasis px-1.5 text-[10px] font-semibold tracking-[0.06em] text-ink">{voidedLabel(entry)}</span>
          ) : null}
        </span>
      </td>
      <td className={`${cell} text-[13px] text-ink-secondary`}>{entry.kind === "contribution" ? copy.activity.table.goalContribution(who) : entryMeta(entry, people, "activity")}</td>
      <td className={`${cell} font-mono text-[13px] text-ink-secondary`}>{dateLabel}</td>
      <td className={`${cell} rounded-r-[14px] pr-3 text-right text-[15px] font-semibold whitespace-nowrap tabular-nums ${entry.voided ? "text-ink-secondary line-through" : entry.kind === "contribution" ? "text-saving" : "text-ink-secondary"}`}>{amount}</td>
    </tr>
  );
}
