// T032, T033 / FR-011: «vence el 10 nov». La caducidad es un instante del servidor; se dice en el día de Bogotá, con los
// meses del módulo de copy (src/lib/format.ts, shortDate), nunca en la zona del dispositivo.
import { shortDate } from "@/lib/format";

export function invitationDay(instant: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
  // Espacio duro: «vence el 13 nov» no se parte con un correo largo delante (revisión de Impeccable).
  return shortDate(day).replace(" ", " ");
}
