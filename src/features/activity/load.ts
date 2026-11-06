import "server-only";
// T066–T068 / FR-040, FR-046; research R8.7 y R8.9. Lecturas de Inicio, Actividad y el detalle con el cliente de la
// petición (src/lib/db). «Hoy» y el mes en curso se calculan en America/Bogota. Una sesión que ya no vale lleva a Entrar
// con `volver`; cualquier otro fallo de lectura es el estado de error con Reintentar (FR-042, FR-049).
import { redirect } from "next/navigation";
import { monthNavigation, todayInBogota, type Transaction } from "@/domain/transactions";
import { DbError, mapDbError } from "@/lib/db/errors";
import { getTransaction, listTransactionMonths, listTransactions } from "@/lib/db/transactions";
import { createClient } from "@/lib/supabase/server";

export type MonthData = { rows: Transaction[]; navigation: { previous: string | null; next: string | null } };
type Loaded<T> = { ok: true; value: T } | { ok: false };

const MONTH = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
/** El mes de `?mes=`, o el mes en curso si falta o no es válido. */
export const monthParam = (value: unknown, today: string) => (typeof value === "string" && MONTH.test(value) ? value : today.slice(0, 7));
export const today = () => todayInBogota();

async function guard<T>(read: () => Promise<T>, volver: string): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
    if (kind === "notAuthenticated") redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
    if (kind === "transactionNotFound") throw error;
    return { ok: false };
  }
}

/** Filas activas del mes y los límites de las flechas. */
export async function loadMonth(month: string, current: string, volver: string): Promise<Loaded<MonthData>> {
  return guard(async () => {
    const client = await createClient();
    const [rows, months] = await Promise.all([listTransactions(client, month), listTransactionMonths(client)]);
    return { rows, navigation: monthNavigation(months, current.slice(0, 7), month) };
  }, volver);
}

/** Un movimiento propio y activo, o `null` si no existe para quien pregunta (JT010). */
export async function loadTransaction(id: string, volver: string): Promise<Loaded<Transaction | null>> {
  try {
    return await guard(async () => getTransaction(await createClient(), id), volver);
  } catch (error) {
    if (error instanceof DbError && error.kind === "transactionNotFound") return { ok: true, value: null };
    throw error;
  }
}

/** Solo las filas del mes (Inicio no necesita las flechas). */
export async function loadRows(month: string, volver: string): Promise<Loaded<Transaction[]>> {
  return guard(async () => listTransactions(await createClient(), month), volver);
}
