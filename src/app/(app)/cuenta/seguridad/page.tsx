// T047 / FR-028, FR-053; 04·16 G1, G2 y S1–S3: correo de solo lectura, cambio de contraseña por enlace y cerrar sesión.
import { Input } from "@/components/ui/input";
import { PasswordChange, SignOutGhost } from "@/features/account/account-controls";
import { AccountPageTitle, MenuGroup } from "@/features/account/account-ui";
import { loadAccount } from "@/features/account/load-account";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.account.security.title} · ${copy.shell.brand}` };

export default async function SecurityPage() {
  const account = await loadAccount();
  const email = account?.email ?? "";
  return (
    <>
      <AccountPageTitle title={copy.account.security.title} />
      <div className="mt-[18px]">
        <Input label={copy.account.profile.emailLabel} value={email} readOnly endIcon="lock-simple" fieldClassName="!bg-canvas border-[1.5px] border-dashed border-border !shadow-none" inputClassName="text-ink-secondary" />
      </div>
      <MenuGroup title={copy.account.security.password}>
        <PasswordChange email={email} />
      </MenuGroup>
      <MenuGroup title={copy.account.security.thisSession}>
        {/* Ancho máximo menor que el texto: siempre dos líneas, con la fuente real o con su respaldo (CLS = 0). */}
        <p className="max-w-[26rem] text-[0.875rem] leading-[1.5] text-ink-secondary">{copy.account.security.sessionNote}</p>
        <SignOutGhost />
      </MenuGroup>
    </>
  );
}
