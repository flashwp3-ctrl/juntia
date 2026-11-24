# ADR-015 — Planes: entidad propia y etiqueta adicional de los gastos

**Estado:** **Propuesto** (24 de noviembre de 2026). Los fundadores respondieron el 24 de noviembre de 2026 las preguntas de la spec 006 que lo afectan: aceptaron Q2, Q4, Q5, Q6, Q14 y Q15 tal como se recomendaron, y Q12 la cambiaron (plan cerrado bloqueado, §5). El mismo día aceptaron también las recomendaciones de Q21–Q23. Faltan dos cosas:
- el paso a **Aceptado** en el PR documental que registre la decisión en el maestro §15.10;
- que MVP-1 esté declarado antes de implementar · **Origen:** especificación 006 · **Alcance:** MVP-2

## Contexto

Los fundadores piden agrupar gastos en un «plan» —un viaje, una salida, un
evento— y leerlo como un todo: total, presupuesto, categorías, quién pagó y un
histórico. Los gastos tienen que seguir contando **igual** en Yo, Nosotros, el
balance, los presupuestos mensuales y Análisis.

Es una decisión nueva y difícil de revertir: añade una entidad con permisos, cambia
qué puede llevar un gasto y abre un camino nuevo por el que un gasto privado podría
filtrarse a la pareja (§2.3.6, §7.4, US-05). Por eso va a un ADR antes de la etapa
Plan (`AGENTS.md` 17).

Lo que no se puede romper:

- Un gasto existe una vez y cuenta una vez (US-08, DEC-G04).
- Un gasto privado no se revela ni por agregados.
- Los movimientos no se borran (§5.4); las ediciones llevan versión y auditoría
  (16.15, 20.12).
- La tabla `transactions` es una **tabla controlada** (ADR-013 §2): solo la escriben
  funciones de `juntia_private`, y su versión protege las ediciones concurrentes.

## Decisión propuesta

### 1. El plan es una entidad propia, no una categoría ni una meta

- **No es una categoría:** un gasto del viaje sigue siendo «Restaurantes» o
  «Transporte»; el desglose por categoría del plan depende de eso.
- **No es una meta:** las metas son ahorro y tienen ledger (ADR-010). Un plan no
  guarda dinero, no tiene aportes ni saldo; solo agrupa gastos. Mezclarlos
  confundiría gasto con ahorro (§2.3.5).
- **Tabla `juntia_data.outings`** **[propuesta]** (el identificador evita el choque
  con el destino «Plan», la ruta `/plan` y `src/features/plan`; spec 006, Q2):
  `id`, `owner_user_id` **XOR** `group_id` (como DEC-G01), `name`, `starts_on`,
  `ends_on` (opcionales, fin ≥ inicio), `budget_minor` (nullable, > 0 si existe,
  nunca 0; DEC-R01), `outing_type` `[P]`, `cover_id` (ADR-014), `status`
  (`active | closed`), `version`, `created_by`, `created_at`, `updated_at`.
- Controlada según ADR-013: escritura solo por funciones `security definer` de
  `juntia_writer`, idempotentes, con bloqueo del plan y auditoría.

### 2. La relación con el gasto es una etiqueta en una tabla aparte

**Tabla `juntia_data.outing_transactions`** **[propuesta]**:
`transaction_id` (PK y FK: **como máximo un plan por gasto**), `outing_id` (FK con
`on delete cascade`), `tagged_by`, `tagged_at`.

Por qué aparte y no una columna `transactions.outing_id`:

1. **No toca la fila del dinero.** Poner o quitar un plan no cambia la versión del
   gasto, no muestra «Editado por» y no choca con una edición concurrente del
   monto (spec 006, Q15).
2. **No toca la tabla controlada `transactions`** ni sus restricciones, triggers y
   funciones de P0, que están en producción.
3. **Eliminar un plan no reescribe gastos:** la cascada borra solo las etiquetas.
4. **La privacidad se expresa en una sola política:** una etiqueta es visible solo si
   quien lee puede ver **el gasto** y **el plan**.

