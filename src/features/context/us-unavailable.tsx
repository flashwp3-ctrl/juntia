"use client";
// T034 / FR-016; US-3 escenario 7 (spec 003): Nosotros sin pareja activa sigue «todavía no disponible» de P0-1, ahora con
// el acceso a «Invitar a mi pareja». Con la invitación pendiente lleva a verla; con la pareja activa y sin los gastos
// compartidos del PR C, dice que ya son pareja. No lee datos: el estado de la pareja lo trajo el layout.
import Link from "next/link";
import { UnavailableState } from "@/components/shell/provisional-state";
import { AppIcon } from "@/components/ui/app-icon";
import { useAccount } from "@/features/account/account-context";
import { copy } from "@/lib/copy/es";

const action = "relative inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-raised px-4 text-[length:var(--label-m-size)] font-semibold text-ink shadow-raised";

export function UsUnavailable() {
  const couple = useAccount()?.couple ?? null;
  if (couple === "active") return <UnavailableState icon="users-three" title={copy.us.title} description={copy.us.activeDescription} />;
  if (couple === "provisional") {
    return (
      <UnavailableState icon="users-three" title={copy.us.title} description={copy.us.pendingDescription}
        actions={<Link href="/cuenta/pareja" className={action}><AppIcon name="hourglass-medium" weight="bold" size={17} />{copy.us.seeInvitation}</Link>} />
    );
  }
  return (
    <UnavailableState icon="users-three" title={copy.us.title} description={copy.us.description}
      actions={couple === "none" ? <Link href="/cuenta/pareja?invitar=1" className={action}><AppIcon name="user-plus" weight="bold" size={17} />{copy.us.invite}</Link> : undefined} />
  );
}
