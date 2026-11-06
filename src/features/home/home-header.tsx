"use client";
// T066: el encabezado de Inicio («Hola, Sara», 04·1) con el nombre que el layout ya leyó (AccountProvider). Lo usan la
// página y loading.tsx, así que el encabezado del Skeleton y el final son el mismo (CLS = 0, maestro §15.7).
import { PageHeader } from "@/components/shell/app-shell";
import { useAccount } from "@/features/account/account-context";
import { copy } from "@/lib/copy/es";

export function HomeHeader() {
  const account = useAccount();
  return <PageHeader title={account ? copy.home.greeting(account.displayName) : copy.nav.home} />;
}
