"use client";
// 004 PR B (T033) / FR-017, FR-018, FR-020, FR-100–FR-103; US-1, US-2; 04·2 PLAN (comp «PRESUPUESTOS · OPCIONALES»); handoff:
// «Actividad, Balance y Plan son listas editoriales». En móvil, una columna: el resumen del mes, el texto de presupuestos
// opcionales con los días que quedan, los presupuestos con BudgetIndicator, las categorías con gasto y sin presupuesto
// («$X · sin presupuesto · Crear»), «Crear presupuesto» y la nota de quién puede cambiarlos con el último cambio. Desde 1024,
// dos columnas: el resumen y las notas a la izquierda; la lista a la derecha.
// Sin presupuestos en el contexto (US-1): «Sin presupuesto» con `chart-pie-slice` y «Crear presupuesto (opcional)» como
// acción secundaria; nunca «$0», 0 %, «excedido» ni asequibilidad (DEC-R01, DEC-R17). Un presupuesto desactivado sin gasto
// en el mes no se pinta. Las cifras vienen del servidor; aquí solo se formatean y se ordenan.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { CATEGORY_CATALOG } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { daysLeftInMonth, monthName, shortDate } from "@/lib/format";
import { BudgetIndicator } from "./budget-indicator";
import { BudgetSheet, type BudgetDone } from "./budget-sheet";
import type { BudgetChange, PlanActions, PlanContext, PlanData, PlanRow } from "./types";

const ORDER = new Map<string, number>(CATEGORY_CATALOG.map((category, index) => [category.id, index]));
const money = (minor: string) => formatMoney({ amountMinor: BigInt(minor), currency: "COP" });

/** «Sara subió Mercado a $900.000». */
function describe(change: BudgetChange, category: string, context: PlanContext) {
  if (context === "me") {
    const mine = copy.plan.changeMe;
    return change.kind === "deactivate" ? mine.deactivate(category) : mine[change.kind](category, money(change.limitMinor!));
  }
  const phrases = copy.plan.change;
  switch (change.kind) {
    case "create": return phrases.create(change.byName, category, money(change.limitMinor!));
    case "raise": return phrases.raise(change.byName, category, money(change.limitMinor!));
    case "lower": return phrases.lower(change.byName, category, money(change.limitMinor!));
    case "keep": return phrases.keep(change.byName, category, money(change.limitMinor!));
    case "reactivate": return phrases.reactivate(change.byName, category, money(change.limitMinor!));
    case "deactivate": return phrases.deactivate(change.byName, category);
  }
}

type Sheet = { row: PlanRow | null; key: string };

