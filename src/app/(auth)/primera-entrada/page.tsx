// T045 / FR-022; US-1.7; 04·17 A6 solo con «Empezar por mi cuenta», sin «Invitar a mi pareja» y sin presupuesto (Q6).
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/domain/account";
import { FirstEntry } from "@/features/auth/first-entry";
import { loadAccount } from "@/features/account/load-account";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.auth.firstEntry.startTitle} · ${copy.shell.brand}` };

type Props = { searchParams: Promise<{ volver?: string | string[] }> };

export default async function FirstEntryPage({ searchParams }: Props) {
  const { volver: raw } = await searchParams;
  const volver = safeReturnPath(typeof raw === "string" ? raw : null);
  const account = await loadAccount();
  if (!account) redirect(`/entrar?volver=${encodeURIComponent("/primera-entrada")}`);
  if (account.profile.firstEntryCompleted) redirect(volver);
  return <FirstEntry name={account.profile.displayName} volver={volver} />;
}
