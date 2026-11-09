// 004 PR C (T046, T047) / FR-093; contracts/errors.md (JT201–JT217, JT225). El texto de un rechazo confirmado de una
// escritura de metas: dice qué no se hizo y por qué, sin inventar cifras que el servidor no dio (el máximo vigente sale de
// la página, que se pide otra vez al rechazar).
import type { WriteError } from "@/features/shared/write-result";
import { copy } from "@/lib/copy/es";

export function goalRejection(error: WriteError, options: { available?: string; changedBy?: string; prefix?: string } = {}) {
  switch (error) {
    case "goalNotFound": return copy.goals.errors.notFound;
    case "goalNotOpen": return copy.goals.errors.notOpen;
    case "insufficientFunds": return options.available ? copy.goals.errors.insufficient(options.available) : copy.goals.errors.notOpen;
    case "entryNotFound": return copy.goals.errors.entryNotFound;
    case "entryAlreadyVoided": return copy.goals.errors.alreadyVoided;
    case "entryDate": return copy.goals.errors.date;
    case "goalTransition": return copy.goals.errors.cannotArchive;
    case "invalidGoal": return copy.goals.form.errors.name;
    case "reasonRequired": return copy.goals.withdraw.errors.reason;
    case "goalUndoNotAvailable": return copy.goals.errors.undoNotAvailable;
    case "versionConflict": return copy.goals.errors.versionConflict(options.changedBy ?? copy.goals.errors.someone);
    case "coupleNotActive": return copy.couple.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return `${options.prefix ? `${options.prefix} ` : ""}${copy.errors.unexpected}`;
  }
}
