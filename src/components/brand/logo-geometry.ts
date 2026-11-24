// Marca 1c, «La J que se construye» (comp «Juntia DS v1 - 09b Marca 1c», aprobado por los fundadores el 23 nov 2026).
// Única fuente de la geometría: la usan el componente <Logo> y scripts/brand/generate-assets.mjs, que escribe los
// iconos de src/app. Un fuste y una curva con una junta entre los dos; la junta no se cierra nunca.

/** Maestro, rejilla de 32. Se usa desde 24 px. Junta de 2 unidades. */
export const MASTER = {
  viewBox: 32,
  stem: "M19 1H26V18H19Z",
  curve: "M26 20A10.5 10.5 0 0 1 5 20H12A3.5 3.5 0 0 0 19 20Z",
};

/** Versión pequeña, rejilla de 16 ajustada al píxel: fuste de 3 px, junta de 2 px, contraforma de 4 px. Solo icon.svg. */
export const SMALL = {
  viewBox: 16,
  stem: "M10 1H13V8H10Z",
  curve: "M13 10A5 5 0 0 1 3 10H6A2 2 0 0 0 10 10Z",
};

/** Baldosa bosque de favicon.ico: trae su propio fondo porque un .ico no cambia con el tema. */
export const TILE_16 = { viewBox: 16, radius: 3.5, stem: "M10 2H13V8H10Z", curve: "M13 10A4.5 4.5 0 0 1 4 10H7A1.5 1.5 0 0 0 10 10Z" };
export const TILE_32 = { viewBox: 32, radius: 7, stem: "M19 5H24V17H19Z", curve: "M24 19A8 8 0 0 1 8 19H13A3 3 0 0 0 19 19Z" };

/** Colores de marca: primitivos de src/styles/tokens.css (I2 Bosque & Arena). Ninguno es nuevo; el script los lee de allí. */
export const BRAND_PRIMITIVES = {
  forest: "forest-700",
  sand: "sand-400",
  sand600: "sand-600",
  sandLight: "sand-200",
  linen: "linen-100",
  forestDark: "forest-300",
  sandDark: "sand-300",
};

/** Proporciones del logotipo (09): isotipo = 0,92 × cuerpo; separación = 0,27 × cuerpo. */
export const LOCKUP = { isotype: 0.92, gap: 0.27 };
