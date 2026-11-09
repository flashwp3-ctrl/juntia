"use client";
// 004 PR B (T033) / FR-015–FR-017, FR-101, FR-103, FR-113; COMPONENT_SPECIFICATIONS «BudgetIndicator (opcional)»; 04·2 Plan.
// Una categoría del mes, como fila de lista:
// - Con presupuesto: «640.000 de 900.000», barra de 8 px con el color del pictograma (`role="img"` con las cifras) y el
//   estado en texto. Dentro: «Quedan X» (con «· 0 %» si aún no hay consumo, para que se lea como un presupuesto real).
//   Cerca (≥ 85 %): texto ámbar con `warning` y CERCA DEL LÍMITE. Excedido: barra rayada coral, «Se pasaron por X · N %»
//   con `warning-circle` y EXCEDIDO. El estado nunca va solo en el color (FR-017).
// - Sin presupuesto: fila punteada «$X · sin presupuesto» con «Crear»; nunca barra, 0 % ni límite (DEC-R01).
// El estado y el porcentaje salen del dominio (comparación exacta en unidades menores, porcentaje truncado; FR-016).
import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon, type Category } from "@/components/ui/category-icon";
import { budgetState, displayedPercent } from "@/domain/budgets";
import { formatMoney } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { pesos } from "@/lib/format";
import type { PlanContext, PlanRow } from "./types";

// El relleno de la barra es el color del pictograma de la categoría (COMPONENT_SPECIFICATIONS), en clases literales.
const fills: Record<Category, string> = {
  market: "bg-category-market-fg", restaurants: "bg-category-restaurants-fg", home: "bg-category-home-fg", transport: "bg-category-transport-fg",
  health: "bg-category-health-fg", entertainment: "bg-category-entertainment-fg", shopping: "bg-category-shopping-fg", services: "bg-category-services-fg",
  income: "bg-category-income-fg", other: "bg-category-other-fg",
};
// Rayado coral del excedido (comp 04·2), con los tokens de peligro: sin hex.
const striped = { backgroundImage: "repeating-linear-gradient(135deg, var(--color-status-danger) 0 4px, color-mix(in srgb, var(--color-status-danger) 55%, transparent) 4px 7px)" };
const money = (minor: bigint) => ({ amountMinor: minor, currency: "COP" as const });

type Props = { row: PlanRow; context: PlanContext; onOpen: (row: PlanRow) => void };

export function BudgetIndicator({ row, context, onOpen }: Props) {
  const name = copy.categories[row.categoryId];
  const consumed = BigInt(row.consumedMinor);
  if (row.limitMinor === null) {
    return (
      <li data-budget-state="none" className="mt-3 flex items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-dashed border-border-emphasis px-3.5 py-3 first:mt-0">
        <span className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon kind="category" category={row.categoryId} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="text-[length:var(--body-m-size)] font-semibold text-ink">{name}</span>
            <span className="text-[12px] text-ink-secondary tabular-nums">{copy.plan.noBudget(formatMoney(money(consumed)))}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => onOpen(row)}
          aria-label={copy.plan.createFor(name)}
          className="relative -mr-2 inline-flex h-11 shrink-0 items-center rounded-[var(--radius-md)] px-2.5 text-[13px] font-semibold text-ink underline underline-offset-4 hover:bg-sunken"
        >
          {copy.plan.create}
        </button>
      </li>
    );
  }
  const limit = BigInt(row.limitMinor);
  const state = budgetState(consumed, limit);
  const percent = displayedPercent(consumed, limit)!;
  const width = consumed >= limit ? 100 : Number((consumed * 10000n) / limit) / 100;
  const status = state === "over"
    ? copy.plan.over[context](pesos(money(consumed - limit)), percent)
    : state === "near" || consumed === 0n ? copy.plan.leftPercent(pesos(money(limit - consumed)), percent) : copy.plan.left(pesos(money(limit - consumed)));
  const tone = state === "over" ? "text-[var(--comp-danger-text-fg)]" : state === "near" ? "text-warning" : "text-ink-secondary";
  const statusId = `budget-${row.categoryId}-status`;
  // La fila entera abre la hoja con un botón que la cubre (sin anidar la barra dentro del botón, que la volvería
  // presentacional): la barra y el estado siguen siendo contenido legible, y el botón los lleva como descripción.
  return (
    <li data-budget-state={state} className="relative flex flex-col gap-1.5 border-b-[length:var(--border-hairline)] border-border py-3">
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-2.5 text-[length:var(--body-m-size)] font-medium text-ink">
            <CategoryIcon kind="category" category={row.categoryId} size="sm" />
            {name}
          </span>
          {state === "near" ? <Badge status="nearLimit" /> : state === "over" ? <Badge status="exceeded" /> : null}
        </span>
        <span className="shrink-0 text-right text-[length:var(--body-m-size)] tabular-nums">
          <span className="font-semibold text-ink">{pesos(money(consumed))}</span>{" "}
          <span className="text-ink-secondary">{copy.plan.of(pesos(money(limit)))}</span>
        </span>
      </span>
      <span
        role="img"
        aria-label={copy.plan.bar(name, pesos(money(consumed)), pesos(money(limit)), percent)}
        data-budget-bar=""
        data-striped={state === "over" ? "true" : "false"}
        className="relative block h-2 w-full overflow-hidden rounded-full bg-track"
      >
        <span className={`absolute inset-y-0 left-0 rounded-full ${state === "over" ? "" : fills[row.categoryId]}`} style={{ width: `${width}%`, ...(state === "over" ? striped : {}) }} />
      </span>
      <span id={statusId} className={`flex items-center gap-[5px] text-[12px] font-medium tabular-nums ${tone}`}>
        {state === "near" ? <AppIcon name="warning" weight="bold" size={13} /> : state === "over" ? <AppIcon name="warning-circle" weight="bold" size={13} className="text-danger" /> : null}
        {status}
      </span>
      <button
        type="button"
        onClick={() => onOpen(row)}
        aria-label={copy.plan.edit(name)}
        aria-describedby={statusId}
        className="absolute inset-x-[-8px] inset-y-0 rounded-[var(--radius-md)] hover:bg-sunken/50 focus-visible:outline-offset-0"
      />
    </li>
  );
}
