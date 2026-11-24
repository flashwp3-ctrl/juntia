// Marca 1c (comp 09b): el logo es una imagen con nombre «Juntia», de caja fija (sin CLS al llegar la fuente).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo, lockupBox, WORDMARK_EM } from "./logo";

describe("Logo", () => {
  it("el logotipo es un SVG role=img «Juntia» con ancho y alto fijos, y «Juntia» ajustado a su ancho", () => {
    render(<Logo size={28} />);
    const logo = screen.getByRole("img", { name: "Juntia" });
    expect(logo.tagName.toLowerCase()).toBe("svg");
    const box = lockupBox(28);
    expect(box).toEqual({ isotype: 26, gap: 8, word: Math.ceil(28 * WORDMARK_EM), width: 26 + 8 + Math.ceil(28 * WORDMARK_EM), height: 28 });
    expect(logo.getAttribute("width")).toBe(String(box.width));
    expect(logo.getAttribute("height")).toBe(String(box.height));
    const word = logo.querySelector("text");
    expect(word?.textContent).toBe("Juntia");
    expect(word?.getAttribute("textLength")).toBe(String(box.word));
    expect(word?.getAttribute("lengthAdjust")).toBe("spacingAndGlyphs");
  });

  it("el isotipo solo es cuadrado y conserva el nombre", () => {
    render(<Logo variant="isotype" size={28} />);
    const logo = screen.getByRole("img", { name: "Juntia" });
    expect([logo.getAttribute("width"), logo.getAttribute("height")]).toEqual(["28", "28"]);
    expect(logo.querySelectorAll("path")).toHaveLength(2);
    expect(logo.querySelector("text")).toBeNull();
  });

  it("no impone block cuando quien llama lo oculta por defecto", () => {
    const { container } = render(<Logo size={28} className="hidden xl:block" />);
    const classes = container.querySelector("svg")!.getAttribute("class")!.split(" ");
    expect(classes).toContain("hidden");
    expect(classes).not.toContain("block");
  });
});
