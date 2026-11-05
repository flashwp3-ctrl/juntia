// T045 / FR-022, FR-023; 04·17 A3. El mismo texto para cualquier resultado del registro (contracts/errors.md).
import { VerifyEmail } from "@/features/auth/verify-email";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.auth.verifyEmail.title} · ${copy.shell.brand}` };

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
