// 004 PR D (barrido T068, run 42939346411): con el texto al 200 % y 390 px, «Quitar el uso de la meta» se salía 2 px porque
// Button no parte su etiqueta. En los botones del gasto con meta la etiqueta puede ocupar dos líneas: el alto mínimo es el
// de su tamaño y las dos caras (reposo y carga) siguen en la misma celda, así que el ancho no salta al cargar. Nada se corta.
export const wrapLabelLg = "max-w-full !h-auto min-h-[52px] py-3 !whitespace-normal !leading-snug text-center";
export const wrapLabelMd = "max-w-full !h-auto min-h-11 py-2.5 !whitespace-normal !leading-snug text-center";
