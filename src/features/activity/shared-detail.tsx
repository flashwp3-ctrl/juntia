// T047, T049 (spec 003, PR C) / FR-022, FR-023, FR-046, FR-057; US-3.5, US-7.1; 04·1 DETALLE DE GASTO en Nosotros y el panel
// de 04·7. El detalle de un gasto compartido: monto, categoría, fecha, contexto «Nosotros», quién pagó, el reparto y «A quién
// le corresponde» con la parte de cada uno, la línea de lo que ese gasto deja en el saldo, «Anotado por X · pagó Y» y, si
// se editó, «Editado por X · fecha» (Q12). Editar y Eliminar al pie, con la versión leída (FR-057). Para su autora, un gasto
// que llegó con Mover a Pareja dice «movido desde Yo»; el otro integrante no ve nada del privado anulado (FR-036).
import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { categories, CategoryIcon } from "@/components/ui/category-icon";
import { initialOf } from "@/domain/account";
import { formatMoney } from "@/domain/money";
import { SharedTransactionActions } from "@/features/expenses/shared-transaction-actions";
import { toSavedShared } from "@/features/expenses/shared-payload";
import { ExpenseFundingDetail } from "@/features/expenses/goal-funding/funding-context";
import type { CoupleMemberView } from "@/features/home/couple-home-view";
import { memberName, rowMode } from "@/features/shared/shared-format";
import { copy } from "@/lib/copy/es";
import { instantInBogota, shortDate } from "@/lib/format";
import type { SharedTransaction } from "@/lib/db/types";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b-[length:var(--border-hairline)] border-border py-2.5">
      <dt className="text-[length:var(--body-m-size)] text-ink-secondary">{label}</dt>
      <dd className="flex items-center gap-2 text-right text-[length:var(--body-m-size)] font-medium text-ink">{children}</dd>
    </div>
  );
}

export function SharedDetail({ expense, members, closeHref }: { expense: SharedTransaction; members: readonly CoupleMemberView[]; closeHref: string }) {
  const titleId = `detalle-${expense.id}`;
  const owedId = `corresponde-${expense.id}`;
  const title = expense.description ?? copy.categories[expense.categoryId];
  const payer = members.find((member) => member.userId === expense.payerUserId);
  const ordered = [...members].sort((a, b) => a.joinOrder - b.joinOrder);
  const partOf = (userId: string) => expense.allocations.find((part) => part.userId === userId)?.amount ?? { amountMinor: 0n, currency: "COP" as const };
  // Lo que este gasto deja en el saldo: quien no pagó le debe su parte a quien pagó.
  const other = ordered.find((member) => member.userId !== expense.payerUserId);
  const owed = other ? partOf(other.userId) : null;
  const date = `${shortDate(expense.transactionDate)} ${expense.transactionDate.slice(0, 4)}`;
  const edited = expense.version > 1 && expense.updatedBy;
  return (
    <article aria-labelledby={titleId} data-transaction-detail="" className="flex flex-col gap-6 pt-6 xl:gap-5 xl:rounded-[var(--radius-xl)] xl:bg-raised xl:p-6 xl:pt-5 xl:shadow-raised">
      <div className="flex flex-col items-center gap-3 text-center xl:items-start xl:text-left">
        <div className="flex w-full items-start justify-center xl:justify-between">
          <CategoryIcon kind="category" category={expense.categoryId} size="xl" />
          <Link href={closeHref} className="hidden size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink hover:bg-sunken xl:grid">
            <AppIcon name="x" weight="bold" size={18} />
            <span className="sr-only">{copy.detail.close}</span>
          </Link>
        </div>
        <h2 id={titleId} className="max-w-full font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)] break-words text-ink xl:text-[30px]">{title}</h2>
        <p className="text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-expense">{formatMoney(expense.amount)}</p>
        {expense.movedFromMe ? <p className="text-[length:var(--body-s-size)] font-medium text-ink-secondary">{copy.move.movedFromMe}</p> : null}
      </div>
      <dl className="flex flex-col">
        <Fact label={copy.detail.category}><AppIcon name={categories[expense.categoryId].icon} size={18} className="text-ink-secondary" />{copy.categories[expense.categoryId]}</Fact>
        <Fact label={copy.detail.date}>{date}</Fact>
        <Fact label={copy.detail.context}><AppIcon name="users-three" size={18} className="text-ink-secondary" />{copy.shared.detail.context}</Fact>
        <Fact label={copy.shared.detail.payer}>{payer ? <Avatar person={payer.joinOrder} initial={initialOf(payer.name)} size={24} /> : null}{payer?.name}</Fact>
        <Fact label={copy.shared.detail.split}>{rowMode(expense)}</Fact>
      </dl>
      <section aria-labelledby={owedId} className="flex flex-col gap-2">
        <h3 id={owedId} className="text-[length:var(--overline-size)] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary">{copy.shared.detail.owed}</h3>
        <ul className="flex flex-col gap-1.5">
          {ordered.map((member) => (
            <li key={member.userId} className="flex min-h-10 items-center gap-2.5">
              <Avatar person={member.joinOrder} initial={initialOf(member.name)} size={24} />
              <span className="flex-1 text-[length:var(--body-m-size)] font-medium text-ink">{member.name}</span>
              <span className="text-[length:var(--body-m-size)] font-semibold text-ink tabular-nums">{formatMoney(partOf(member.userId))}</span>
            </li>
          ))}
        </ul>
        <p className="text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-ink-secondary">
          {owed && owed.amountMinor > 0n && other && payer ? copy.shared.detail.owesLine(other.name, payer.name, formatMoney(owed)) : copy.shared.detail.evenLine}
        </p>
      </section>
      <div className="flex flex-col gap-1 text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-ink-secondary">
        <p>{copy.shared.detail.notedBy(memberName(members, expense.createdBy), payer?.name ?? "")}</p>
        {edited ? <p>{copy.shared.detail.editedBy(memberName(members, expense.updatedBy!), instantInBogota(expense.updatedAt))}</p> : null}
      </div>
      {/* 004 PR D (T062–T064): el uso de la meta, la solicitud (B4–B7) y «Quitar el uso de la meta». */}
      <ExpenseFundingDetail transactionId={expense.id} version={expense.version} />
      <SharedTransactionActions expense={toSavedShared(expense)} backHref={closeHref} />
    </article>
  );
}
