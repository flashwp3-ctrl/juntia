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

// 005 · PR B (corrección 1, FR-050; corrección 2, FR-051; opción A aprobada por el gestor el 19 nov 2026): avance de cada carácter
// en Onest 600, en em, medido con canvas sobre la fuente real (Chromium, nov 2026; «Yo» 1,186 em y «Nosotros» 4,315 em con
// kerning). Sirve para dar a un texto corto una caja de ancho fijo, la que mide con Onest, que no cambia cuando la fuente pasa
// del respaldo a Onest. Los textos medidos usan su medida (la caja es la de hoy); los demás, la suma de avances con un 4 % de
// margen (sin kerning la suma puede quedar algo por debajo: «Gasto» suma 2,77 y mide 2,81). Un carácter que no está en la tabla
// cuenta como uno ancho, para que un texto nuevo nunca se corte.
const MEASURED: Record<string, number> = { Yo: 1.186, Nosotros: 4.315 };
const ONEST_600: Record<string, number> = {"0":0.662,"1":0.381,"2":0.562,"3":0.608,"4":0.635,"5":0.615,"6":0.623,"7":0.509,"8":0.624,"9":0.621,"a":0.563,"b":0.617,"c":0.559,"d":0.618,"e":0.574,"f":0.378,"g":0.618,"h":0.6,"i":0.24,"j":0.263,"k":0.546,"l":0.24,"m":0.841,"n":0.6,"o":0.597,"p":0.617,"q":0.618,"r":0.386,"s":0.511,"t":0.368,"u":0.582,"v":0.55,"w":0.859,"x":0.545,"y":0.61,"z":0.513,"A":0.698,"B":0.669,"C":0.711,"D":0.727,"E":0.618,"F":0.602,"G":0.728,"H":0.737,"I":0.283,"J":0.576,"K":0.657,"L":0.587,"M":0.885,"N":0.758,"O":0.769,"P":0.646,"Q":0.769,"R":0.679,"S":0.657,"T":0.586,"U":0.734,"V":0.704,"W":0.997,"X":0.643,"Y":0.659,"Z":0.611,"á":0.563,"é":0.574,"í":0.24,"ó":0.597,"ú":0.582,"ñ":0.6,"Á":0.698,"É":0.618,"Í":0.283,"Ó":0.769,"Ú":0.734,"Ñ":0.758,"ü":0.582," ":0.278,".":0.272,",":0.288,"-":0.462,"·":0.273,"'":0.238};
// PR del paso 4b (autorizado el 27 nov 2026, «Sí, autorizado, corrige los dos en un PR aparte»; maestro, decisión 30): el título
// de las hojas (SheetTitle) se ajustaba con `longestWordEm`, una estimación por clases de letra que dejaba a «Invitar» con un 1,8 %
// de holgura sobre su ancho real, y en CI la palabra salía de su columna y quedaba bajo la ×. Avance de cada carácter en Brygada 1918 500, medido con canvas sobre la fuente
// real (nov 2026; arnés `tests/evidence/desbordes-117.capture.ts`, caso 10). La suma sin kerning nunca queda por debajo del ancho
// real de las palabras de los títulos (canvas ≤ suma en las 23).
const BRYGADA_500: Record<string, number> = {"0":0.594,"1":0.5,"2":0.593,"3":0.564,"4":0.638,"5":0.577,"6":0.578,"7":0.558,"8":0.557,"9":0.578,"a":0.535,"b":0.599,"c":0.505,"d":0.613,"e":0.526,"f":0.345,"g":0.547,"h":0.636,"i":0.321,"j":0.31,"k":0.588,"l":0.314,"m":0.943,"n":0.642,"o":0.565,"p":0.609,"q":0.602,"r":0.472,"s":0.47,"t":0.366,"u":0.604,"v":0.521,"w":0.782,"x":0.55,"y":0.52,"z":0.502,"A":0.705,"B":0.683,"C":0.685,"D":0.751,"E":0.632,"F":0.576,"G":0.74,"H":0.777,"I":0.392,"J":0.43,"K":0.712,"L":0.597,"M":0.911,"N":0.748,"O":0.745,"P":0.615,"Q":0.745,"R":0.707,"S":0.603,"T":0.621,"U":0.726,"V":0.687,"W":0.989,"X":0.67,"Y":0.648,"Z":0.584,"á":0.535,"é":0.526,"í":0.321,"ó":0.565,"ú":0.604,"ñ":0.642,"Á":0.705,"É":0.632,"Í":0.392,"Ó":0.745,"Ú":0.726,"Ñ":0.748,"ü":0.604," ":0.223,".":0.199,",":0.204,"-":0.385,"·":0.199,"'":0.206};
/** El `tracking-[-0.015em]` de SheetTitle: cada letra avanza 0,015 em menos. */
export const SHEET_TITLE_TRACKING_EM = -0.015;
/**
 * Reserva por letra para el pintado entre plataformas (continuación del PR 119; maestro, decisión 30). Medida directa en las 42
 * anotaciones de la prueba «hojas con SheetTitle al 200 %…» del run 46098875205 (14 hojas × 320, 360 y 390 al 200 %): con el mismo
 * tamaño de letra y la misma columna que en local, la diferencia Linux − local del ancho de la PALABRA COMPLETA va de −0,42 a
 * +0,547 px por letra, a cualquier tamaño (de 6 a 42 px); como razón, de 0,96 a 1,15, así que un margen porcentual no la cubre.
 * Explicación (F120-2): es una HIPÓTESIS TÉCNICA fuertemente respaldada por esas 42 medidas de palabras completas, no demostrada
 * glifo a glifo, que Chromium con FreeType en Linux redondea el avance de cada glifo a píxeles enteros. 0,6 px es una RESERVA
 * EMPÍRICA que cubre el máximo medido (0,547), no una garantía universal para cualquier fuente, plataforma o tamaño. Va en px porque,
 * según esa hipótesis, el redondeo es por píxel del dispositivo y no escala con la letra. Sustituye al 2 % empírico del PR 119.
 */
