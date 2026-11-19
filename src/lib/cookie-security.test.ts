// 005 · PR B (corrección 6, FR-020; decisión del gestor del 19 nov 2026). Criterio literal: «`secure=true` con un host cualquiera,
// y `false` solo con localhost» (o 127.0.0.1). Capa: unidad. Ni el protocolo ni `x-forwarded-proto` intervienen.
import { describe, expect, it } from "vitest";
import { cookieSecure } from "./cookie-security";
import { themeCookieOptions } from "./theme";

describe("Secure de las cookies propias por host (corrección 6 del PR B)", () => {
  it("es true con cualquier host, y false solo con localhost o 127.0.0.1 (con o sin puerto)", () => {
    for (const host of ["juntia.vercel.app", "juntia-git-main.vercel.app", "192.168.1.20:3400", "[::1]:3400", "localhost.evil.test", "evil-localhost", "", null, undefined]) {
      expect(cookieSecure(host), String(host)).toBe(true);
    }
    for (const host of ["localhost", "localhost:3400", "LOCALHOST:3500", "127.0.0.1", "127.0.0.1:3400"]) {
      expect(cookieSecure(host), host).toBe(false);
    }
  });

  it("la cookie del tema del servidor sigue la misma regla", () => {
    expect(themeCookieOptions("juntia.vercel.app").secure).toBe(true);
    expect(themeCookieOptions("localhost:3400").secure).toBe(false);
  });
});
