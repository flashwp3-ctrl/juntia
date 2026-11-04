// T045, T055 / FR-029, FR-033: la cuenta llega con el inicio de sesión. No implementa ningún componente de la sección
// Cuenta (propuesta §15.9). En móvil, pantalla apilada con «Volver»; en escritorio, Mi cuenta marcado como actual.
import { PageHeader } from "@/components/shell/app-shell";
import { UnavailableState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export default function AccountPage() {
  return (
    <>
      <PageHeader title={copy.account.title} variant="account" />
      <UnavailableState icon="user-circle" title={copy.account.status} description={copy.account.description} />
    </>
  );
}
