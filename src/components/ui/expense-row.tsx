// T065 / US-3.2, US-6.1; COMPONENT_SPECIFICATIONS.md §ExpenseRow (02·1). Variantes de P0-1: gasto (tinta, sin signo) e
// ingreso («+», ficha arena, tinta). Todo es privado en P0-1, así que la meta lleva el candado de «Solo tú» (variante
// privado). Propuesta §15.9 «Gasto, ingreso y liquidación en tinta»: se aprueba viendo la pantalla.
// La fila entera es un enlace al detalle con el nombre accesible completo; la ficha y el candado son decorativos. El
// nombre sale de un texto oculto y no de aria-label, y lo visible queda fuera del árbol accesible: así el nombre puede
// decir «50.000 pesos» donde se ve «$ 50.000» sin romper «el texto visible está en el nombre» (WCAG 2.5.3, axe
// label-content-name-mismatch).
// Estado «nueva» (`isNew`): el fondo savingSubtle que se desvanece en 1,2 s (E5, PR D); con movimiento reducido el
// resaltado se mantiene sin desvanecerse (MOTION_SYSTEM.md §2, «Reduced motion»).
// Estado en vuelo (`pending`, UX lote 1, cambio 3): la fila de una creación que aún no tiene detalle. No es un enlace; dice
// «Guardando…» o «Sin confirmar» en la meta y en su nombre accesible, y nunca afirma que se guardó ni que no.
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
  /** Creación en vuelo: `saving` mientras responde el servidor, `unknown` si no se sabe si llegó. */
  pending?: "saving" | "unknown";
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

export function ExpenseRow({ transaction, href, dateLabel, isNew = false, pending, current = false, className = "" }: ExpenseRowProps) {
  const income = transaction.type === "income";
  const title = rowTitle(transaction);
  const pendingLabel = pending ? copy.row.pending[pending] : null;
  const name = copy.row.accessibleName({ title, amount: pesos(transaction.amount), income, category: copy.categories[transaction.categoryId], date: dateLabel }) + (pendingLabel ? `, ${pendingLabel}` : "");
  const content = (
    <>
      <span className="sr-only">{name}</span>
      <CategoryIcon kind="category" category={transaction.categoryId} />
      <span aria-hidden="true" className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[1.3] font-semibold text-ink">{title}</span>
        {/* Sobre el fondo savingSubtle de la fila nueva, la meta pasa a tinta (text.secondary da 4,38:1 en claro). */}
        <span className="flex min-w-0 items-center gap-1 text-[12px] leading-[1.35] text-ink-secondary group-hover:text-ink group-aria-[current=page]:text-ink group-data-[new]:text-ink">
          <AppIcon name="lock-simple" size={12} className="shrink-0" />
          <span className="truncate">{copy.row.onlyYou} · {dateLabel}{pendingLabel ? ` · ${pendingLabel}` : ""}</span>
        </span>
      </span>
      <span aria-hidden="true" data-row-amount="" className={`text-right text-[length:var(--money-s-size)] leading-[var(--money-s-line)] font-semibold whitespace-nowrap ${income ? "text-income" : "text-expense"}`}>
        {signedAmount(transaction)}
      </span>
    </>
  );
  const layout = "group -mx-2 grid min-h-[60px] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2 py-2.5";
  if (pending) {
    return (
      <div data-pending={pending} aria-busy={pending === "saving" ? true : undefined} data-transaction-id={transaction.id} className={`${layout} ${pending === "saving" ? "opacity-80" : ""} ${className}`}>
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      data-new={isNew ? "" : undefined}
      data-transaction-id={transaction.id}
      className={`${layout} hover:bg-sunken aria-[current=page]:bg-sunken data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] data-[new]:motion-reduce:bg-saving-subtle motion-safe:transition-[background-color,scale] motion-safe:duration-[var(--duration-instant)] motion-safe:active:scale-[.99] ${className}`}
    >
      {content}
    </Link>
  );
}
