// F21 (auditoría Impeccable, nov 2026) — capa: componentes (Vitest + RTL). Criterio: «La 404 con sesión usa `warning` y
// la fila de cuenta del sidebar pierde el avatar y el nombre». DESIGN_SYSTEM §3: «no encontrado» no es una advertencia.
// Sin sesión, o si la lectura falla, la 404 se pinta igual con el acceso mínimo.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";

const load = vi.hoisted(() => ({ account: vi.fn(), couple: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ruta-que-no-existe", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/account/load-account", () => ({ loadAccount: load.account }));
vi.mock("@/features/couple/load", () => ({
  loadCoupleForShell: load.couple,
  personOf: () => 2,
  partnerOf: () => "Sara",
}));
vi.mock("@/features/expenses/actions", () => ({ createTransactionAction: vi.fn(), privateWriteStatusAction: vi.fn(), updateTransactionAction: vi.fn(), voidTransactionAction: vi.fn() }));

const { default: NotFound } = await import("./not-found");

describe("404 (F21)", () => {
  beforeEach(() => { load.account.mockReset(); load.couple.mockReset(); });

  it("con sesión: brújula en vez de advertencia y la cuenta en el sidebar (inicial y nombre)", async () => {
    load.account.mockResolvedValue({ userId: "u", email: "tomas@seed.test", profile: { displayName: "Tomás", theme: "system", firstEntryCompleted: true } });
    load.couple.mockResolvedValue({ status: "active" });
    const { container } = render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: copy.states.notFound })).toBeTruthy();
    const icons = [...container.querySelectorAll("main [data-icon]")].map((icon) => icon.getAttribute("data-icon"));
    expect(icons).toContain("compass");
    expect(icons).not.toContain("warning");
    // La fila del sidebar y el AccountButton ya no son el «Mi cuenta» genérico: llevan el nombre y la inicial.
    expect(screen.getByText("Tomás")).toBeTruthy();
    expect(container.querySelector("[data-account-button]")?.textContent).toContain("T");
  });

  it("sin sesión o si la lectura falla: la misma 404, con el acceso mínimo", async () => {
    load.account.mockResolvedValueOnce(null);
    const first = render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: copy.states.notFound })).toBeTruthy();
    expect(first.container.querySelector("[data-account-button]")).toBeNull();
    first.unmount();
    load.account.mockRejectedValueOnce(new Error("red"));
    const second = render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: copy.states.notFound })).toBeTruthy();
    expect(second.container.querySelector("[data-account-button]")).toBeNull();
  });
});
