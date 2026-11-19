// 005 · PR B (CLS, FR-051; aprobado por el gestor el 19 nov 2026). Parcial 44445684478: en Firefox, el primer fotograma de A1 se
// pinta antes de que carguen Brygada y su respaldo local (Firefox también carga los local() de forma asíncrona), con la serif por
// defecto del sistema; la primera línea del titular, «Lo tuyo, lo mío y», ocupaba dos líneas y el titular subía 43 px al llegar
// Brygada (15 de 15 cargas). Criterio: con la columna de al menos 20rem (escala normal: 342 px a 390, 360 a 1440), esa línea no
// corta, con ninguna fuente; por debajo (texto al 200 %) vuelve a poder cortar (FR-042). Capa: componentes (la clase y su
// contenedor); el ancho real lo comprueban el barrido @sweep y el tramo firefox-cls.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";

vi.mock("./actions", () => ({ signIn: vi.fn(), resend: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/entrar" }));

import { SignInForm } from "./sign-in-form";

describe("titular de A1: la primera línea no corta con la columna de 20rem o más (PR B)", () => {
  it("el titular es un contenedor y su primera línea lleva nowrap solo desde 20rem", () => {
    render(<SignInForm volver="/" notice={null} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toMatch(/@container\/title/);
    const lead = [...heading.querySelectorAll("span")].find((span) => span.textContent === copy.auth.signIn.titleLead)!;
    expect(lead.className).toMatch(/@min-\[20rem\]\/title:whitespace-nowrap/);
    expect(lead.className).not.toMatch(/(^| )whitespace-nowrap/);
  });
});
