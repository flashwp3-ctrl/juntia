// Revisión previa a la 2.ª ronda — capa: componentes (Vitest + RTL). Criterio literal: «Al cerrar sesión […] se borran las
// intenciones de ese usuario, porque contienen importe y descripción de gastos privados». Se borran las de todo el dispositivo:
// al cerrar sesión no queda nadie con sesión.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { addIntention, readIntentions } from "@/features/expenses/unconfirmed";
import { SignOutGhost, SignOutRow } from "./account-controls";

vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn(async () => ({})) }));
vi.mock("./actions", () => ({ requestPasswordChange: vi.fn() }));

const SARA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOMAS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const intent = (key: string) => ({ idempotencyKey: key, type: "expense" as const, amountPesos: "47350", categoryId: "market" as const, transactionDate: "2026-11-05", description: "Pan" });
beforeEach(() => { window.localStorage.clear(); addIntention(SARA, intent("11111111-1111-4111-8111-111111111111")); addIntention(TOMAS, intent("22222222-2222-4222-8222-222222222222")); });

describe("Cerrar sesión borra las intenciones sin confirmar", () => {
  it("la fila «Cerrar sesión» las borra antes de enviar", async () => {
    render(<SignOutRow />);
    expect(readIntentions(SARA)).toHaveLength(1);
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(copy.account.signOut.label) }));
    expect(readIntentions(SARA)).toEqual([]);
    expect(readIntentions(TOMAS)).toEqual([]);
    expect(Object.keys(window.localStorage).filter((key) => key.startsWith("juntia:unconfirmed-writes:"))).toEqual([]);
  });

  it("el botón «Cerrar sesión» de Esta sesión también", async () => {
    render(<SignOutGhost />);
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(copy.account.signOut.label) }));
    expect(readIntentions(SARA)).toEqual([]);
  });
});
