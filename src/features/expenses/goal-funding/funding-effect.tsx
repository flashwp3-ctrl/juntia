"use client";
// 004 PR D (T061) / FR-051, FR-052; US-7.3; 04·11 B3; ChangePreview en B3 (aprobada en su forma, decisión 22.3). El efecto
// «ahora» (el uso propio, que se aplica al registrar) y «si {nombre} aprueba» (los fondos pedidos, que solo cuentan al
// aprobar, §15.5), con la forma de ChangePreview: etiqueta · antes tachado → después; cada fila con su `aria-label`. Debajo,
// que el gasto es una compra real (cuenta como gasto) y que Juntia no mueve dinero. Solo cifras de quien mira: la meta del
// contexto de la hoja. La vista previa la calcula el cliente para mostrarla; la escritura la recalcula el servidor (FR-090).
import { useId } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { cop } from "@/features/goals/format";

type Props = { goalName: string; balanceMinor: string; ownPesos: number; requestedPesos: number; partnerName: string | null };

export function FundingEffect({ goalName, balanceMinor, ownPesos, requestedPesos, partnerName }: Props) {
  const titleId = `${useId()}-efecto`;
  const before = BigInt(balanceMinor);
  const afterOwn = before - BigInt(ownPesos) * 100n;
  const afterAll = afterOwn - BigInt(requestedPesos) * 100n;
  const rows = [{ label: copy.goalExpense.effect.now(goalName), before, after: afterOwn }];
  if (requestedPesos > 0 && partnerName) rows.push({ label: copy.goalExpense.effect.ifApproves(partnerName), before: afterOwn, after: afterAll });
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3 id={titleId} className="text-[0.75rem] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary">{copy.goalExpense.effect.title}</h3>
      <ul role="list" aria-label={copy.goalExpense.effect.title} className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
        {rows.map((row) => (
          <li key={row.label} aria-label={copy.goalExpense.effect.row(row.label, cop(row.before), cop(row.after))} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span aria-hidden="true" className="min-w-0 text-[0.8125rem] font-medium text-ink-secondary">{row.label}</span>
            <span aria-hidden="true" className="flex shrink-0 items-baseline gap-2 tabular-nums">
              <s className="text-[0.8125rem] text-ink-secondary">{cop(row.before)}</s>
              <AppIcon name="arrow-right" size={12} className="text-ink-secondary" />
              <span className="text-[0.9375rem] font-semibold text-ink">{cop(row.after)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[0.75rem] leading-[1.45] text-[var(--comp-field-muted-fg)]">{copy.goalExpense.effect.expenseNote}</p>
      <p className="flex items-center gap-2 rounded-[14px] bg-sunken px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
        <AppIcon name="info" size={16} className="shrink-0 text-ink-secondary" />
        {copy.goalExpense.effect.noMove}
      </p>
    </section>
  );
}
