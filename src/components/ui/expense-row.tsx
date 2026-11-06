// T065 / US-3.2, US-6.1; COMPONENT_SPECIFICATIONS.md §ExpenseRow (02·1). Variantes de P0-1: gasto (tinta, sin signo) e
// ingreso («+», ficha arena, tinta). Todo es privado en P0-1, así que la meta lleva el candado de «Solo tú» (variante
// privado). Propuesta §15.9 «Gasto, ingreso y liquidación en tinta»: se aprueba viendo la pantalla.
// La fila entera es un enlace al detalle con el nombre accesible completo; la ficha y el candado son decorativos.
// Estado «nueva» (`isNew`): el fondo savingSubtle que se desvanece en 1,2 s lo usa E5 en el PR D; con movimiento
// reducido queda el color final sin animación.
import Link from "next/link";
import { formatMoney } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { pesos } from "@/lib/format";
import { AppIcon } from "./app-icon";
import { CategoryIcon } from "./category-icon";

type ExpenseRowProps = {
  transaction: Transaction;
  href: string;
  /** «Hoy», «Ayer» o «3 oct»: lo calcula quien conoce el día de hoy en Bogotá. */
  dateLabel: string;
  isNew?: boolean;
  /** Fila seleccionada en el panel de detalle de escritorio. */
  current?: boolean;
  className?: string;
};

export function rowTitle(transaction: Transaction) {
  return transaction.description ?? copy.categories[transaction.categoryId];
}

export function signedAmount(transaction: Transaction) {
  return `${transaction.type === "income" ? "+" : ""}${formatMoney(transaction.amount)}`;
}

export function ExpenseRow({ transaction, href, dateLabel, isNew = false, current = false, className = "" }: ExpenseRowProps) {
  const income = transaction.type === "income";
  const title = rowTitle(transaction);
  const name = copy.row.accessibleName({ title, amount: pesos(transaction.amount), income, category: copy.categories[transaction.categoryId], date: dateLabel });
  return (
    <Link
      href={href}
      aria-label={name}
      aria-current={current ? "page" : undefined}
      data-new={isNew ? "" : undefined}
      className={`-mx-2 grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-sunken aria-[current=page]:bg-sunken data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] motion-safe:transition-[background-color,scale] motion-safe:duration-[var(--duration-instant)] motion-safe:active:scale-[.99] ${className}`}
    >
      <CategoryIcon kind="category" category={transaction.categoryId} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[1.3] font-semibold text-ink">{title}</span>
        <span className="flex min-w-0 items-center gap-1 text-[12px] leading-[1.35] text-ink-secondary">
          <AppIcon name="lock-simple" size={12} className="shrink-0" />
          <span className="truncate">{copy.row.onlyYou} · {dateLabel}</span>
        </span>
      </span>
      <span data-row-amount="" className={`text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap ${income ? "text-income" : "text-expense"}`}>
        {signedAmount(transaction)}
      </span>
    </Link>
  );
}
