// 004 PR C (T046, T047) / FR-093; contracts/errors.md (JT201–JT217, JT225). El texto de un rechazo confirmado de una
// escritura de metas: dice qué no se hizo y por qué, sin inventar cifras. El máximo vigente de un retiro es el que dio el
// servidor en el `detail` de JT204; solo si no llegó se usa el de la página (que se pide otra vez al rechazar).
import type { WriteError } from "@/features/shared/write-result";
import { copy } from "@/lib/copy/es";

type Options = {
  /** El máximo vigente, ya formateado: el que dio el servidor (JT204) o, sin él, el de la página. */
  available?: string;
  prefix?: string;
  /** Qué no se pudo hacer con una transición no admitida (JT214): lograr, archivar… Sin él, el texto general. */
  transition?: string;
  /** Anular o deshacer un aporte: un saldo insuficiente significa que esos fondos ya se usaron (Q13). */
  voiding?: boolean;
};

export function goalRejection(error: WriteError, options: Options = {}) {
  if (error === "insufficientFunds" && options.voiding) return options.available ? copy.goals.errors.fundsUsedWith(options.available) : copy.goals.errors.fundsUsed;
  switch (error) {
    case "goalNotFound": return copy.goals.errors.notFound;
    case "goalNotOpen": return copy.goals.errors.notOpen;
    case "insufficientFunds": return options.available ? copy.goals.errors.insufficient(options.available) : copy.goals.errors.notOpen;
    case "entryNotFound": return copy.goals.errors.entryNotFound;
    case "entryAlreadyVoided": return copy.goals.errors.alreadyVoided;
    case "entryDate": return copy.goals.errors.date;
    case "goalTransition": return options.transition ?? copy.goals.errors.notOpen;
    case "invalidGoal": return copy.goals.form.errors.name;
    case "reasonRequired": return copy.goals.withdraw.errors.reason;
    case "goalUndoNotAvailable": return copy.goals.errors.undoNotAvailable;
    // F68-1: sin atribuir; la lectura de la meta no dice quién la cambió.
    case "versionConflict": return copy.goals.errors.versionConflict;
    case "coupleNotActive": return copy.couple.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return `${options.prefix ? `${options.prefix} ` : ""}${copy.errors.unexpected}`;
  }
}
