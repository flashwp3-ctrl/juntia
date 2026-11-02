# ADRs — Juntia

Los ADR del motor financiero se decidieron en el documento maestro v1.0 y se
mantienen vigentes en `docs/JUNTIA_MASTER.md` §12.2. Este directorio existe
porque el handoff de diseño cita ADR por número y porque §7.2 del maestro
prevé `docs/adr/` en la estructura del proyecto.

**Regla de autoridad:** la resolución corta de §12.2 es la decisión. Los
archivos de este directorio la desarrollan con el detalle acordado durante la
fase de diseño; **no la sustituyen ni la amplían**. Si un archivo de aquí
contradice al maestro, manda el maestro.

## Índice

| ADR | Tema | Resolución (maestro §12.2) | Archivo |
| --- | --- | --- | --- |
| ADR-001 | Contextos | Conversión privado→grupo no es un toggle invisible: crear nuevo gasto compartido y anular el previo con flujo auditado | [ADR-001](ADR-001-conversion-privado-compartido.md) |
| ADR-002 | Dinero/splits | Unidades menores ISO + algoritmo de mayor residuo con desempate estable; moneda única por grupo en P0 | — |
| ADR-003 | Historial de miembros | Acceso grupal revocado; snapshot privado mínimo o bloquear la salida/expulsión hasta que exista | [ADR-003](ADR-003-salida-y-expulsion-de-miembros.md) |
| ADR-004 | Presupuestos | Grupo = gasto completo; personal = gasto privado + partes; ambos opcionales, ausencia ≠ cero, totales no aditivos | — |
| ADR-005 | IA | Post-MVP, con consentimiento, agregados minimizados, salida validada y fallback sin modelo | — |
| ADR-006 | Offline | No prometer sin cola idempotente y resolución de conflictos | — |
| ADR-007 | Correcciones | Ajustes auditados que recalculan balances; liquidaciones inmutables | — |
| ADR-008 | Demo | Pública posterior, exclusivamente con fixtures aisladas, sin acceso a finanzas reales | — |
| ADR-009 | Planes | Uso personal no comercial en hosting Hobby; revisar licencia y plan antes de actividad comercial | — |
| ADR-010 | Metas | Ledger auditable separado del consumo; usos enlazados a gasto, sin doble contabilización; confirmación para aportes ajenos | — |

Los ADR sin archivo propio se leen en `docs/JUNTIA_MASTER.md` §12.2. Se
escribirán aquí cuando una especificación los necesite con más detalle del que
cabe en una fila.

## Decisiones nuevas

Una decisión **nueva** (no registrada en el maestro) que sea significativa o
difícil de revertir se escribe como un ADR nuevo con el siguiente número libre,
y se revisa antes de implementarla. No se decide dentro de una especificación
ni dentro de un PR de código.
