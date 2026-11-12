"use client";
// 004 PR E (T074) / FR-024, FR-063, FR-113; Q4 y decisión 22.4 (aprobada en su forma; en pantalla, en este PR);
// COMPONENT_SPECIFICATIONS «PlanningNote (destinado neto)»; DEC-G04 y maestro §15.4. Nota secundaria en `surface.sunken`,
// radio 16: overline «Destinado neto · para planificar», el valor en 17/600 y la frase fija (o, si es negativo, la del signo).
// «Cómo se calcula» es un botón de 44 px con `aria-expanded` que abre un `<dl>`: Gasto, + Aportes, − Retiros, − Gastos
// pagados con metas, = Destinado neto; los signos visibles son decorativos y el lector los oye en palabras. Nunca es el número
// héroe ni se rotula «Total gastado». Las cifras vienen del servidor (`metric_months`): aquí solo se formatean.
// El texto secundario sobre `sunken` usa `--comp-field-muted-fg` (errata de contraste F16-1: 7,32:1 en claro).
import { useId, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { signedMoney, money } from "./format";
import type { AnalysisMetrics } from "./types";

export function PlanningNote({ metrics }: { metrics: AnalysisMetrics }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const net = BigInt(metrics.netMinor);
  const { note } = copy.analysis;
  const rows: { sign: "plus" | "minus" | "equals" | null; label: string; minor: string }[] = [
    { sign: null, label: note.terms.spent, minor: metrics.spentMinor },
    { sign: "plus", label: note.terms.contributed, minor: metrics.contributedMinor },
    { sign: "minus", label: note.terms.withdrawn, minor: metrics.withdrawnMinor },
    { sign: "minus", label: note.terms.funded, minor: metrics.fundedMinor },
    { sign: "equals", label: note.terms.net, minor: metrics.netMinor },
  ];
  const glyph = { plus: "+", minus: "−", equals: "=" } as const;
  return (
    <div role="group" aria-labelledby={`${id}-title`} data-planning-note="" className="flex flex-col gap-1.5 rounded-[16px] bg-sunken px-4 pt-3.5 pb-2">
      <p id={`${id}-title`} className="text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] text-[var(--comp-field-muted-fg)] uppercase">{note.overline}</p>
      <p data-planning-value="" className="text-[1.0625rem] leading-[1.3] font-semibold text-ink tabular-nums">{signedMoney(net)}</p>
      <p className="text-[0.8125rem] leading-[1.45] text-pretty text-[var(--comp-field-muted-fg)]">{net < 0n ? note.negative : note.fixed}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-how`}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[var(--radius-md)] px-2 text-[0.8125rem] font-semibold text-ink underline underline-offset-4 hover:bg-raised/60"
      >
        {note.how}
        <AppIcon name="caret-right" weight="bold" size={14} className={`motion-safe:transition-transform motion-safe:duration-[var(--duration-quick)] ${open ? "rotate-90" : ""}`} />
      </button>
      <dl id={`${id}-how`} hidden={!open} className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t-[length:var(--border-hairline)] border-border pt-2.5 text-[0.8125rem] leading-[1.45]">
        {rows.map((row) => (
          <div key={row.label} className={`col-span-2 grid grid-cols-subgrid items-baseline py-1 ${row.sign === "equals" ? "mt-1 border-t-[length:var(--border-hairline)] border-border pt-2 font-semibold text-ink" : "text-[var(--comp-field-muted-fg)]"}`}>
            <dt className="flex min-w-0 items-baseline gap-1.5">
              <span aria-hidden="true" className="inline-block w-3 shrink-0 text-center font-semibold text-ink">{row.sign ? glyph[row.sign] : ""}</span>
              <span className="min-w-0">{row.sign ? <span className="sr-only">{note.signs[row.sign]} </span> : null}{row.label}</span>
            </dt>
            <dd className="text-right text-ink tabular-nums">{row.sign === "equals" ? signedMoney(BigInt(row.minor)) : money(BigInt(row.minor))}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
