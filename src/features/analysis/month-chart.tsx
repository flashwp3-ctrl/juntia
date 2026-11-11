"use client";
// 004 PR E (T073) / FR-022, FR-025; Q10; US-3, escenarios 4–6; COMPONENT_SPECIFICATIONS «Chart» (SVG propio en el handoff;
// aquí, cajas de CSS con la misma geometría) y MOTION_SYSTEM §5, capítulo 3. Barras mensuales de gasto, radio 8/3, el mes
// elegido en tinta y el resto en sunken, con su etiqueta corta encima (11/600). Solo gasto: el ahorro nunca se apila sobre el
// gasto (va en el capítulo 4), y solo los meses con datos (hasta seis), nunca barras de meses vacíos. Lo visual es decorativo
// para el lector de pantalla; la tabla equivalente, oculta, lleva las cifras exactas.
// Motion: las barras crecen desde la base con un stagger de 40 ms cuando el capítulo entra (`grow`), y al cambiar de mes
// interpolan su altura (240 ms) sin volver a entrar. Con movimiento reducido, todo en su sitio y cambios inmediatos.
import { copy } from "@/lib/copy/es";
import { monthTitle } from "@/lib/format";
import { compactPesos, money } from "./format";
import type { AnalysisMonth } from "./types";

const short = (month: string) => copy.dates.monthsShort[Number(month.slice(5, 7)) - 1];

export function MonthChart({ months, selected, waiting = false }: { months: readonly AnalysisMonth[]; selected: string; waiting?: boolean }) {
  const max = months.reduce((top, item) => (BigInt(item.spentMinor) > top ? BigInt(item.spentMinor) : top), 0n);
  return (
    <figure className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex h-[176px] items-end gap-2 border-b-[length:var(--border-hairline)] border-border">
        {months.map((item, index) => {
          const current = item.month === selected;
          const height = max === 0n ? 0 : Math.max(3, Number((BigInt(item.spentMinor) * 1000n) / max) / 10);
          // El mes elegido aparece al final del stagger (MOTION_SYSTEM §5).
          const delay = (current ? months.length : index) * 40;
          return (
            <div key={item.month} className="flex h-full max-w-[64px] min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`text-[11px] leading-none font-semibold whitespace-nowrap tabular-nums ${current ? "text-ink" : "text-ink-secondary"}`}>{compactPesos(BigInt(item.spentMinor))}</span>
              <div
                data-chart-bar=""
                data-current={current ? "true" : "false"}
                className={`w-full origin-bottom rounded-t-[8px] rounded-b-[3px] ${current ? "bg-ink" : "bg-sunken shadow-[inset_0_0_0_1px_var(--color-border-subtle)]"} motion-safe:transition-[height,transform] motion-safe:duration-[240ms] motion-safe:ease-[cubic-bezier(.2,0,0,1)]`}
                style={{ height: `calc((100% - 20px) * ${height / 100})`, transform: waiting ? "scaleY(0)" : undefined, transitionDelay: waiting ? undefined : `0ms, ${delay}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="-mt-1 flex gap-2">
        {months.map((item) => (
          <span key={item.month} className={`max-w-[64px] min-w-0 flex-1 text-center text-[12px] ${item.month === selected ? "font-semibold text-ink" : "text-ink-secondary"}`}>{short(item.month)}</span>
        ))}
      </div>
      <figcaption className="text-[12px] leading-[1.45] text-pretty text-ink-secondary">{copy.analysis.compared.caption}</figcaption>
      <table className="sr-only">
        <caption>{copy.analysis.compared.table}</caption>
        <thead><tr><th scope="col">{copy.analysis.compared.month}</th><th scope="col">{copy.analysis.compared.amount}</th></tr></thead>
        <tbody>
          {months.map((item) => (
            <tr key={item.month}><th scope="row">{monthTitle(item.month)}</th><td>{money(BigInt(item.spentMinor))}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
