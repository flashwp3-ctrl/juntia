"use client";
// 004 PR E (T073) / FR-022, FR-025; Q10; US-3, escenarios 4–6; COMPONENT_SPECIFICATIONS «Chart» (SVG propio en el handoff;
// aquí, cajas de CSS con la misma geometría) y MOTION_SYSTEM §5, capítulo 3. Barras mensuales de gasto, radio 8/3, el mes
// elegido en tinta y el resto en sunken, con su etiqueta corta encima (11/600). Solo gasto: el ahorro nunca se apila sobre el
// gasto (va en el capítulo 4), y solo los meses con datos (hasta seis), nunca barras de meses vacíos. Lo visual es decorativo
// para el lector de pantalla; la tabla desplegable «Ver cifras exactas» lleva las cifras exactas (F71-3, decisión de los
// fundadores del 11 nov 2026).
// Motion: las barras crecen desde la base con un stagger de 40 ms cuando el capítulo entra (`grow`), y al cambiar de mes
// interpolan su altura (240 ms) sin volver a entrar. Con movimiento reducido, todo en su sitio y cambios inmediatos.
import { useId, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { monthTitle } from "@/lib/format";
import { compactPesos, money } from "./format";
import type { AnalysisMonth } from "./types";

const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase";
const short = (month: string) => copy.dates.monthsShort[Number(month.slice(5, 7)) - 1];

export function MonthChart({ months, selected, waiting = false }: { months: readonly AnalysisMonth[]; selected: string; waiting?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const max = months.reduce((top, item) => (BigInt(item.spentMinor) > top ? BigInt(item.spentMinor) : top), 0n);
  return (
    <figure className="@container/cifras flex flex-col gap-3">
      <div aria-hidden="true" className="flex h-[176px] items-end gap-2 border-b-[length:var(--border-hairline)] border-border">
        {months.map((item, index) => {
          const current = item.month === selected;
          const height = max === 0n ? 0 : Math.max(3, Number((BigInt(item.spentMinor) * 1000n) / max) / 10);
          // El mes elegido aparece al final del stagger (MOTION_SYSTEM §5).
          const delay = (current ? months.length : index) * 40;
          return (
            <div key={item.month} className="flex h-full max-w-[64px] min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`text-[0.6875rem] leading-none font-semibold whitespace-nowrap tabular-nums ${current ? "text-ink" : "text-ink-secondary"}`}>{compactPesos(BigInt(item.spentMinor))}</span>
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
          <span key={item.month} className={`max-w-[64px] min-w-0 flex-1 text-center text-[0.75rem] ${item.month === selected ? "font-semibold text-ink" : "text-ink-secondary"}`}>{short(item.month)}</span>
        ))}
      </div>
      <figcaption className="text-[0.75rem] leading-[1.45] text-pretty text-ink-secondary">{copy.analysis.compared.caption}</figcaption>
      {/* Decisión de los fundadores del 11 nov 2026 (F71-3 del PR #71): en lugar del tooltip por teclado de
          COMPONENT_SPECIFICATIONS «Chart», una tabla visible desplegable con las cifras exactas, con el mismo patrón que «Cómo se
          calcula» de la PlanningNote. Es la equivalencia accesible del gráfico (que es decorativo) para quien usa teclado y para
          el lector de pantalla, sin duplicar: sustituye a la tabla `sr-only`. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-figures`}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[var(--radius-md)] px-2 text-[0.8125rem] font-semibold text-ink underline underline-offset-4 hover:bg-sunken"
      >
        {open ? copy.analysis.compared.hide : copy.analysis.compared.show}
        <AppIcon name="caret-right" weight="bold" size={14} className={`motion-safe:transition-transform motion-safe:duration-[var(--duration-quick)] ${open ? "rotate-90" : ""}`} />
      </button>
      {/* PR del paso 4b (autorizado el 27 nov 2026; maestro, decisión 30): a 320 con la raíz al 200 %, el `figure` mide 240 px y
          la tabla pedía 281 (el mes no baja de «Octubre» y el importe va entero en una línea): el documento medía 321 (326 en CI).
          Por debajo de 17rem de `figure` (solo con el texto ampliado: al 100 % mide 17,5rem o más), cada fila es una línea
          flexible: el mes y el importe en la misma línea si caben y, si no, el importe entero en la siguiente, alineado a la
          derecha. Los roles explícitos conservan la semántica de tabla aunque cambie el `display` (WebKit la pierde sin ellos). */}
      <table id={`${id}-figures`} hidden={!open} role="table" className="w-full border-collapse text-left text-[0.8125rem] leading-[1.45] @max-[17rem]/cifras:block">
        <caption className="sr-only">{copy.analysis.compared.table}</caption>
        <thead role="rowgroup" className="@max-[17rem]/cifras:block">
          <tr role="row" className={`${overline} @max-[17rem]/cifras:flex @max-[17rem]/cifras:justify-between`}>
            <th scope="col" role="columnheader" className="pb-2 font-semibold">{copy.analysis.compared.month}</th>
            <th scope="col" role="columnheader" className="pb-2 text-right font-semibold">{copy.analysis.compared.amount}</th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="@max-[17rem]/cifras:block">
          {months.map((item) => (
            <tr key={item.month} role="row" className="border-t-[length:var(--border-hairline)] border-border @max-[17rem]/cifras:flex @max-[17rem]/cifras:flex-wrap @max-[17rem]/cifras:items-baseline">
              <th scope="row" role="rowheader" className={`py-2 pr-3 ${item.month === selected ? "font-semibold text-ink" : "font-normal text-ink-secondary"}`}>{monthTitle(item.month)}</th>
              <td role="cell" className="py-2 text-right font-semibold whitespace-nowrap text-ink tabular-nums @max-[17rem]/cifras:ml-auto">{money(BigInt(item.spentMinor))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
