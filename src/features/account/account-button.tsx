"use client";
// T047 / FR-050; COMPONENT_SPECIFICATIONS.md §AccountButton: avatar 40 (radio 14, color de persona) en un área de 44,
// anillo de 1,5 px `border.strong` separado por `surface.canvas` y ficha de engranaje de 20 en `surface.raised`. Navega a
// /cuenta en un toque, sin menú (§15.3): es un enlace con el nombre «Mi cuenta».
// SidebarAccount: fila de 56 al pie del sidebar («Nombre · Mi cuenta» + caret) y, en el rail de 1024, avatar 36 en 48.
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { personFill } from "@/components/ui/avatar";
import { copy } from "@/lib/copy/es";
import { useAccount } from "./account-context";

const hit = "relative after:absolute after:inset-0 after:content-['']";

export function AccountButton({ className = "" }: { className?: string }) {
  const account = useAccount();
  if (!account) {
    return (
      <Link href="/cuenta" className={`${hit} grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink hover:bg-sunken ${className}`}>
        <AppIcon name="user-circle" size={30} />
        <span className="sr-only">{copy.nav.account}</span>
      </Link>
    );
  }
  return (
    <Link href="/cuenta" aria-label={copy.nav.account} title={copy.nav.account} data-account-button="" className={`${hit} group grid size-11 shrink-0 place-items-center rounded-[16px] ${className}`}>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-[14px] ${personFill[account.person]} text-[15px] font-semibold text-[var(--comp-avatar-fg)] shadow-[0_0_0_2px_var(--color-surface-canvas),0_0_0_3.5px_var(--color-border-strong)] motion-safe:transition-transform motion-safe:duration-[var(--duration-instant)] group-active:scale-[.96]`}>
        {account.initial}
      </span>
      <span aria-hidden="true" className="absolute -right-[3px] -bottom-[3px] grid size-5 place-items-center rounded-[8px] bg-raised text-ink shadow-[0_0_0_2px_var(--color-surface-canvas)]">
        <AppIcon name="gear-six" weight="bold" size={12} />
      </span>
    </Link>
  );
}

export function SidebarAccount({ current }: { current: boolean }) {
  const account = useAccount();
  const name = account?.displayName ?? copy.nav.account;
  return (
    <Link
      href="/cuenta"
      aria-current={current ? "page" : undefined}
      className={`${hit} mt-auto flex size-12 items-center justify-center gap-2.5 self-center rounded-[16px] xl:size-auto xl:min-h-14 xl:justify-start xl:self-stretch xl:p-2.5 motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${current ? "bg-[var(--comp-nav-active-bg)] shadow-[var(--elevation-raised),inset_0_0_0_2px_var(--color-text-primary)]" : "hover:bg-[var(--comp-nav-active-bg)] xl:bg-sunken"}`}
    >
      {account ? (
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-[13px] ${personFill[account.person]} text-[14px] font-semibold text-[var(--comp-avatar-fg)]`}>{account.initial}</span>
      ) : (
        <AppIcon name="user-circle" weight={current ? "fill" : "regular"} size={24} />
      )}
      <span className="sr-only flex min-w-0 flex-col xl:not-sr-only">
        <span className="truncate text-[14px] leading-5 font-semibold text-ink">{name}</span>
        {account ? <span className="text-[12px] leading-4 break-words text-[var(--comp-field-muted-fg)]">{account.partnerName ? copy.account.withPartner(account.partnerName) : copy.nav.account}</span> : null}
      </span>
      <AppIcon name="caret-right" size={18} className="ml-auto hidden shrink-0 text-ink-secondary xl:block" />
    </Link>
  );
}
