"use client";
// T034 / FR-014; contracts/server-actions.md §3, punto 5; research R5. Crear la cuenta y verificarla no conserva `volver`
// (el enlace del correo no lo lleva y puede abrirse en otra pestaña): al montar la app con sesión, si este dispositivo
// guarda una invitación vigente, se vuelve a /invitacion. Una vencida se borra sin abrir nada (F49-7).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearInvitationIntent, readInvitationIntent } from "./intent";

export function InvitationReturn() {
  const router = useRouter();
  useEffect(() => {
    if (readInvitationIntent()) router.replace("/invitacion");
  }, [router]);
  return null;
}

/** S3 (sesión cerrada): la intención de invitación de este dispositivo no sobrevive al cierre de sesión. */
export function ForgetInvitationIntent() {
  useEffect(() => clearInvitationIntent(), []);
  return null;
}
