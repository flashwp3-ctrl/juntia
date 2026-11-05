// T045 / FR-022; 04·17 A4 y A4b; caso límite «Enlace de recuperación caducado o usado» (`?enlace=caducado`).
import { RecoverForm } from "@/features/auth/recover-form";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.auth.recover.title} · ${copy.shell.brand}` };

type Props = { searchParams: Promise<{ enlace?: string | string[] }> };

export default async function RecoverPage({ searchParams }: Props) {
  const { enlace } = await searchParams;
  return <RecoverForm expired={enlace === "caducado"} />;
}
