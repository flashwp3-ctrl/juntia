// T068 / FR-037 (lectura); US-4.1 (entrada al detalle); 04·1 DETALLE DE GASTO y el panel de 04·7, en su versión privada:
// sin «Pagó», «Reparto» ni «A quién le corresponde», que son de pareja. **De solo lectura**: Editar y «Eliminar gasto»
// llegan con el PR D (T082) sobre este mismo detalle. En móvil es una pantalla con «Volver»; desde 1280, el panel de 400
// junto a la tabla, con «Cerrar».
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { rowTitle, signedAmount } from "@/components/ui/expense-row";
import type { Transaction } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { instantInBogota, shortDate } from "@/lib/format";

const hit = "grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink";

/** Encabezado móvil: Volver y el tipo de movimiento, como en 04·1. Oculto desde 1280, donde manda el de Actividad. */
export function DetailHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 pt-4 xl:hidden">
      <Link href={backHref} className={`${hit} -ml-1 bg-raised shadow-raised hover:bg-sunken`}>
        <AppIcon name="caret-left" weight="bold" size={20} />
        <span className="sr-only">{copy.detail.back}</span>
      </Link>
      <h1 className="text-center text-[length:var(--body-l-size)] font-semibold text-ink">{title}</h1>
      <span />
    </header>
  );
}

function Fact({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b-[length:var(--border-hairline)] border-border py-2.5">
      <dt className="flex items-center gap-2.5 text-[length:var(--body-m-size)] text-ink-secondary">
        <AppIcon name={icon} size={18} className="shrink-0" />
        {label}
      </dt>
      <dd className="text-right text-[length:var(--body-m-size)] font-medium text-ink">{value}</dd>
    </div>
  );
}

export function TransactionDetail({ transaction, closeHref }: { transaction: Transaction; closeHref: string }) {
  const titleId = `detalle-${transaction.id}`;
  const date = `${shortDate(transaction.transactionDate)} ${transaction.transactionDate.slice(0, 4)}`;
  return (
    <article aria-labelledby={titleId} data-transaction-detail="" className="flex flex-col gap-6 pt-6 xl:gap-5 xl:rounded-[var(--radius-xl)] xl:bg-raised xl:p-6 xl:pt-5 xl:shadow-raised">
      <div className="flex flex-col items-center gap-3 text-center xl:items-start xl:text-left">
        <div className="flex w-full items-start justify-center xl:justify-between">
          <CategoryIcon kind="category" category={transaction.categoryId} size="xl" />
          <Link href={closeHref} className={`${hit} hidden hover:bg-sunken xl:grid`}>
            <AppIcon name="x" weight="bold" size={18} />
            <span className="sr-only">{copy.detail.close}</span>
          </Link>
        </div>
        <h2 id={titleId} className="max-w-full font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] break-words text-ink xl:text-[30px]">
          {rowTitle(transaction)}
        </h2>
        <p className={`text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] ${transaction.type === "income" ? "text-income" : "text-expense"}`}>
          {signedAmount(transaction)}
        </p>
      </div>
      <dl className="flex flex-col">
        <Fact icon="tag" label={copy.detail.category} value={copy.categories[transaction.categoryId]} />
        <Fact icon="calendar-blank" label={copy.detail.date} value={date} />
        <Fact icon="lock-simple" label={copy.detail.context} value={copy.detail.contextValue} />
      </dl>
      <p className="text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-ink-secondary">
        {copy.detail.noted(instantInBogota(transaction.createdAt), transaction.version > 1)}
      </p>
    </article>
  );
}