export const SHEET_TITLE_GLYPH_RESERVE_PX = 0.6;
/** El tope del título de las hojas: 1,4375rem (23 px a la escala por defecto). */
export const SHEET_TITLE_CAP_REM = 1.4375;
/**
 * Cada palabra de un título de hoja: su ancho en em de Brygada 1918 500 con el tracking del título (suma de avances, redondeada hacia
 * arriba a la centésima, para no quedar nunca por debajo del ancho real) y su número de letras. Un carácter fuera de la tabla cuenta
 * como uno ancho (1 em), para que un título nuevo nunca se corte.
 */
export function sheetTitleWords(name: string) {
  return name.trim().split(/\s+/).map((word) => ({
    word,
    em: Math.ceil([...word].reduce((sum, letter) => sum + (BRYGADA_500[letter] ?? 1) + SHEET_TITLE_TRACKING_EM, 0) * 100) / 100,
    glyphs: [...word].length,
  }));
}
/**
 * El tamaño de letra de SheetTitle, en CSS: el tope, o el mayor tamaño con el que CADA palabra, más su reserva por letra, cabe en
 * la columna (`100cqi`). Un término por palabra, porque con la reserva por letra la palabra que manda depende del ancho.
 */
export function sheetTitleSize(name: string) {
  const terms = sheetTitleWords(name).map(({ em, glyphs }) => `calc((100cqi - ${Math.round(glyphs * SHEET_TITLE_GLYPH_RESERVE_PX * 100) / 100}px) / ${em})`);
  return `min(${SHEET_TITLE_CAP_REM}rem, ${terms.join(", ")})`;
}
/** La misma cuenta que `sheetTitleSize`, en px, para una columna y un tamaño de raíz dados (pruebas y arnés). */
export function sheetTitleFontPx(name: string, columnPx: number, rootPx = 16) {
  return Math.min(SHEET_TITLE_CAP_REM * rootPx, ...sheetTitleWords(name).map(({ em, glyphs }) => (columnPx - glyphs * SHEET_TITLE_GLYPH_RESERVE_PX) / em));
}
export function onestSemiboldEm(text: string) {
  const measured = MEASURED[text];
  const em = measured ?? [...text].reduce((total, letter) => total + (ONEST_600[letter] ?? 0.9), 0) * 1.04;
  return Math.ceil(em * 100) / 100;
}
