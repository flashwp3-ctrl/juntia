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
| ADR-004 | Presupuestos | Grupo = gasto completo; personal = gasto privado + partes; ambos opcionales, ausencia ≠ cero, totales no aditivos. **Nota de implementación del 7 nov 2026** (maestro §15.10, decisión 22.7): un presupuesto rige cada mes hasta que se edita o se desactiva; los meses anteriores conservan su límite | [ADR-004](ADR-004-presupuestos.md) |
| ADR-005 | IA | Post-MVP, con consentimiento, agregados minimizados, salida validada y fallback sin modelo | — |
| ADR-006 | Offline | No prometer sin cola idempotente y resolución de conflictos | — |
| ADR-007 | Correcciones | Ajustes auditados que recalculan balances; liquidaciones inmutables. **Enmienda del 6 nov 2026** (maestro §15.10, decisión 20.11): una liquidación se puede anular con auditoría; nunca se edita ni se borra. **Nota del 18 nov 2026** (maestro §15.10, decisiones 24.8 y 25.3): el borrado manual de cuenta de MVP-1, solo con el procedimiento autorizado y ensayado, suspende por nombre cinco triggers de solo inserción dentro de una transacción como dueño | [ADR-007](ADR-007-correcciones.md) |
| ADR-008 | Demo | Pública posterior, exclusivamente con fixtures aisladas, sin acceso a finanzas reales | — |
| ADR-009 | Planes | Uso personal no comercial en hosting Hobby; revisar licencia y plan antes de actividad comercial | — |
| ADR-010 | Metas | Ledger auditable separado del consumo; usos enlazados a gasto, sin doble contabilización; confirmación para aportes ajenos. **Notas de implementación del 7 nov 2026** (maestro §15.10, decisiones 22.13 y 22.17): un aporte se anula, nunca se edita; «Quitar el uso de la meta» revierte un uso con auditoría. **Notas del 17 y 18 nov 2026** (decisiones 24.13 y 25.3): fotos de metas y ADR-014 a MVP-2; única excepción a «los aportes no se borran», el borrado manual de cuenta autorizado y ensayado | [ADR-010](ADR-010-metas.md) |
| ADR-011 | Pruebas y CI | **Decisión nueva, no registrada en el maestro.** Cada criterio de aceptación de P0 se ubica en la capa más baja que puede detectar su fallo; tope de 4–6 specs E2E para todo P0; presupuestos de tiempo que fallan el build; CI en dos niveles. Refina §10.1 declarando que el gate «Visual y motion» es humano y queda fuera de CI. **Estado: Aceptado** (3 nov 2026). **Notas del 17 y 18 nov 2026** (decisiones 24.3, 24.14 y 25.1): jobs `e2e` y `a11y-session`, cada uno < 660 s; nivel 2 sin implementar, a MVP-2; repositorio público | [ADR-011](ADR-011-estrategia-de-pruebas-y-ci.md) |
| ADR-012 | Flujo de especificación | **Decisión nueva, no registrada en el maestro.** Adoptar GitHub Spec Kit en parte: v1.2.6 fijada, solo la integración Claude (Codex diferido), sin eventos ni extensiones `git` ni `agent-context`, scripts `sh`, constitución reducida a un puntero sin principios propios, ajustes de plantillas como overrides, workflow incluido retirado y gates humanos en el merge de cada PR de documentación. **Estado: Aceptado** (3 nov 2026) | [ADR-012](ADR-012-adopcion-spec-kit.md) |
| ADR-013 | Acceso a datos | **Decisión nueva, no registrada en el maestro.** Resuelve el pendiente del maestro §15.10: `supabase-js` con `@supabase/ssr`; la API solo ve vistas y funciones de entrada; las tablas y las funciones privilegiadas viven en esquemas no expuestos. Las tablas de dinero y de membresía solo se escriben a través de funciones propiedad de un rol sin `BYPASSRLS`, de modo que la RLS se sigue aplicando, con idempotencia, bloqueo del agregado e importes como texto en la frontera. Sin ORM en P0. **Estado: Aceptado** (4 nov 2026, maestro §15.10, decisión 15). **Nota de implementación de §5.1 aprobada por los fundadores el 6 nov 2026** (rol `juntia_membership`, plan de la 003, PR #49). **Nota del 18 nov 2026** (decisión 25.3): el borrado manual de cuenta corre como dueño de las tablas, fuera de la API, sin roles ni privilegios nuevos | [ADR-013](ADR-013-acceso-a-datos.md) |
| ADR-014 | Fotos de portada | **Decisión nueva**, registrada en el maestro §15.10, decisión 27.2. Número reservado por las decisiones 22.6 y 24.13 para el Storage privado de fotos de metas, ampliado a los planes de la spec 006: bucket privado con RLS por dueña o pareja, lectura por una ruta autenticada que revalida en cada petición, portada lógica con dos variantes, JPEG ≤ 2048 px con lista blanca de segmentos (sin EXIF, GPS, ICC ni comentarios), borrado explícito en Storage, fotos fuera de la copia y de la exportación. **Estado: Aceptado** (25 nov 2026), MVP-2 | [ADR-014](ADR-014-fotos-de-portada.md) |
| ADR-015 | Planes | **Decisión nueva**, registrada en el maestro §15.10, decisión 27.3. El plan (viaje, salida, evento) es una entidad propia, privada XOR compartida, y su relación con el gasto es una etiqueta en una tabla aparte: un plan por gasto, sin cambiar ninguna cifra de dinero; un gasto compartido nunca lleva un plan privado. **Estado: Aceptado** (25 nov 2026), MVP-2. Incluye Q24 (gasto compartido pagado con una meta compartida, decisión 27.4). No confundir con ADR-009, «Planes» de hosting | [ADR-015](ADR-015-planes-y-etiqueta-de-gastos.md) |
| ADR-016 | Recurrencias e instancias | **Decisión nueva**, candidato ADR-a de la spec 007, registrada en el maestro §15.10, decisión 29.11. Instancias calculadas, de las que solo se guardan los hechos (omisión, cancelación, vínculo), con identidad `(regla, posición)`, edición limitada al día dentro de su periodo (cambiar la frecuencia es crear otra regla), versiones por posición, estado derivado, historial de pausas, vínculo 1:1 validado en el servidor y movimiento efectivo derivado de la cadena de ADR-001; nada previsto en `transactions`. **Estado: Aceptado** (25 nov 2026), MVP-2, con P1–P7 decididas por los fundadores el 25 nov 2026, entre ellas una excepción a Q6 (P7) | [ADR-016](ADR-016-recurrencias-e-instancias.md) |
| ADR-017 | Importes previstos y total de previstos | **Decisión nueva**, candidato ADR-b de la spec 007, registrada en el maestro §15.10, decisión 29.12. Tres formas de importe previsto (fijo, rango, desconocido), ninguna es cero; ninguna cifra mezcla lo previsto con lo real; y, solo si los comps cierran Q15 en (b), un total de gastos previstos por contexto y mes, calculado al leer, que conserva fijos, rangos y desconocidos y nunca muestra «$0» por ausencia. **No cierra Q15.** **Estado: Aceptado** (26 nov 2026), MVP-2. P1–P3 decididas por los fundadores el 26 nov 2026 (opciones (a)), condicionadas a que Q15 se cierre en (b) | [ADR-017](ADR-017-importes-previstos-y-total-de-previstos.md) |

Los ADR sin archivo propio se leen en `docs/JUNTIA_MASTER.md` §12.2. Se
escribirán aquí cuando una especificación los necesite con más detalle del que
cabe en una fila.

## Decisiones nuevas

Una decisión **nueva** (no registrada en el maestro) que sea significativa o
difícil de revertir se escribe como un ADR nuevo con el siguiente número libre,
y se revisa antes de implementarla. No se decide dentro de una especificación
ni dentro de un PR de código.
