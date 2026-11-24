// T047 / FR-050, FR-051; 04·14 C1 en la pila móvil y de tablet. PR B de la 003 (T034): la fila de Mi pareja dice el
// estado real de la pareja («Con Tomás · activa», como el comp), y el avatar lleva el color por orden de ingreso.
// «Términos y privacidad» no aparece: P0-1 no tiene documentos legales (Q9) y lo que la app no hace no es una fila
// (COMPONENT_SPECIFICATIONS.md §AccountMenuItem). Desde 1280, la columna izquierda del layout ya es C1 y aquí se abre
// Mi perfil.
import { SignOutRow } from "@/features/account/account-controls";
import { AccountMenuItem, AccountPageTitle, MenuGroup, ProfileHeader } from "@/features/account/account-ui";
import { loadAccount } from "@/features/account/load-account";
import { loadCoupleForShell, partnerOf, personOf } from "@/features/couple/load";
import { ProfileSection } from "@/features/account/profile-section";
import { copy } from "@/lib/copy/es";

export const metadata = { title: copy.account.title };

export default async function AccountPage() {
  const [account, couple] = await Promise.all([loadAccount(), loadCoupleForShell()]);
  if (!account) return null;
  const partner = partnerOf(couple);
  const partnerHint = partner ? copy.account.menu.partnerActive(partner) : couple?.status === "provisional" ? copy.account.menu.partnerPending : copy.account.menu.partnerNone;
  const person = personOf(couple);
  const theme = copy.account.appearance[account.profile.theme];
  return (
    <>
      <div className="xl:hidden">
        <AccountPageTitle title={copy.account.title} backHref="/" />
        <div className="mt-[18px]"><ProfileHeader displayName={account.profile.displayName} email={account.email} person={person} /></div>
        <MenuGroup title={copy.account.groups.mySpace}>
          <AccountMenuItem href="/cuenta/perfil" icon="user-circle" tone="home" title={copy.account.menu.profile} hint={copy.account.menu.profileHint} />
          <AccountMenuItem href="/cuenta/pareja" icon="users-three" tone="restaurants" title={copy.account.menu.partner} hint={partnerHint} last />
        </MenuGroup>
        <MenuGroup title={copy.account.groups.preferences}>
          <AccountMenuItem href="/cuenta/apariencia" icon="circle-half" tone="entertainment" title={copy.account.menu.appearance} value={theme} last />
        </MenuGroup>
        <MenuGroup title={copy.account.groups.privacySecurity}>
          <AccountMenuItem href="/cuenta/privacidad" icon="shield-check" tone="health" title={copy.account.menu.privacy} hint={copy.account.menu.privacyHint} />
          <AccountMenuItem href="/cuenta/seguridad" icon="key" tone="transport" title={copy.account.menu.security} hint={copy.account.menu.securityHint} last />
        </MenuGroup>
        <SignOutRow />
      </div>
      <div className="hidden xl:block">
        <ProfileSection account={account} person={person} />
      </div>
    </>
  );
}
