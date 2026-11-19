// P0-1, PR C (FR-040, FR-046; maestro §5.2). Cómo se dicen en pantalla las fechas y los importes. Las fechas de
// movimiento son días sin hora (`AAAA-MM-DD`); «hoy» llega de `todayInBogota` y nunca de la zona del dispositivo. Los
// nombres de meses y días salen del módulo de copy, no de Intl, para que «oct» no se vuelva «oct.» según el motor.
import type { Money } from "@/domain/money";
import { shiftMonth } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";

const parts = (date: string) => date.split("-").map(Number);

// 005 · PR B (corrección 3, INP): un solo formateador; se llama en cada fila al volver a pintarse.
const thousands = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** «412.900»: el importe en pesos con separador de miles, sin símbolo, para nombres accesibles y fichas. */
export function pesos(money: Money): string {
  const absolute = money.amountMinor < 0n ? -money.amountMinor : money.amountMinor;
  return thousands.format((absolute + 50n) / 100n);
}

/** «octubre». */
export const monthName = (month: string) => copy.dates.months[parts(month)[1] - 1];

/** «Octubre 2026». */
export function monthTitle(month: string) {
  const name = monthName(month);
  return copy.activity.monthTitle(name.charAt(0).toUpperCase() + name.slice(1), String(parts(month)[0]));
}

/** «3 oct». */
export function shortDate(date: string) {
  const [, month, day] = parts(date);
  return `${day} ${copy.dates.monthsShort[month - 1]}`;
}

/** «Hoy», «Ayer» o «3 oct», respecto del día de hoy en Bogotá. */
export function dayLabel(date: string, today: string) {
  if (date === today) return copy.dates.today;
  const [year, month, day] = parts(today);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  return date === yesterday ? copy.dates.yesterday : shortDate(date);
}

/** «Jueves 5 de noviembre». */
export function longDate(date: string) {
  const [year, month, day] = parts(date);
  return `${copy.dates.weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]} ${day} de ${copy.dates.months[month - 1]}`;
}

/** Días que quedan del mes después de hoy. */
export function daysLeftInMonth(today: string) {
  const [year, month, day] = parts(today);
  const [nextYear, nextMonth] = parts(shiftMonth(today.slice(0, 7), 1));
  return Math.round((Date.UTC(nextYear, nextMonth - 1, 1) - Date.UTC(year, month - 1, day)) / 86_400_000) - 1;
}

/** «3 oct 2026, 7:00 a. m.»: un instante en la hora de Bogotá, para la línea de autoría del detalle. */
export function instantInBogota(iso: string) {
  const value = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  const time = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" }).format(value);
  return `${shortDate(date)} ${date.slice(0, 4)}, ${time}`;
}
