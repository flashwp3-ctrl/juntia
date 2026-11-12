// T047 / FR-050, FR-056; 04·18 y RESPONSIVE_SPECIFICATIONS.md §Cuenta. Por debajo de 768, pantalla apilada sin barra; a
// 768 una columna centrada de 600; a 1024 una columna de 680; desde 1280 dos columnas: identidad y secciones (360) y la
// sección abierta (máx. 680), con «Mi cuenta» como título de la página.
import type { ReactNode } from "react";
import { AccountSectionsNav, SignOutRow } from "@/features/account/account-controls";
import { ProfileHeader } from "@/features/account/account-ui";
import { loadAccount } from "@/features/account/load-account";
import { loadCoupleForShell, personOf } from "@/features/couple/load";
import { copy } from "@/lib/copy/es";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [account, couple] = await Promise.all([loadAccount(), loadCoupleForShell()]);
  return (
    <div className="mx-auto w-full max-w-[600px] lg:max-w-[680px] xl:max-w-none">
      <p aria-hidden="true" className="hidden pb-7 font-serif text-[3.25rem] leading-none font-medium tracking-[var(--display-xl-tracking)] text-ink xl:block">{copy.account.title}</p>
      <div className="xl:grid xl:grid-cols-[360px_minmax(0,680px)] xl:items-start xl:gap-12">
        {account ? (
          <aside aria-label={copy.account.title} className="hidden flex-col gap-[18px] xl:flex">
            <ProfileHeader displayName={account.profile.displayName} email={account.email} framed person={personOf(couple)} />
            <AccountSectionsNav />
            <SignOutRow />
          </aside>
        ) : null}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
