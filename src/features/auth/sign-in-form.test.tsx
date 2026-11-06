// Revisión previa a la 2.ª ronda — capa: componentes (Vitest + RTL). Criterio literal: «cuando la sesión caduca y se redirige al
// login, se borran las intenciones de ese usuario». El proxy aparta de Entrar a quien tiene sesión, así que llegar a Entrar
// es no tener sesión: ahí no debe quedar importe ni descripción de gastos privados.
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addIntention, readIntentions } from "@/features/expenses/unconfirmed";
import { SignInForm } from "./sign-in-form";

vi.mock("./actions", () => ({ signIn: vi.fn(), resend: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), usePathname: () => "/entrar" }));

const SARA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
beforeEach(() => {
  window.localStorage.clear();
  addIntention(SARA, { idempotencyKey: "11111111-1111-4111-8111-111111111111", type: "expense", amountPesos: "47350", categoryId: "market", transactionDate: "2026-11-05", description: "Pan" });
});

describe("Entrar borra lo que quedó sin confirmar (sesión caducada o cerrada)", () => {
  it("al montar Entrar no queda ninguna intención de nadie", () => {
    expect(readIntentions(SARA)).toHaveLength(1);
    render(<SignInForm volver="/" notice={null} />);
    expect(readIntentions(SARA)).toEqual([]);
    expect(Object.keys(window.localStorage).filter((key) => key.startsWith("juntia:unconfirmed-writes:"))).toEqual([]);
  });
});
