// 005 · PR B (CLS, FR-050 y FR-051; extensión de la opción A aprobada por el gestor el 19 nov 2026). Capa: componentes. Parcial
// 44433137464: en el estado de error de Inicio, «Reintentar», centrado por su ancho, se movía 6 px en Firefox a 390 al llegar la
// fuente. Criterio: el texto de las acciones centradas de los estados va en una caja del ancho que mide en Onest (em), así que la
// acción mide lo mismo con cualquier fuente.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";
import { onestSemiboldEm } from "@/lib/text-fit";
import { LoadError } from "@/features/context/load-error";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

const box = (name: string) => screen.getByRole("button", { name }).querySelector<HTMLElement>("[data-stable-label]");

describe("acciones centradas con caja de ancho fijo (PR B)", () => {
  it("«Reintentar» del estado de error lleva su texto en una caja del ancho que mide en Onest", () => {
    render(<LoadError />);
    expect(box(copy.states.retry)?.style.width).toBe(`${onestSemiboldEm(copy.states.retry)}em`);
    // La cara de carga comparte la celda del botón: su texto también va en caja fija (parcial 44439996119: seguía moviendo 6 px).
    const faces = screen.getByRole("button", { name: copy.states.retry }).querySelectorAll<HTMLElement>("[data-stable-label]");
    expect([...faces].map((face) => face.textContent)).toEqual([copy.states.retry, copy.primitives.loading]);
    for (const face of faces) expect(face.style.width).toBe(`${onestSemiboldEm(face.textContent!)}em`);
  });

  it("Button con stableWidth envuelve el texto; sin él, no cambia nada", () => {
    render(<><Button stableWidth>Limpiar filtros</Button><Button>Guardar</Button></>);
    expect(box("Limpiar filtros")?.style.width).toBe(`${onestSemiboldEm("Limpiar filtros")}em`);
    expect(box("Guardar")).toBeNull();
  });
});
