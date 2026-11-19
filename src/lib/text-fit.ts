// F79-2 (revisión del PR #79): ancho estimado, en em de Brygada 1918 500, de la palabra más larga del nombre de una meta. Con él,
// el título de la tarjeta crece con la letra ampliada hasta donde cabe esa palabra entera: no se parte ni se recorta. Tabla
// calibrada con canvas sobre la fuente real (nov 2026: «Emergencias» 6,10 em, «Apartamento» 6,21, «Bicicleta» 4,08; «m» y «M»
// ≈ 0,93) y un margen del 4 %, para quedar siempre por encima del ancho real.
const NARROW = new Set([..."iljI.,'’!|"]);
const SEMI = new Set([..."rtf"]);
const WIDE = new Set([..."mwMW"]);
const letterEm = (letter: string) => (NARROW.has(letter) ? 0.32 : SEMI.has(letter) ? 0.38 : WIDE.has(letter) ? 0.93 : letter !== letter.toLowerCase() ? 0.68 : 0.55);
export function longestWordEm(name: string) {
  const widest = Math.max(1, ...name.trim().split(/\s+/).map((word) => [...word].reduce((sum, letter) => sum + letterEm(letter), 0)));
  return Math.round(widest * 1.04 * 100) / 100;
}
