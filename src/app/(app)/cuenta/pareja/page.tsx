// T047 / FR-054; US-7.6: Mi pareja dice que la pareja llega con P0-2, sin formulario de invitación (Q6).
import { UnavailableState } from "@/components/shell/provisional-state";
import { AccountPageTitle } from "@/features/account/account-ui";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.account.partner.title} · ${copy.shell.brand}` };

export default function PartnerPage() {
  return (
    <>
      <AccountPageTitle title={copy.account.partner.title} />
      <UnavailableState icon="users-three" title={copy.account.partner.unavailableTitle} description={copy.account.partner.unavailableDescription} />
    </>
  );
}
