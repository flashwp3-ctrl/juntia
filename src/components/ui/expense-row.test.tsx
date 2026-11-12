// T064 / US-3.2; ADR-011 §2, fila 5 — capa: componente (Vitest + RTL).
// Criterio literal (COMPONENT_SPECIFICATIONS.md §ExpenseRow): «gasto (tinta, sin signo) · ingreso (+, ficha arena)» y
// «la fila es un enlace al detalle, con nombre accesible» completo. Propuesta §15.9 «Gasto, ingreso y liquidación en
// tinta»: el ingreso no usa el verde de ahorro (se aprueba viendo la pantalla; aquí se fija lo que se presenta).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { copy } from "@/lib/copy/es";
import { ExpenseRow } from "./expense-row";

const expense = saraPrivateOctober2026[0]; // Taxi a la oficina, 45.000, transporte, 3 oct
const income = saraPrivateOctober2026.find(({ type }) => type === "income")!; // Reembolso EPS, +86.000

describe("ExpenseRow (T064)", () => {
  it("gasto: tinta, sin signo, enlace al detalle con nombre completo", () => {
    render(<ExpenseRow transaction={expense} href={`/actividad/${expense.id}`} dateLabel="3 oct" />);
    const link = screen.getByRole("link", { name: copy.row.accessibleName({ title: "Taxi a la oficina", amount: "45.000", income: false, category: copy.categories.transport, date: "3 oct" }) });
    expect(link.getAttribute("href")).toBe(`/actividad/${expense.id}`);
    const amount = link.querySelector("[data-row-amount]")!;
    expect(amount.textContent).not.toMatch(/^[+-]/);
    expect(amount.textContent).toMatch(/45\.000/);
    expect(amount.className).toContain("text-expense");
    expect(link.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("car-profile");
  });

  it("ingreso: «+», ficha arena, ícono arrow-down-left y tinta, nunca el verde de ahorro", () => {
    render(<ExpenseRow transaction={income} href={`/actividad/${income.id}`} dateLabel="21 oct" />);
    const link = screen.getByRole("link", { name: copy.row.accessibleName({ title: "Reembolso EPS", amount: "86.000", income: true, category: copy.categories.income, date: "21 oct" }) });
    const amount = link.querySelector("[data-row-amount]")!;
    expect(amount.textContent).toMatch(/^\+/);
    expect(amount.textContent).toMatch(/86\.000/);
    expect(amount.className).toContain("text-income");
    expect(link.innerHTML).not.toMatch(/text-saving|bg-saving/);
    const chip = link.querySelector("[data-category-chip]")!;
    expect(chip.className).toContain("bg-category-income-bg");
    expect(chip.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("arrow-down-left");
  });

  it("sin descripción, el título es la categoría; y el estado «nueva» queda marcado para E5", () => {
    render(<ExpenseRow transaction={{ ...expense, description: null }} href="/actividad/x" dateLabel="3 oct" isNew />);
    const link = screen.getByRole("link", { name: copy.row.accessibleName({ title: copy.categories.transport, amount: "45.000", income: false, category: copy.categories.transport, date: "3 oct" }) });
    expect(link.hasAttribute("data-new")).toBe(true);
  });

  // F01 (auditoría Impeccable, nov 2026): la fila en vuelo no baja la opacidad del texto (3,44:1); se marca con el contorno
  // punteado de «pendiente» y el reloj de arena junto a «Guardando…» en status.pending. La geometría no cambia (outline).
  it("en vuelo (E4): «Guardando…» con reloj de arena y contorno punteado, sin opacidad sobre el texto y sin enlace", () => {
    const { container } = render(<ExpenseRow transaction={expense} href="/actividad/x" dateLabel="Hoy" pending="saving" />);
    expect(screen.queryByRole("link")).toBeNull();
    const row = container.querySelector<HTMLElement>("[data-pending='saving']")!;
    expect(row.getAttribute("aria-busy")).toBe("true");
    expect(row.className).not.toMatch(/opacity-/);
    expect(row.className).toMatch(/outline-dashed/);
    expect(row.className).toMatch(/outline-border-emphasis/);
    expect(row.className).not.toMatch(/(^|\s)border-dashed/);
    const label = row.querySelector<HTMLElement>("[data-pending-label]")!;
    expect(label.textContent).toBe(copy.row.pending.saving);
    expect(label.className).toContain("text-pending");
    expect(label.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("hourglass-medium");
    expect(row.querySelector(".sr-only")?.textContent?.endsWith(`, ${copy.row.pending.saving}`)).toBe(true);
  });

  it("confirmada, la fila no lleva marca de «Guardando…»", () => {
    const { container } = render(<ExpenseRow transaction={expense} href="/actividad/x" dateLabel="Hoy" />);
    expect(container.querySelector("[data-pending-label]")).toBeNull();
    expect(container.querySelector("a")!.className).not.toMatch(/outline-dashed/);
  });
});