Coste: un `join` más en las lecturas de Actividad y del plan, y una restricción de
compatibilidad que necesita un trigger, porque cruza dos tablas.

### 3. Compatibilidad entre gasto y plan, en la base de datos

Un trigger de la tabla de etiquetas, no la interfaz, impone (spec 006, Q5 y Q6):

| Gasto | Plan privado de su dueña | Plan compartido de su pareja |
| --- | --- | --- |
| Privado | Sí | Sí, con separación estricta (Q6) |
| Compartido | **No, nunca** | Sí, solo de la misma pareja |
| Ingreso o liquidación | No | No |

Además: el gasto y el plan en COP; la pareja activa (nunca provisional ni
descartada); quien etiqueta puede editar el gasto (dueña en privados; cualquiera de
los dos en compartidos, 20.12).

### 4. Cifras: el plan no crea ninguna métrica de dinero

- **Total compartido del plan** = suma de `amount_minor` de los gastos **activos**
  compartidos etiquetados. Es `group_total` restringido al plan.
- **Privados propios en un plan compartido** (Q6): cifra aparte, solo para su
  dueña, **nunca sumada** a una cifra compartida. Es la regla de la decisión 22.11
  para las metas en Yo.
- **Pagó / le corresponde** por persona dentro del plan: `gross_paid` y la suma de
  `transaction_allocations` restringidos al plan. **No es `net_owed`** y no se
  rotula como deuda; el único saldo de la pareja sigue siendo el de Balance (20.9).
- **Presupuesto del plan:** compara solo con el total compartido (o el total de un
  plan privado). No es un `budgets` de ADR-004 y no se suma ni se resta con ellos.
- Ninguna cifra del plan entra en las cinco métricas de DEC-G04, ni las altera.

Todas se calculan en funciones puras del dominio, con pruebas, y en vistas
`security_invoker`, de modo que la RLS de `transactions` excluye los privados de la
otra persona **antes** de agregar.

### 5. Ciclo de vida

- **Cerrar y reabrir** (decisión de los fundadores del 24 nov 2026, spec 006, Q12): cambia `status`. Es manual y reversible, lo puede hacer cualquiera de los dos en un plan compartido, y queda con versión y auditoría.
- **Un plan cerrado queda bloqueado, también en la base de datos:**
  - no se ofrece en Anotar ni en el campo «Plan» de Editar gasto;
  - las funciones rechazan editar su nombre, fechas, presupuesto o portada;
  - un trigger de `outing_transactions` rechaza **insertar o borrar** etiquetas de un plan cerrado, también si se intenta cambiar el plan de un gasto desde o hacia uno cerrado;

  para corregir algo se reabre, se cambia y se vuelve a cerrar.
- **El gasto sigue siendo dinero:** editar el importe de un gasto que está en un plan cerrado no toca la etiqueta y se permite. El total del plan cerrado lo refleja, porque se calcula y no se guarda.
- **Eliminar un plan cerrado no se permite** (Q21): la función de eliminar exige `status = 'active'`. Así la cascada solo corre sobre planes activos, y el trigger de bloqueo no necesita ninguna excepción para ella.
- **Anular un gasto de un plan cerrado se permite** (Q22): la anulación no toca la etiqueta, que se conserva para la auditoría, y el gasto sale del total calculado.
- **Mover a Pareja un gasto privado de un plan cerrado** (Q23): la etiqueta vive en `outing_transactions` y su clave es `transaction_id`. Como el gasto nuevo tiene otro id, pasar la etiqueta significa borrar la fila del gasto anulado e insertar la del nuevo, en la misma transacción de ADR-001.
  - Si el plan es **compartido**, ese traspaso es la **única excepción** al trigger de bloqueo. Solo la puede usar la función de Mover a Pareja y su Deshacer, con el mismo `outing_id`, y no cambia los gastos del plan, solo su id.
  - Si el plan es **privado**, la función rechaza la operación antes de anular nada y pide reabrirlo.
  - Alternativa de implementación que el plan puede preferir: conservar la etiqueta del gasto anulado y añadir la del nuevo, sin borrar nada. Si se elige, el trigger solo necesita la excepción para la inserción, y las lecturas ya excluyen los gastos anulados.
