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

// 005 · PR B (gestor, 19 nov 2026): parcial 44449050533, A1 en Firefox: en el primer fotograma (fuente del sistema, más ancha que
// Onest) el texto se partía en dos líneas DENTRO de su caja fija y el enlace bajaba 11 px. Criterio: no se parte mientras la
// columna de contenido (contenedor «page») mida 17rem o más, es decir, a la escala normal; con el texto al 200 % la columna no
// llega y vuelve a partirse, para que el botón lg y los demás no desborden.
describe("StableLabel no se parte a la escala normal (PR B)", () => {
  it("lleva nowrap solo desde 17rem del contenedor «page»", () => {
    render(<Button stableWidth>Reintentar</Button>);
    const label = box("Reintentar")!;
    expect(label.className).toMatch(/@min-\[17rem\]\/page:whitespace-nowrap/);
    expect(label.className).not.toMatch(/(^| )whitespace-nowrap/);
  });
});
