// 005 · T057 (FR-067; contracts/account-deletion.md §8), capa: componentes. Criterio literal: «Mi cuenta → Privacidad: además de
// "no disponible", dice cómo pedir la eliminación (a quién se pide y que la ejecuta el gestor tras confirmar), con el texto de
// es.ts». El texto exacto lo aprueban los fundadores en la revisión del PR B (T067).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import PrivacyPage from "@/app/(app)/cuenta/privacidad/page";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), usePathname: () => "/cuenta/privacidad" }));

describe("Privacidad · cómo pedir la eliminación (T057)", () => {
  it("la nota de «Eliminar tu cuenta» dice que no está disponible y cómo pedirla, sin ser un control", () => {
    render(<PrivacyPage />);
    const note = screen.getAllByRole("note").find((node) => within(node).queryByText(copy.account.privacy.deleteTitle));
    expect(note).toBeTruthy();
    expect(within(note!).getByText(copy.account.privacy.deleteDescription)).toBeTruthy();
    expect(within(note!).getByText(copy.account.privacy.deleteHowTo)).toBeTruthy();
    expect(note!.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
  });
});
