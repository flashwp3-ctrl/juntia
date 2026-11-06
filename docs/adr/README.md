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
| ADR-002 | Dinero/splits | Unidades menores ISO + algoritmo de mayor residuo con desempate estable; moneda única por grupo en P0. **Nota de implementación del 6 nov 2026** (maestro §15.10, decisión 20.8): partes en pesos enteros, desempate por orden de ingreso a la pareja | [ADR-002](ADR-002-dinero-y-repartos.md) |
| ADR-003 | Historial de miembros | Acceso grupal revocado; snapshot privado mínimo o bloquear la salida/expulsión hasta que exista | [ADR-003](ADR-003-salida-y-expulsion-de-miembros.md) |
| ADR-004 | Presupuestos | Grupo = gasto completo; personal = gasto privado + partes; ambos opcionales, ausencia ≠ cero, totales no aditivos | — |
| ADR-005 | IA | Post-MVP, con consentimiento, agregados minimizados, salida validada y fallback sin modelo | — |
| ADR-006 | Offline | No prometer sin cola idempotente y resolución de conflictos | — |
| ADR-007 | Correcciones | Ajustes auditados que recalculan balances; liquidaciones inmutables. **Enmienda del 6 nov 2026** (maestro §15.10, decisión 20.11): una liquidación se puede anular con auditoría; nunca se edita ni se borra | [ADR-007](ADR-007-correcciones.md) |
| ADR-008 | Demo | Pública posterior, exclusivamente con fixtures aisladas, sin acceso a finanzas reales | — |
| ADR-009 | Planes | Uso personal no comercial en hosting Hobby; revisar licencia y plan antes de actividad comercial | — |
| ADR-010 | Metas | Ledger auditable separado del consumo; usos enlazados a gasto, sin doble contabilización; confirmación para aportes ajenos | — |
| ADR-011 | Pruebas y CI | **Decisión nueva, no registrada en el maestro.** Cada criterio de aceptación de P0 se ubica en la capa más baja que puede detectar su fallo; tope de 4–6 specs E2E para todo P0; presupuestos de tiempo que fallan el build; CI en dos niveles. Refina §10.1 declarando que el gate «Visual y motion» es humano y queda fuera de CI. **Estado: Aceptado** (3 nov 2026) | [ADR-011](ADR-011-estrategia-de-pruebas-y-ci.md) |
| ADR-012 | Flujo de especificación | **Decisión nueva, no registrada en el maestro.** Adoptar GitHub Spec Kit en parte: v1.2.6 fijada, solo la integración Claude (Codex diferido), sin eventos ni extensiones `git` ni `agent-context`, scripts `sh`, constitución reducida a un puntero sin principios propios, ajustes de plantillas como overrides, workflow incluido retirado y gates humanos en el merge de cada PR de documentación. **Estado: Aceptado** (3 nov 2026) | [ADR-012](ADR-012-adopcion-spec-kit.md) |
| ADR-013 | Acceso a datos | **Decisión nueva, no registrada en el maestro.** Resuelve el pendiente del maestro §15.10: `supabase-js` con `@supabase/ssr`; la API solo ve vistas y funciones de entrada; las tablas y las funciones privilegiadas viven en esquemas no expuestos. Las tablas de dinero y de membresía solo se escriben a través de funciones propiedad de un rol sin `BYPASSRLS`, de modo que la RLS se sigue aplicando, con idempotencia, bloqueo del agregado e importes como texto en la frontera. Sin ORM en P0. **Estado: Aceptado** (4 nov 2026, maestro §15.10, decisión 15) | [ADR-013](ADR-013-acceso-a-datos.md) |

Los ADR sin archivo propio se leen en `docs/JUNTIA_MASTER.md` §12.2. Se
escribirán aquí cuando una especificación los necesite con más detalle del que
cabe en una fila.

## Decisiones nuevas

Una decisión **nueva** (no registrada en el maestro) que sea significativa o
difícil de revertir se escribe como un ADR nuevo con el siguiente número libre,
y se revisa antes de implementarla. No se decide dentro de una especificación
ni dentro de un PR de código.
