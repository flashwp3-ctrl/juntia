// UX lote 1 — capa: componentes (Vitest + RTL). Con «Otra» usando Tag, el campo «Categoría» del detalle ya no puede llevar Tag
// como icono genérico: mostraría Tag dos veces con significados distintos. El campo muestra el icono de la categoría del
// movimiento, el mismo de las filas: Mercado → carrito, Otra → Tag.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { TransactionDetail } from "./transaction-detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/actividad" }));
const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const detail = (categoryId: "market" | "other") => {
  const transaction = saraPrivateOctober2026.find((row) => row.categoryId === categoryId)!;
  render(<AnnotateProvider actions={idleActions}><TransactionDetail transaction={transaction} closeHref="/actividad" /></AnnotateProvider>);
  return transaction;
};
const categoryFactIcon = () => {
  const term = screen.getByText(copy.detail.category, { selector: "dt" });
  return term.querySelector("[data-icon]")?.getAttribute("data-icon");
};

describe("Detalle: icono del campo «Categoría» (UX lote 1)", () => {
  it("Mercado → carrito, el icono de su categoría", () => {
    detail("market");
    expect(categoryFactIcon()).toBe("shopping-cart-simple");
    expect(within(document.querySelector("dl")!).getByText(copy.categories.market)).toBeTruthy();
  });

  it("Otra → Tag, y ya no es el icono genérico del campo en los demás gastos", () => {
    detail("other");
    expect(categoryFactIcon()).toBe("tag");
  });

  it("el icono genérico «tag» no se usa para ninguna otra categoría", () => {
    detail("market");
    expect(document.querySelectorAll("[data-icon='tag']")).toHaveLength(0);
  });
});