- **Eliminar:** borra el plan; la cascada borra sus etiquetas, **incluidas las de
  gastos privados de la otra persona** sin revelárselas a quien elimina; los gastos
  no cambian; la foto se borra según ADR-014. Auditoría con actor, instante y número
  de etiquetas **visibles para quien elimina**.
- **Gasto anulado:** conserva su etiqueta (auditoría) y sale de las cifras.
- **Mover a Pareja (ADR-001):** dentro de la misma transacción, la etiqueta pasa al
  gasto compartido nuevo si el plan es compartido de esa pareja; si es privado, se
  quita y la confirmación lo dice. Su Deshacer lo revierte igual.

## Alternativas consideradas

1. **Columna `transactions.outing_id`.** Más simple de leer. Pero cada etiqueta es una
   edición del gasto (versión, «Editado por», conflictos con ediciones de monto),
   toca la tabla controlada de P0 y eliminar un plan reescribiría gastos.
2. **Tabla de unión con varios planes por gasto.** Permite «Cartagena» y «Vacaciones
   2026» a la vez, pero un gasto en dos planes invita a sumar planes y contar dos
   veces. Los fundadores pidieron uno. Se puede abrir después cambiando la clave.
3. **Usar la descripción o una «etiqueta libre» de texto.** Sin entidad, no hay
   presupuesto, foto ni histórico fiables.
4. **Plan como meta especial.** Mezcla ahorro y gasto, y hereda un ledger que un plan
   no necesita.
5. **Solo planes compartidos con solo gastos compartidos.** La opción más segura; es
   la (b) de las preguntas Q4 y Q6 y sigue disponible si los fundadores la prefieren.

## Consecuencias

- Dos tablas controladas nuevas, sus vistas y funciones, con pgTAP de tres cuentas.
- Actividad y el detalle del gasto leen la etiqueta con un `join`.
- Mover a Pareja y su Deshacer ganan un paso dentro de su transacción.
- La exportación (§15.5) incluye los planes visibles y la etiqueta de cada gasto
  exportado; nunca las etiquetas de privados ajenos.
- El borrado manual de cuenta borra los planes de la persona y, con la pareja, los
  compartidos; las etiquetas caen por cascada.

## Verificación pendiente [V]

1. Que la cascada `on delete cascade` de `outings` a `outing_transactions` borra las
   etiquetas de gastos privados ajenos aunque la RLS impida verlas, en la versión de
   Postgres del stack (las acciones referenciales no aplican RLS).
2. pgTAP de las vistas del plan con tres cuentas: ninguna devuelve datos de un
   privado ajeno, ni en recuentos, ni en `max(updated_at)`, ni en errores.
3. Que el bloqueo del plan cerrado no se puede saltar llamando directamente a las funciones. Hay que probar cuatro casos:
   - asociar una etiqueta;
   - quitarla;
   - cambiar un gasto de plan, desde uno cerrado o hacia uno cerrado;
   - editar el plan.
   La edición del importe y la anulación de uno de sus gastos, en cambio, siguen funcionando. Además:
   - eliminar un plan cerrado se rechaza;
   - la excepción de Mover a Pareja solo la puede usar esa función y su Deshacer, nunca una llamada directa.
4. Que las cifras de Inicio, Balance, presupuestos, Análisis y DEC-G04 son idénticas
   con y sin etiquetas, con el dataset de la etapa Plan.

## Referencias

- `docs/JUNTIA_MASTER.md` §2.3, §5.1, §5.3, §5.4, §5.6, §7.3, §7.4, §15.3, §15.5 y
  §15.10 (decisiones 16.15, 20.9, 20.12 y 22.11)
- ADR-001 · ADR-004 · ADR-007 · ADR-010 · ADR-013 §2, §3 y §5.1 · ADR-014
- `specs/006-planes/spec.md`
