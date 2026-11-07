// T040 / FR-051; US-7.2: «Given Mi perfil, When edita el nombre visible, Then ve los estados P1 a P5 (editando,
// validación, guardando, guardado, error); el correo se muestra y no se puede editar».
// T048 / spec, caso límite «Sesión caducada»: «falla con un mensaje que pide volver a entrar y no pierde lo escrito».
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { ProfileForm } from "./profile-form";

function setup(save = vi.fn().mockResolvedValue({ ok: true, displayName: "Sara Gómez" })) {
  const user = userEvent.setup();
  render(<ProfileForm initialName="Sara" email="sara@seed.test" save={save} />);
  const name = screen.getByRole("textbox", { name: copy.account.profile.nameLabel });
  const submit = () => user.click(screen.getByRole("button", { name: copy.account.profile.save }));
  return { user, save, name, submit };
}

describe("ProfileForm (T040)", () => {
  // UX lote 1, cambio 6: el campo pregunta cómo quiere que lo llamen, sin recortar el nombre (nombres compuestos).
  it("UX 6: etiqueta, placeholder y ayuda del nombre; un nombre compuesto se envía tal cual", async () => {
    const { user, save, name, submit } = setup();
    expect(screen.getByRole("textbox", { name: "¿Cómo quieres que te llamemos?" })).toBe(name);
    expect(name.getAttribute("placeholder")).toBe("Ej.: Alejandro");
    expect(screen.getByText("Así te saludamos y así te verá tu pareja.")).toBeTruthy();
    expect(name.getAttribute("aria-describedby")).toBeTruthy();
    await user.clear(name);
    await user.type(name, "María José");
    await submit();
    expect(save).toHaveBeenCalledWith("María José");
  });

  it("P1: nombre editable y correo de solo lectura", () => {
    const { name } = setup();
    expect((name as HTMLInputElement).value).toBe("Sara");
    const email = screen.getByRole("textbox", { name: copy.account.profile.emailLabel }) as HTMLInputElement;
    expect(email.value).toBe("sara@seed.test");
    expect(email.readOnly).toBe(true);
  });

  it("P2: un nombre vacío o con más de 60 no se envía y explica cómo corregirlo", async () => {
    const { user, save, name, submit } = setup();
    await user.clear(name);
    await submit();
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(copy.account.profile.errors.displayName)).toBeTruthy();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    await user.type(name, "a".repeat(61));
    await submit();
    expect(save).not.toHaveBeenCalled();
  });

  it("P3 → P4: guarda el nombre recortado, muestra Guardando… y después Perfil actualizado", async () => {
    let resolve!: (value: unknown) => void;
    const save = vi.fn().mockReturnValue(new Promise((done) => { resolve = done; }));
    const { user, name, submit } = setup(save);
    await user.clear(name);
    await user.type(name, "  Sara Gómez ");
    await submit();
    expect(save).toHaveBeenCalledWith("Sara Gómez");
    expect(screen.getByRole("button", { name: copy.primitives.saving }).getAttribute("aria-busy")).toBe("true");
    resolve({ ok: true, displayName: "Sara Gómez" });
    expect(await screen.findByText(copy.account.profile.saved)).toBeTruthy();
  });

  it("P5: si falla, lo dice y conserva lo escrito", async () => {
    const { user, name, submit } = setup(vi.fn().mockResolvedValue({ ok: false, error: "failed" }));
    await user.clear(name);
    await user.type(name, "Sara G");
    await submit();
    expect(await screen.findByText(copy.account.profile.saveFailed)).toBeTruthy();
    expect((name as HTMLInputElement).value).toBe("Sara G");
  });

  it("sesión caducada: pide volver a entrar sin perder lo escrito", async () => {
    const { user, name, submit } = setup(vi.fn().mockResolvedValue({ ok: false, error: "sessionExpired" }));
    await user.clear(name);
    await user.type(name, "Sara nueva");
    await submit();
    expect(await screen.findByText(copy.errors.sessionExpired)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.account.signInAgain }).getAttribute("href")).toBe("/entrar?volver=%2Fcuenta%2Fperfil");
    expect((name as HTMLInputElement).value).toBe("Sara nueva");
  });
});
