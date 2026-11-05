// T047 / FR-051; 04·14 P1–P5.
import { loadAccount } from "@/features/account/load-account";
import { ProfileSection } from "@/features/account/profile-section";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.account.profile.title} · ${copy.shell.brand}` };

export default async function ProfilePage() {
  const account = await loadAccount();
  return account ? <ProfileSection account={account} /> : null;
}