export function PlanScreen({ data, actions }: { data: PlanData; actions: PlanActions }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [announce, setAnnounce] = useState("");
  const { context, month, today } = data;
  const name = monthName(month);
  const budgets = data.rows.filter((row) => row.limitMinor !== null).sort((a, b) => ORDER.get(a.categoryId)! - ORDER.get(b.categoryId)!);
  const spent = data.rows.filter((row) => row.limitMinor === null && BigInt(row.consumedMinor) > 0n)
    .sort((a, b) => (BigInt(b.consumedMinor) > BigInt(a.consumedMinor) ? 1 : BigInt(b.consumedMinor) < BigInt(a.consumedMinor) ? -1 : ORDER.get(a.categoryId)! - ORDER.get(b.categoryId)!));
  const canCreate = CATEGORY_CATALOG.some((category) => category.kind === "expense" && !budgets.some((row) => row.categoryId === category.id));
  const last = data.rows.flatMap((row) => row.history.map((change) => ({ change, row })))
    .sort((a, b) => b.change.changedAt.localeCompare(a.change.changedAt) || b.change.id.localeCompare(a.change.id))[0];

  // La clave de idempotencia nace al abrir la hoja (contracts/server-actions.md §1) y vive solo en memoria (FR-094).
  const open = (row: PlanRow | null) => setSheet({ row, key: crypto.randomUUID() });
  const onDone = useCallback((done: BudgetDone) => {
    setSheet(null);
    setAnnounce(copy.plan.saved[done]);
  }, []);
  const onClose = useCallback((options?: { unconfirmed: boolean }) => {
    setSheet(null);
    if (options?.unconfirmed) router.refresh();
  }, [router]);

  const notes = (
    <p className="text-[12px] leading-[1.5] text-pretty text-ink-secondary">
      {copy.plan.who[context]}
      {last ? <> {copy.plan.lastChange(describe(last.change, copy.categories[last.row.categoryId], context), shortDate(last.change.date))}</> : null}
    </p>
  );
  const createButton = budgets.length > 0 && canCreate
    ? <Button variant="secondary" size="lg" icon="plus" className="w-full lg:w-auto lg:self-start" onClick={() => open(null)}>{copy.plan.createBudget}</Button>
    : null;

  return (
    // Un solo orden en el DOM (resumen, lista, notas) para móvil y lector de pantalla; desde 1024 la rejilla pone las notas
    // bajo el resumen, a la izquierda, y la lista ocupa la derecha.
    <div className="flex flex-col gap-7 pt-4 pb-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-14 lg:gap-y-6 lg:pt-8">
      <section aria-labelledby="plan-summary" className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
        <h2 id="plan-summary" className="text-[12px] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase">{copy.plan.summary.title(name)}</h2>
        <p className="font-serif text-[length:var(--title-l-size)] leading-[1.15] font-medium tracking-[var(--title-l-tracking)] text-balance text-ink">
          {data.spentMinor !== null && BigInt(data.spentMinor) > 0n ? copy.plan.summary[context](money(data.spentMinor)) : copy.plan.summary.none(name)}
        </p>
        <p className="text-[length:var(--body-m-size)] leading-[1.5] text-pretty text-ink-secondary">
          <span>{copy.plan.optional[context]}</span> <span>{copy.plan.daysLeft(daysLeftInMonth(today), name)}</span>
        </p>
        {/* 004 PR E (T075; FR-021; Q5): Análisis es una ruta hija de Plan, con o sin presupuestos. */}
        <Link href={`/plan/analisis?mes=${month}`} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[var(--radius-md)] px-1 text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4 hover:bg-sunken">
          {copy.plan.analysis(name)}
          <AppIcon name="arrow-right" weight="bold" size={16} className="shrink-0" />
        </Link>
      </section>

      <section aria-labelledby="plan-budgets" className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <h2 id="plan-budgets" className="sr-only">{copy.plan.budgets}</h2>
        {budgets.length > 0 ? (
          <ul className="flex flex-col">
            {budgets.map((row) => <BudgetIndicator key={row.categoryId} row={row} context={context} onOpen={open} />)}
          </ul>
        ) : null}
        {/* «En qué se fue» sin presupuesto: una sola lista punteada (el lenguaje de lo pendiente del comp), no una tarjeta
            por categoría, para que el modo sin presupuesto no se lea como una lista de avisos (US-1). */}
        {spent.length > 0 ? (
          <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border rounded-[16px] border-[1.5px] border-dashed border-border-emphasis px-3.5">
            {spent.map((row) => <BudgetIndicator key={row.categoryId} row={row} context={context} onOpen={open} />)}
          </ul>
        ) : null}
        {budgets.length === 0 ? (
          // Sin presupuestos: una fila plana y una acción secundaria, después de lo gastado (DEC-R01; US-1, escenario 1).
          <div className="flex items-start gap-3 pt-1">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-sunken text-ink-secondary">
              <AppIcon name="chart-pie-slice" weight="duotone" size={20} />
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <span className="flex flex-col gap-0.5">
                <span className="text-[length:var(--body-m-size)] font-semibold text-ink">{copy.plan.empty.title}</span>
                <span className="text-[13px] leading-[1.45] text-pretty text-ink-secondary">{copy.plan.empty[context]}</span>
              </span>
              {/* Texto al 200 %: el botón parte su texto en dos líneas antes que salirse (FR-101). */}
              <Button variant="ghost" icon="plus" className="h-auto! min-h-11 max-w-full self-start py-2.5 text-left whitespace-normal!" onClick={() => open(null)}>{copy.plan.empty.action}</Button>
            </span>
          </div>
        ) : null}
        {createButton}
      </section>
      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
        {notes}
      </div>

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
      {sheet ? (
        <BudgetSheet
          open
          onClose={onClose}
          context={context}
          row={sheet.row}
          rows={data.rows}
          month={month}
          idempotencyKey={sheet.key}
          actions={actions}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}
