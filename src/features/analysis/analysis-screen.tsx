"use client";
// 004 PR E (T073–T075) / FR-021–FR-025, FR-063, FR-100–FR-103; US-3; Q5, Q9, Q10; 04·2 «Análisis mensual»; MOTION_SYSTEM §5
// (Spending Story). El mes en cuatro capítulos, cada uno una región con encabezado y en este orden de lectura: cuánto (el
// gasto del mes y, si el mes anterior tiene gastos, la comparación), en qué (las categorías; con presupuesto, su límite,
// consumido, desviación y, en el mes en curso, la marca de mes transcurrido), comparado (Chart de los meses con gasto) y lo
// apartado (aportes a metas, aparte del gasto, y la PlanningNote). Sin presupuesto, ninguna barra fingida (DEC-R01); nunca
// «te alcanza» (DEC-R17); `total_destinado_neto` solo en la PlanningNote (DEC-G04). Las cifras vienen del servidor; aquí solo
// se formatean, se ordenan y se dibujan (FR-063).
// Desde 1024, dos columnas con los capítulos en la rejilla (1 | 2, 3 | 4): el orden del DOM no cambia.
import Link from "next/link";
import { animate } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { categories as categoryIcons } from "@/components/ui/category-icon";
import { budgetState, displayedPercent } from "@/domain/budgets";
import type { CategoryId } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { monthName, monthTitle, pesos } from "@/lib/format";
import { counterMs } from "@/lib/motion/tokens";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { money } from "./format";
import { MonthChart } from "./month-chart";
import { PlanningNote } from "./planning-note";
import type { AnalysisCategory, AnalysisContext, AnalysisData } from "./types";

type Phase = "shown" | "waiting" | "entering";
// Fondos y tintas de categoría como clases literales (Tailwind no ve clases compuestas), los mismos de «En qué se fue».
const tileBg: Record<CategoryId, string> = {
  market: "bg-category-market-bg", restaurants: "bg-category-restaurants-bg", home: "bg-category-home-bg", transport: "bg-category-transport-bg",
  health: "bg-category-health-bg", entertainment: "bg-category-entertainment-bg", shopping: "bg-category-shopping-bg",
  services: "bg-category-services-bg", income: "bg-category-income-bg", other: "bg-category-other-bg",
};
// El relleno de la barra de presupuesto, el color del pictograma de la categoría, como BudgetIndicator en Plan.
const barFill: Record<CategoryId, string> = {
  market: "bg-category-market-fg", restaurants: "bg-category-restaurants-fg", home: "bg-category-home-fg", transport: "bg-category-transport-fg",
  health: "bg-category-health-fg", entertainment: "bg-category-entertainment-fg", shopping: "bg-category-shopping-fg",
  services: "bg-category-services-fg", income: "bg-category-income-fg", other: "bg-category-other-fg",
};
const categoryFg: Record<CategoryId, string> = {
  market: "text-category-market-fg", restaurants: "text-category-restaurants-fg", home: "text-category-home-fg", transport: "text-category-transport-fg",
  health: "text-category-health-fg", entertainment: "text-category-entertainment-fg", shopping: "text-category-shopping-fg",
  services: "text-category-services-fg", income: "text-category-income-fg", other: "text-category-other-fg",
};
const enter = "cubic-bezier(.2,0,0,1)";
const overline = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase";
const weight = (minor: string) => Number(BigInt(minor) / 100n);
const byAmount = (a: AnalysisCategory, b: AnalysisCategory) => (BigInt(b.consumedMinor) > BigInt(a.consumedMinor) ? 1 : BigInt(b.consumedMinor) < BigInt(a.consumedMinor) ? -1 : 0);

/**
 * Un capítulo: entra una sola vez cuando llega al 30 % de la vista (y 12 → 0 y opacidad, 320 ms). El servidor y la primera
 * pintura lo dejan visible: solo después de montar, y sin movimiento reducido, se esconden los capítulos que aún están por
 * debajo de la vista, así que nada queda invisible sin JavaScript y lo que ya está a la vista no se repite. Un cambio de mes
 * no lo vuelve a esconder (sin re-entrada).
 */
