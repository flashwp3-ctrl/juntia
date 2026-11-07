# ADR-004 — Presupuestos

**Estado:** Aceptado · **Origen:** documento maestro v1.0 §12.2 · **Archivo creado:** 7 de noviembre de 2026, con la especificación 004 (P0-3) · **Alcance:** P0

## Decisión (maestro §12.2, sin cambios)

> Grupo = gasto completo; personal = gasto privado + partes; **ambos opcionales,
> ausencia ≠ cero**, totales no aditivos.

Desarrollo en el maestro §5.2 y §5.3 (DEC-R01) y §15.5:

- **Presupuesto ausente no es presupuesto cero.** Hay tres estados: no existe,
  activo con un límite válido, y archivado o desactivado. Ninguna consulta fabrica
  `limit = 0` con `COALESCE`; el frontend recibe `budget: null` o un estado tipado.
  Un límite de cero no se admite como presupuesto activo.
- **Dos atribuciones paralelas y no aditivas.** El presupuesto de un grupo consume
  el importe completo de sus gastos activos del periodo y la categoría, nunca gastos
  privados. El presupuesto personal consume los gastos privados de la persona más la
  parte que le corresponde en los gastos del grupo. Nunca se suman entre sí como
  «gasto consolidado».
- Ingresos, liquidaciones y aportes a metas no consumen presupuesto. Un gasto
  financiado con una meta sí lo consume, una sola vez.
- `budget_remaining` existe solo con presupuesto activo, puede ser negativo y se
  muestra como «excedido», no se oculta en cero.
- Cualquiera de los dos integrantes crea, edita o desactiva un presupuesto
  compartido, sin segunda aprobación ni activación automática; con autor, fecha e
  historial, y sin sobrescrituras silenciosas (§15.5; §15.6.3 punto 7).

Este archivo existe porque la especificación 004 necesita más detalle del que
cabe en la fila del maestro (`docs/adr/README.md`). **No sustituye ni amplía**
la resolución de §12.2; si la contradice, manda el maestro.

## Nota de implementación · 7 de noviembre de 2026 (decisión 22.7)

Decisión de los fundadores sobre la pregunta Q7 de la especificación 004. No
cambia la decisión, solo **concreta qué significa «mensual»**, que la fila y §5.3
dejaban abierto («mensuales, por contexto/categoría/moneda/periodo»).

1. **Un presupuesto vigente rige cada mes** hasta que se edita o se desactiva. No
   hay que crearlo de nuevo cada mes. No es un límite fabricado: lo creó una
   persona, y la app no lo propone ni lo activa por su cuenta (DEC-R01-S sigue en P1).
2. **Una edición rige desde el mes en que se hace**, incluido, y hacia adelante.
3. **Los meses anteriores conservan el límite que tenían.** El historial guarda,
   por cada cambio, el autor, el instante, el valor anterior y el nuevo, y el mes
   desde el que rige; así se puede responder «¿qué límite regía en {mes}?».
4. **Desactivar rige desde el mes en curso.** Los meses anteriores conservan su
   límite y su historia; el mes en curso y los siguientes quedan sin presupuesto
   (`budget: null`). La interfaz llama «Desactivar» a esta operación, que es el
   estado «archivado o desactivado» de DEC-R01.
5. **Una configuración activa por clave** (contexto, categoría y moneda), como dice
   §7.3. La clave no incluye el mes: el mes es la vigencia.

Además, la decisión 22.8 fija que en P0 un presupuesto es siempre **por categoría
de gasto** (las nueve del catálogo, incluida «Otra»), nunca de «Ingresos», y que no
existe un total del mes.

## Verificación pendiente [V]

En P0-3 (spec 004): el modelo de vigencia responde «¿qué límite regía en {mes}?»
en una vista de una sola sentencia, antes de cerrar el plan; las ediciones
concurrentes (editar contra editar y editar contra desactivar, en los dos órdenes)
fallan por versión sin cambiar nada; y la creación concurrente de la misma clave
deja un solo presupuesto activo.

## Referencias

- `docs/JUNTIA_MASTER.md` §5.2, §5.3, §12.2, §15.5, §15.6.3 y §15.10 (decisión 22)
- `specs/004-presupuestos-y-metas/spec.md`, Q7 y Q8, FR-010 a FR-018
- ADR-013 §3.5 (ediciones de presupuesto con control de versión)
