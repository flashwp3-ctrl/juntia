// @vitest-environment node
// F93-1: la comprobación del origen de og:image y twitter:image falla con un origen equivocado (caso negativo).
import { describe, expect, it } from "vitest";
import { expectedShareOrigin, shareOriginProblem } from "./support/share-origin";

describe("origen de la tarjeta para compartir", () => {
  it("el esperado es el de SITE_URL si está definida; si no, el de la app", () => {
    expect(expectedShareOrigin({ SITE_URL: "https://juntia.example/ruta/" }, "http://localhost:3400")).toBe("https://juntia.example");
    expect(expectedShareOrigin({ SITE_URL: "  " }, "http://localhost:3400/entrar")).toBe("http://localhost:3400");
    expect(expectedShareOrigin({}, "http://localhost:3400")).toBe("http://localhost:3400");
  });

  it("acepta la URL absoluta con el origen esperado", () => {
    expect(shareOriginProblem("http://localhost:3400/opengraph-image.png?abc123", "http://localhost:3400")).toBeNull();
  });

  it("falla con un origen equivocado aunque la ruta sea la buena", () => {
    expect(shareOriginProblem("https://origen-equivocado/opengraph-image.png?abc123", "http://localhost:3400")).toMatch(/origen-equivocado/);
    expect(shareOriginProblem("http://localhost:3500/opengraph-image.png", "http://localhost:3400")).toMatch(/3500/);
    expect(shareOriginProblem("https://localhost:3400/opengraph-image.png", "http://localhost:3400")).not.toBeNull();
  });

  it("falla si la URL no es absoluta o la etiqueta falta", () => {
    expect(shareOriginProblem("/opengraph-image.png", "http://localhost:3400")).toMatch(/absoluta/);
    expect(shareOriginProblem(null, "http://localhost:3400")).toMatch(/no está/);
  });
});
