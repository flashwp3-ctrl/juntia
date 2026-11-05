// T047 / FR-052; 04·16 T1. El tema se guarda en el perfil y en la cookie (Q7).
import { saveTheme } from "@/features/account/actions";
import { AccountPageTitle } from "@/features/account/account-ui";
import { loadAccount } from "@/features/account/load-account";
import { ThemeSelector } from "@/features/account/theme-selector";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.account.appearance.title} · ${copy.shell.brand}` };

export default async function AppearancePage() {
  const account = await loadAccount();
  return (
    <>
      <AccountPageTitle title={copy.account.appearance.title} />
      <div className="mt-[22px]"><ThemeSelector initial={account?.profile.theme ?? "system"} persist={saveTheme} /></div>
    </>
  );
}
