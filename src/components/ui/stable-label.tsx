// 005 · PR B (CLS, FR-050 y FR-051; extensión de la opción A aprobada por el gestor el 19 nov 2026). El texto de una acción
// centrada en una caja del ancho que mide en Onest 600, en em (escala con la letra). Centrada por su ancho, la acción se movía al
// llegar la fuente: «Reintentar» del estado de error, 6 px en Firefox a 390 (parcial 44433137464). Con la caja fija, el texto se
// reacomoda dentro y la acción no se mueve. A la escala normal mide lo mismo que con Onest.
import { onestSemiboldEm } from "@/lib/text-fit";

export function StableLabel({ text }: { text: string }) {
  return <span data-stable-label="" className="inline-block max-w-full text-center" style={{ width: `${onestSemiboldEm(text)}em` }}>{text}</span>;
}
