// T047 / FR-051: Mi perfil, en la pila móvil (/cuenta/perfil) y en la columna abierta de escritorio (/cuenta).
import { copy } from "@/lib/copy/es";
import { saveDisplayName } from "./actions";
import { AccountPageTitle } from "./account-ui";
import type { Account } from "./load-account";
import { ProfileForm } from "./profile-form";

export function ProfileSection({ account }: { account: Account }) {
  return (
    <>
      <AccountPageTitle title={copy.account.profile.title} />
      <div className="mt-[18px]">
        <ProfileForm initialName={account.profile.displayName} email={account.email} save={saveDisplayName} />
      </div>
    </>
  );
}
