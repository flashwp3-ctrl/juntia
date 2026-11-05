// Copy aprobado el 5 de noviembre de 2026 (Alejandro): la recuperación abierta en otro navegador dice cómo seguir, sin
// datos de la cuenta; el enlace caducado conserva su aviso.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";

vi.mock("./actions", () => ({ recover: vi.fn() }));
const { RecoverForm } = await import("./recover-form");

describe("RecoverForm · avisos del enlace", () => {
  it("otro navegador → su propio aviso", () => {
    render(<RecoverForm notice="otherBrowser" />);
    expect(screen.getByRole("alert").textContent).toBe(copy.auth.recover.otherBrowser);
  });
  it("caducado o usado → el aviso de siempre", () => {
    render(<RecoverForm notice="expired" />);
    expect(screen.getByRole("alert").textContent).toBe(copy.auth.recover.linkExpired);
  });
  it("sin aviso → ninguna alerta", () => {
    render(<RecoverForm notice={null} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
