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
export function onestSemiboldEm(text: string) {
  const measured = MEASURED[text];
  const em = measured ?? [...text].reduce((total, letter) => total + (ONEST_600[letter] ?? 0.9), 0) * 1.04;
  return Math.ceil(em * 100) / 100;
}
