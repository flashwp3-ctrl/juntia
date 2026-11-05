// F43-4 (revisión del PR #43): A5 solo con una sesión de recuperación. La página y la Server Action exigen en el servidor
// que el claim `amr` de la sesión tenga el método `recovery` y que sea reciente (como mucho una hora: la vida del enlace,
// `otp_expiry = 3600`). Una sesión iniciada con contraseña no puede cambiar la contraseña sin enlace.
import { describe, expect, it } from "vitest";
import { RECOVERY_WINDOW_SECONDS, isRecentRecovery } from "./recovery-session";

const now = 1_800_000_000;

describe("isRecentRecovery", () => {
  it("acepta una sesión de recuperación reciente", () => {
    expect(isRecentRecovery({ amr: [{ method: "recovery", timestamp: now - 60 }] }, now)).toBe(true);
    expect(isRecentRecovery({ amr: [{ method: "token_refresh", timestamp: now - 10 }, { method: "recovery", timestamp: now - RECOVERY_WINDOW_SECONDS }] }, now)).toBe(true);
    // Enlace por token_hash (verifyOtp): GoTrue firma con «otp». Las de registro se cierran en /auth/confirm.
    expect(isRecentRecovery({ amr: [{ method: "otp", timestamp: now - 60 }] }, now)).toBe(true);
  });
  it("rechaza una sesión normal, una vieja y cualquier claim mal formado", () => {
    expect(isRecentRecovery({ amr: [{ method: "password", timestamp: now - 60 }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: [{ method: "email/signup", timestamp: now - 60 }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: [{ method: "recovery", timestamp: now - RECOVERY_WINDOW_SECONDS - 1 }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: [{ method: "otp", timestamp: now - RECOVERY_WINDOW_SECONDS - 1 }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: [{ method: "token_refresh", timestamp: now - 10 }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: [{ method: "recovery" }] }, now)).toBe(false);
    expect(isRecentRecovery({ amr: "recovery" }, now)).toBe(false);
    expect(isRecentRecovery({}, now)).toBe(false);
    expect(isRecentRecovery(null, now)).toBe(false);
  });
});
