// T045, T054 / FR-029, FR-032: Balance «todavía no disponible»; nunca «Al día» ni una cifra; no usa SharedBalance (§15.9).
// Abierto por URL en móvil muestra lo mismo y la barra no gana un sexto destino.
import { PageHeader } from "@/components/shell/app-shell";
import { UnavailableState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export default function BalancePage() {
  return (
    <>
      <PageHeader title={copy.nav.balance} />
      <UnavailableState icon="scales" title={copy.balance.title} description={copy.balance.description} />
    </>
  );
}
