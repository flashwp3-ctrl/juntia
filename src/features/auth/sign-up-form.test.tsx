// UX lote 1, cambio 6 — capa: componentes (Vitest + RTL). Criterio literal (petición de los fundadores): «el diseño espera
// solo el nombre: etiqueta «¿Cómo quieres que te llamemos?», placeholder «Ej.: Alejandro» y ayuda «Así te saludamos y así te
// verá tu pareja.», en el registro y en Mi perfil. No recortes el nombre automáticamente. La validación de 1 a 60 no cambia».
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { SignUpForm } from "./sign-up-form";

vi.mock("./actions", () => ({ signUp: vi.fn() }));

describe("Registro: campo del nombre (UX lote 1, cambio 6)", () => {
  it("pregunta cómo quiere que lo llamen, con ejemplo y ayuda, y la ayuda describe el campo", () => {
    render(<SignUpForm />);
    const name = screen.getByRole("textbox", { name: "¿Cómo quieres que te llamemos?" });
    expect(name.getAttribute("placeholder")).toBe("Ej.: Alejandro");
    expect(screen.getByText("Así te saludamos y así te verá tu pareja.")).toBeTruthy();
    expect(name.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Nombre visible");
  });

  it("el copy de registro y el de Mi perfil dicen lo mismo", () => {
    expect(copy.auth.signUp.nameLabel).toBe(copy.account.profile.nameLabel);
    expect(copy.auth.signUp.namePlaceholder).toBe(copy.account.profile.namePlaceholder);
    expect(copy.auth.signUp.nameHelp).toBe(copy.account.profile.nameHelp);
  });
});

// F09 (auditoría Impeccable, nov 2026): los enlaces de acceso no usan el verde de ahorro (DESIGN_SYSTEM §2.1, regla 2:
// «Verde texto = ahorro destinado»); van en tinta subrayada.
describe("Enlaces de acceso en tinta subrayada (F09)", () => {
  it("«Ya tengo cuenta» va en tinta, subrayado, sin text-saving", () => {
    render(<SignUpForm />);
    const link = screen.getByRole("link", { name: copy.auth.signUp.haveAccount });
    expect(link.className).toContain("text-ink");
    expect(link.className).toMatch(/(^|\s)underline(\s|$)/);
    expect(link.className).not.toContain("text-saving");
  });
});
