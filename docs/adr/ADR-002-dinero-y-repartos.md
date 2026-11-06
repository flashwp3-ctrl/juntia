# ADR-002 — Dinero y repartos

**Estado:** Aceptado · **Origen:** documento maestro v1.0 §12.2 · **Archivo creado:** 6 de noviembre de 2026, con la especificación 003 (P0-2) · **Alcance:** P0

## Decisión (maestro §12.2, sin cambios)

> Unidades menores ISO + algoritmo mayor residuo y desempate estable; moneda
> única por grupo P0.

Desarrollo en el maestro §5.2:

- Los importes se guardan como enteros de **unidades menores ISO 4217**
  (`bigint`), nunca como `float`.
- COP se anota en pesos enteros, que se convierten de forma exacta a unidades
  menores.
- Las partes de un reparto suman **exactamente** el importe de origen.
- Con porcentajes se usa la asignación de **mayor residuo**, con un desempate
  estable por participante y un algoritmo versionado, en lugar de dar al pagador
  todos los restos.
- Cada grupo tiene una sola moneda. Una operación en otra moneda se rechaza; no
  se convierte en silencio.

Este archivo existe porque la especificación 003 necesita más detalle del que
cabe en la fila del maestro (`docs/adr/README.md`). **No sustituye ni amplía**
la resolución de §12.2; si la contradice, manda el maestro.

## Nota de implementación · 6 de noviembre de 2026 (decisión 20.8)

Decisión de los fundadores sobre la pregunta Q8 de la especificación 003. No
cambia la decisión, solo **concreta dos puntos que la fila dejaba abiertos**.

1. **Granularidad: pesos enteros.** En COP, las partes se calculan en
   **múltiplos de 100 unidades menores**. Así cada parte se puede mostrar sin
   decimales, como pide el maestro §5.2, y las partes que se ven suman el total
   que se ve. Ejemplo: un 50/50 de $186.401 da $93.201 y $93.200, nunca
   $93.200,50 a cada persona. La base sigue guardando unidades menores: lo que
   cambia es el paso del cálculo, no la unidad en que se guarda.
2. **Desempate estable: orden de ingreso a la pareja.** Cuando el mayor residuo
   empata, el peso sobrante va al integrante que entró antes en la pareja, es
   decir, a la propietaria. No se usa el identificador técnico, que para las
   personas es arbitrario, y el pagador tampoco recibe los restos por defecto.
3. **Porcentajes enteros** de 0 a 100. Una parte de 0 equivale a no participar
   (decisión 20.7).
4. **Versión del algoritmo.** La especificación 003 lo registra como la versión
   1 del reparto. Cambiar la granularidad o el desempate exige una versión nueva
   y conservar el cálculo de las partes ya guardadas, que no se recalculan.

## Verificación pendiente [V]

Pruebas de propiedad del dominio: para cualquier importe válido, modo de reparto
y conjunto de participantes, las partes son múltiplos de 100 unidades menores,
suman exactamente el importe y el resultado es determinista. La función SQL
vuelve a comprobar la suma. Se ejecutan en P0-2.

## Referencias

- `docs/JUNTIA_MASTER.md` §5.2, §12.2 y §15.10 (decisión 20)
- `specs/003-pareja-y-balances/spec.md`, Q7 y Q8, FR-019 y FR-020
- ADR-013 §6.2 (el reparto se calcula en el dominio y se vuelve a comprobar en SQL)
