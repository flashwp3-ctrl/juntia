// T061 (spec 003, PR D) / FR-047; SC-010 (D): la carga de Balance con la geometría final, sin cifras.
import { PageHeader } from "@/components/shell/app-shell";
import { BalanceSkeleton } from "@/features/balance/balance-skeleton";
import { copy } from "@/lib/copy/es";

export default function BalanceLoading() {
  return (
    <>
      <PageHeader title={copy.nav.balance} variant="back" />
      <BalanceSkeleton />
    </>
  );
}