function Chapter({ number, title, children, className = "" }: { number: number; title: string; children: (phase: Phase) => ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("shown");
  useEffect(() => {
    const element = ref.current;
    // Revisión del gestor del PR #71 (bloqueante 1): `reduced` es `false` en la hidratación (instantánea del servidor) y pasa a
    // `true` en el render siguiente. Por eso el efecto lee también `matchMedia` y no esconde nada con movimiento reducido, y la
    // fase que se pinta es `shown` siempre que haya movimiento reducido (`visible`, abajo), aunque un efecto anterior la cambiara.
    const prefersReduced = reduced || (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (prefersReduced) return;
    if (!element || typeof IntersectionObserver === "undefined") return;
    // Solo lo que empieza por debajo de la vista espera su entrada (revisión del PR #71, 4): lo que ya asoma no parpadea.
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setPhase("waiting");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && (entry.intersectionRatio >= 0.3 || entry.intersectionRect.height >= window.innerHeight * 0.3)) {
        setPhase("entering");
        observer.disconnect();
      }
    }, { threshold: [0, 0.15, 0.3] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);
  const visible: Phase = reduced ? "shown" : phase;
  const id = `analysis-chapter-${number}`;
  return (
    <section
      ref={ref}
      aria-labelledby={id}
      data-chapter-phase={visible}
      className={`flex min-w-0 flex-col gap-4 ${className}`}
      style={visible === "shown" ? undefined : { opacity: visible === "waiting" ? 0 : 1, transform: visible === "waiting" ? "translateY(12px)" : "none", transition: `opacity 320ms ${enter}, transform 320ms ${enter}` }}
    >
      <div className="flex flex-col gap-1">
        <p aria-hidden="true" className={overline}>{copy.analysis.chapter(number)}</p>
        <h2 id={id} className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{title}</h2>
      </div>
      {children(visible)}
    </section>
  );
}

/** El gasto del mes: al cambiar de mes cuenta del valor anterior al nuevo en 240 ms; en la primera pintura y con movimiento
 * reducido, el valor final. El último cuadro es siempre el `bigint` formateado; el lector oye solo el valor final. */
function Counter({ minor }: { minor: string }) {
  const reduced = usePrefersReducedMotion();
  const value = BigInt(minor);
  const final = money(value);
  const [shown, setShown] = useState(final);
  const previous = useRef<bigint | null>(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === null || from === value || reduced) { setShown(money(value)); return; }
    const controls = animate(Number(from / 100n), Number(value / 100n), {
      duration: counterMs / 1000, ease: [0.2, 0, 0, 1],
      onUpdate: (latest) => setShown(money(BigInt(Math.round(latest)) * 100n)),
      onComplete: () => setShown(money(value)),
    });
    return () => controls.stop();
  }, [value, reduced]);
  return (
    <span className="block text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink lg:text-[length:var(--money-xl-size)] lg:tracking-[var(--money-xl-tracking)]">
      <span aria-hidden="true" data-counting-value="" className="tabular-nums">{reduced ? final : shown}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}

function MonthArrow({ target, direction }: { target: string | null; direction: "previous" | "next" }) {
  const icon = direction === "previous" ? "caret-left" : "caret-right";
  const box = "grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]";
  if (!target) return <span aria-hidden="true" className={`${box} text-ink-secondary opacity-40`}><AppIcon name={icon} weight="bold" size={20} /></span>;
  const label = monthTitle(target);
  return (
    <Link href={`/plan/analisis?mes=${target}`} scroll={false} aria-label={direction === "previous" ? copy.analysis.previousMonth(label) : copy.analysis.nextMonth(label)} className={`${box} bg-raised text-ink shadow-raised hover:bg-sunken`}>
      <AppIcon name={icon} weight="bold" size={20} />
    </Link>
  );
}

/** Una categoría con presupuesto vigente en el mes: límite, consumido, desviación y, en el mes en curso, la marca de mes
 * transcurrido (Q9: aritmética, sin proyección). El estado sale del dominio y nunca va solo en el color (FR-017). */
function BudgetLine({ row, context, elapsed }: { row: AnalysisCategory; context: AnalysisContext; elapsed: number | null }) {
  const name = copy.categories[row.categoryId];
  const consumed = BigInt(row.consumedMinor);
  const limit = BigInt(row.limitMinor!);
  const state = budgetState(consumed, limit);
  const percent = displayedPercent(consumed, limit)!;
  const width = consumed >= limit ? 100 : Number((consumed * 10000n) / limit) / 100;
  const status = state === "over"
    ? copy.plan.over[context](money(consumed - limit), percent)
    : state === "near" || consumed === 0n ? copy.plan.leftPercent(money(limit - consumed), percent) : copy.plan.left(money(limit - consumed));
  const tone = state === "over" ? "text-[var(--comp-danger-text-fg)]" : state === "near" ? "text-warning" : "text-ink-secondary";
  return (
    <li data-budget-state={state} className="flex flex-col gap-1.5 border-b-[length:var(--border-hairline)] border-border py-3 last:border-b-0">
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[length:var(--body-m-size)] font-medium text-ink">{name}</span>
        <span className="text-[length:var(--body-m-size)] tabular-nums">
          <span className="font-semibold text-ink">{pesos({ amountMinor: consumed, currency: "COP" })}</span>{" "}
          <span className="text-ink-secondary">{copy.plan.of(pesos({ amountMinor: limit, currency: "COP" }))}</span>
        </span>
      </span>
      <span className="relative block">
        <span role="img" aria-label={copy.plan.bar(name, pesos({ amountMinor: consumed, currency: "COP" }), pesos({ amountMinor: limit, currency: "COP" }), percent)} data-budget-bar="" className="relative block h-2 w-full overflow-hidden rounded-full bg-track">
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${state === "over" ? "" : barFill[row.categoryId]}`}
            style={{ width: `${width}%`, ...(state === "over" ? { backgroundImage: "repeating-linear-gradient(135deg, var(--color-status-danger) 0 4px, color-mix(in srgb, var(--color-status-danger) 55%, transparent) 4px 7px)" } : {}) }}
          />
        </span>
        {elapsed !== null ? <span aria-hidden="true" data-elapsed-mark="" className="absolute -top-1 -bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-ink-secondary" style={{ left: `${elapsed}%` }} /> : null}
      </span>
      <span className={`flex items-center gap-[5px] text-[12px] font-medium tabular-nums ${tone}`}>
        {state === "near" ? <AppIcon name="warning" weight="bold" size={13} /> : state === "over" ? <AppIcon name="warning-circle" weight="bold" size={13} className="text-danger" /> : null}
        {status}
      </span>
    </li>
  );
}

/** Días transcurridos del mes en curso sobre sus días, truncado (Q9). `null` en un mes que no es el actual. */
function elapsedPercent(month: string, today: string) {
  if (today.slice(0, 7) !== month) return null;
  const [year, number, day] = today.split("-").map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Math.trunc(((day - 1) * 100) / days);
}

export function AnalysisScreen({ data }: { data: AnalysisData }) {
  const { context, month, metrics } = data;
  const name = monthName(month);
  const spent = metrics ? BigInt(metrics.spentMinor) : 0n;
  const contributed = metrics ? BigInt(metrics.contributedMinor) : 0n;
  const spentRows = data.categories.filter((row) => BigInt(row.consumedMinor) > 0n).sort(byAmount);
  const budgets = data.categories.filter((row) => row.limitMinor !== null).sort(byAmount);
  const elapsed = budgets.length > 0 ? elapsedPercent(month, data.today) : null;
  const comparison = data.comparison;
  const difference = comparison ? BigInt(comparison.differenceMinor) : 0n;
  const previousName = comparison ? monthName(comparison.previousMonth) : "";

  return (
    <div className="flex flex-col gap-8 pt-4 pb-10 lg:gap-12 lg:pt-8">
      <div role="group" aria-label={copy.analysis.month} className="flex items-center gap-2 lg:max-w-[360px]">
        <MonthArrow target={data.navigation.previous} direction="previous" />
        <p className="min-w-0 flex-1 text-center font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink" aria-live="polite">{monthTitle(month)}</p>
        <MonthArrow target={data.navigation.next} direction="next" />
      </div>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-x-16 lg:gap-y-14">
        <Chapter number={1} title={copy.analysis.chapters.amount}>
          {() => (
            <>
              {spent > 0n ? (
                <p className="flex flex-col gap-1">
                  <span className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.analysis.spent[context]}</span>{" "}
                  <Counter minor={metrics!.spentMinor} />
                </p>
              ) : (
                <p className="font-serif text-[length:var(--title-l-size)] leading-[1.15] font-medium text-balance text-ink">{copy.analysis.noSpending[context](name)}</p>
              )}
              {comparison ? (
                <p className="max-w-[44ch] text-[length:var(--body-m-size)] leading-[1.5] text-pretty text-ink-secondary">
                  {difference > 0n
                    ? copy.analysis.comparison.more(money(difference), comparison.percent, previousName)
                    : difference < 0n
                      ? copy.analysis.comparison.less(money(-difference), -comparison.percent, previousName)
                      : copy.analysis.comparison.same(previousName)}
                  {comparison.categories.length > 0 ? <> {copy.analysis.comparison.rose(comparison.categories.map((id) => copy.categories[id]))}</> : null}
                </p>
              ) : null}
            </>
          )}
        </Chapter>

        <Chapter number={2} title={copy.analysis.chapters.where} className="lg:row-span-2">
          {(phase) => (
            <>
              {spentRows.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {spentRows.map((row, index) => (
                    <li
                      key={row.categoryId}
                      aria-label={copy.activity.categoryChip(copy.categories[row.categoryId], pesos({ amountMinor: BigInt(row.consumedMinor), currency: "COP" }))}
                      // Las fichas crecen en ancho hasta su proporción (stagger de 40 ms) cuando el capítulo entra.
                      style={{ flexGrow: weight(row.consumedMinor), transform: phase === "waiting" ? "scaleX(.6)" : undefined, transformOrigin: "left", transition: phase === "shown" ? undefined : `transform 420ms ${enter} ${index * 40}ms` }}
                      className={`flex min-h-[80px] min-w-[104px] basis-[104px] flex-col justify-between gap-1.5 rounded-[16px] px-3 py-2.5 ${tileBg[row.categoryId]}`}
                    >
                      <span aria-hidden="true" className="flex min-w-0 flex-col items-start gap-1 text-[length:var(--label-s-size)] font-semibold text-ink">
                        <AppIcon name={categoryIcons[row.categoryId].icon} weight="duotone" size={18} className={categoryFg[row.categoryId]} />
                        <span className="max-w-full truncate">{copy.categories[row.categoryId]}</span>
                      </span>
                      <span aria-hidden="true" className="text-[13px] font-semibold text-ink tabular-nums">{pesos({ amountMinor: BigInt(row.consumedMinor), currency: "COP" })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.analysis.where.none}</p>
              )}
              {budgets.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <h3 id="analysis-budgets" className={overline}>{copy.analysis.where.budgets}</h3>
                  <ul aria-labelledby="analysis-budgets" className="flex flex-col">
                    {budgets.map((row) => <BudgetLine key={row.categoryId} row={row} context={context} elapsed={elapsed} />)}
                  </ul>
                  {elapsed !== null ? <p className="text-[12px] leading-[1.45] text-ink-secondary">{copy.analysis.where.elapsed(elapsed)}</p> : null}
                </div>
              ) : spentRows.length > 0 ? (
                <p className="text-[13px] leading-[1.45] text-pretty text-ink-secondary">{copy.analysis.where.noBudgets[context]}</p>
              ) : null}
            </>
          )}
        </Chapter>

        <Chapter number={3} title={copy.analysis.chapters.compared}>
          {(phase) => (
            <>
              {data.history.length > 0 ? <MonthChart months={data.history} selected={month} waiting={phase === "waiting"} /> : null}
              {data.history.length <= 1 ? <p className="text-[13px] leading-[1.45] text-pretty text-ink-secondary">{data.history.length === 0 ? copy.analysis.compared.empty : copy.analysis.compared.first}</p> : null}
            </>
          )}
        </Chapter>

        <Chapter number={4} title={copy.analysis.chapters.setAside}>
          {() => (
            <>
              <p className="flex items-start gap-2.5 text-[length:var(--body-m-size)] leading-[1.5] text-pretty text-ink">
                <AppIcon name="piggy-bank" weight="duotone" size={20} className="mt-0.5 shrink-0 text-saving" />
                <span>
                  {contributed > 0n
                    ? context === "us" && data.contributors && data.contributors.length > 0
                      ? copy.analysis.setAside.us(money(contributed), data.contributors.map((part) => copy.analysis.setAside.part(part.name, money(BigInt(part.amountMinor)))).join(" · "))
                      : copy.analysis.setAside.me(money(contributed))
                    : copy.analysis.setAside.none[context](name)}
                </span>
              </p>
              {metrics ? <PlanningNote metrics={metrics} /> : null}
            </>
          )}
        </Chapter>
      </div>
    </div>
  );
}
