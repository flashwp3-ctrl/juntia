# Comps de diseño · 006 Planes

**Estado:** propuestas `[P]`, **sin aprobación visual** (25 de noviembre de 2026).
Salen del prompt de `design-prompt.md` y no deciden el alcance: el alcance está en
`spec.md`. Pasar a la etapa Plan exige que los fundadores los aprueben con los dos
ajustes de abajo hechos («Lo que hace falta para pasar a Plan», punto 5).

## Dónde están

Están en el proyecto de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`
(«Juntia: Responsive design y design system»), repartidos en dos archivos:

| Archivo | Pantallas |
| --- | --- |
| «Juntia DS v1 - 10a Planes 06-1-06-4» | 06·1 Lista e histórico · 06·2 Crear y editar · 06·3 Detalle · 06·4 Añadir gastos |
| «10b Planes 06-5-06-9» | 06·5 Selector en Anotar · 06·6 Vacíos y límites · 06·7 Foto de portada · 06·8 Confirmaciones · 06·9 Plan cerrado |

No se copian al repositorio mientras no estén aprobados.

## Ajustes pendientes

Los hacen los fundadores en Claude Design:

1. **06·7, texto de la foto.** Dice «hasta 10 MB» y debe decir **15 MB**, el límite
   de origen de Q17 y ADR-014 §3.
2. **06·8, confirmación de eliminar.** Solo está la variante «Los 12 gastos». Falta
   la de quien tiene gastos privados en el plan, que según Q14 ve **13**: los 12
   compartidos más su privado. La otra persona sigue viendo 12 (US-3, escenario 4).

## Verificaciones `[V]` que dejó Claude Design

No se dan por hechas:

- **Contraste del scrim con la foto clara de la boda** (06·7, foto vertical en
  tonos claros): falta medir que el texto sobre la portada cumple el contraste en
  claro y en oscuro (BRAND §5; ADR-014).
- **Origen de las fotos de muestra:** vienen de Unsplash. Sirven solo para los
  comps; ni se publican ni entran al repositorio sin revisar la licencia.
- **El total compartido de un plan de la pareja en Yo** (06·1): hay que decidir si
  la tarjeta lo muestra. La spec dice que en Yo los planes de la pareja van aparte,
  sin un total que sume las dos listas (Q6; decisión 22.11). Si la tarjeta muestra
  su propio total, cumple esa regla mientras no se sume con los personales.
  Pendiente de confirmar con los comps delante.

Q24 (gasto pagado con una meta en «Quién pagó», decisión 27.4) es posterior a los
comps. La línea «Pagado con la meta {meta}» de 06·3 está por diseñar.
