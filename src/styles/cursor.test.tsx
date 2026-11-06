// UX lote 1, cambio 5 — capa: componentes (Vitest + RTL). Criterio literal (petición de los fundadores): «cursor de mano
// (cursor: pointer) en todo lo que se puede pulsar: botones, chips, filas, enlaces y controles de las hojas; los
// deshabilitados llevan cursor: not-allowed o default». Tailwind v4 deja los botones en `cursor: default`, así que la
// regla vive una sola vez en la capa base de globals.css. jsdom no calcula esa hoja de estilos, por eso la prueba lee las
// reglas de la capa base y comprueba con `matches()` que cada control principal cae en la lista de pulsables y que los
// deshabilitados caen en la regla posterior. El cursor computado en un navegador real lo comprueba la E2E de Anotar.
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const rule = (property: string) => {
  const match = [...css.matchAll(/:where\(([^{}]*)\)\s*\{\s*cursor:\s*([a-z-]+)\s*;?\s*\}/g)].find(([, , value]) => value === property);
  if (!match) throw new Error(`globals.css no tiene la regla base de cursor: ${property}`);
  return match[1].replace(/\s+/g, " ").trim();
};

describe("Cursor de mano en lo pulsable (UX lote 1, cambio 5)", () => {
  const pointer = rule("pointer");
  const notAllowed = rule("not-allowed");

  it("la regla base vive en @layer base y la de deshabilitados va después, con la misma especificidad", () => {
    const layer = css.indexOf("@layer base");
    expect(layer).toBeGreaterThan(-1);
    expect(css.indexOf(`:where(${pointer})`)).toBeGreaterThan(layer);
    expect(css.indexOf(`:where(${notAllowed})`)).toBeGreaterThan(css.indexOf(`:where(${pointer})`));
  });

  it("cubre los selectores de la petición: botones, [role=button], enlaces, summary, label[for], pestañas y opciones", () => {
    for (const selector of ["button", '[role="button"]', "a[href]", "summary", "label[for]", '[role="tab"]', '[role="option"]']) {
      expect(pointer, selector).toContain(selector);
    }
  });

  it("botón, chip de categoría, enlace de fila, opción de segmentado y summary son pulsables", () => {
    render(
      <>
        <Button>Guardar</Button>
        <button type="button" aria-pressed="false">Mercado</button>
        <a href="/actividad/1">Fila</a>
        <details><summary>Más</summary></details>
        <label htmlFor="x">Campo</label>
        <input id="x" />
        <Segmented<"a" | "b"> role="radiogroup" label="Tipo" value="a" onValueChange={() => {}} options={[{ value: "a", label: "Gasto" }, { value: "b", label: "Ingreso" }]} />
      </>,
    );
    const pulsables = [
      screen.getByRole("button", { name: "Guardar" }), screen.getByRole("button", { name: "Mercado" }), screen.getByRole("link", { name: "Fila" }),
      screen.getByText("Más"), screen.getByText("Campo"), ...screen.getAllByRole("radio"),
    ];
    for (const element of pulsables) expect(element.matches(pointer), element.outerHTML).toBe(true);
  });

  it("los deshabilitados (disabled y aria-disabled) caen en la regla not-allowed", () => {
    render(<><Button disabled>Guardar</Button><button type="button" disabled>Chip</button></>);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const element of buttons) expect(element.matches(notAllowed), element.outerHTML).toBe(true);
    expect(screen.getByRole("button", { name: "Guardar" }).getAttribute("aria-disabled")).toBe("true");
  });
});
