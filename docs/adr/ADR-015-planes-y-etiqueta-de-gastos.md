# ADR-015 — Planes: entidad propia y etiqueta adicional de los gastos

**Estado:** **Aceptado** (25 de noviembre de 2026; maestro §15.10, decisión 27.3). Propuesto el 24 de noviembre de 2026. Los fundadores respondieron ese día las preguntas de la spec 006 que lo afectan: aceptaron Q2, Q4, Q5, Q6, Q14 y Q15 tal como se recomendaron, y cambiaron Q12 (plan cerrado bloqueado, §5). El mismo día aceptaron también las recomendaciones de Q21–Q23. El 25 de noviembre de 2026 Alejandro decidió Q24 (gasto compartido pagado con una meta compartida, §4; decisión 27.4). La revisión del PR #94 cerró F94-1 a F94-10. No se implementa antes de declarar MVP-1, y sus `[V]` siguen pendientes · **Origen:** especificación 006 · **Alcance:** MVP-2

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

## Decisión

### 1. El plan es una entidad propia, no una categoría ni una meta

- **No es una categoría:** un gasto del viaje sigue siendo «Restaurantes» o
  «Transporte»; el desglose por categoría del plan depende de eso.
- **No es una meta:** las metas son ahorro y tienen ledger (ADR-010). Un plan no
  guarda dinero, no tiene aportes ni saldo; solo agrupa gastos. Mezclarlos
  confundiría gasto con ahorro (§2.3.5).
- **Tabla `juntia_data.outings`** (el identificador evita el choque
  con el destino «Plan», la ruta `/plan` y `src/features/plan`; spec 006, Q2):
  `id`, `owner_user_id` **XOR** `group_id` (como DEC-G01), `name`, `starts_on`,
  `ends_on` (opcionales, fin ≥ inicio), `budget_minor` (nullable, > 0 si existe,
  nunca 0; DEC-R01), `outing_type` `[P]`, `cover_id` (ADR-014), `status`
  (`active | closed`), `version`, `created_by`, `created_at`, `updated_at`.
- Controlada según ADR-013: escritura solo por funciones `security definer` de
  `juntia_writer`, idempotentes, con bloqueo del plan y auditoría.
- **Auditoría: se amplía `juntia_data.audit_events`, no se crea otro sistema.** Hoy
  sus restricciones solo admiten las entidades y acciones de P0. La primera
  versión (`20261105000200_controlled_tables.sql`, líneas 34 y 36) admitía solo
  `transaction` y `create | update | void`, y `idempotency_records` tenía su propia
  lista de acciones en la línea 43. La lista vigente la fija
  `20261107221547_budgets.sql`, líneas 52 a 56.

  El **PR A** de la 006 las amplía con una migración versionada, como hicieron la
  003 y la 004 (borrar la restricción y crearla de nuevo con la lista ampliada):
  - `entity_type`: añade `outing`, `outing_tag` y `cover_photo` (ADR-014);
  - `action`: añade `close`, `reopen`, `delete`, `tag` y `untag`;
  - las cinco operaciones del plan se auditan con estas parejas:

    | Operación | `entity_type` | `action` |
    | --- | --- | --- |
    | Crear | `outing` | `create` |
    | Editar | `outing` | `update` |
    | Cerrar | `outing` | `close` |
    | Reabrir | `outing` | `reopen` |
    | Eliminar | `outing` | `delete` |

  - `idempotency_records.action` recibe las acciones nuevas de escritura;
  - columna nueva, `visible_to_user_id uuid null`. Es una **clasificación**, no un
    permiso ni un filtro (F94-8). Marca que el evento queda clasificado para
    acceso exclusivo de esa persona **cuando exista un lector autorizado**. Es el
    caso de los eventos derivados de gastos privados (§5, «Eliminar»). Por sí sola
    no da acceso a nadie ni se lo quita a nadie.

  Todo lo demás se conserva tal cual:
  - solo inserción (`audit_events_append_only` y `audit_events_no_truncate`);
  - inserción solo por `juntia_writer` con `actor_user_id = auth.uid()`;
  - **ninguna** política de lectura para `authenticated`;
  - el contrato de privacidad del §5 («Eliminar»).

  Cada una de las cinco operaciones tiene su pgTAP: el evento correcto, el actor
  correcto y que un `update` o `delete` posterior del evento falla.

### 2. La relación con el gasto es una etiqueta en una tabla aparte

**Tabla `juntia_data.outing_transactions`**:
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
- **Pagó / le corresponde** por persona dentro del plan: cifras derivadas
  **propias del plan**, `plan_paid` y `plan_share`. Sin usos de meta coinciden con
  `gross_paid` y con la suma de `transaction_allocations` restringidos al plan;
  con usos de meta se calculan sobre A − U (Q24, abajo). **No reutilizan ni
  redefinen `gross_paid`** (maestro §5.1), **no son `net_owed`** y no se rotulan
  como deuda; el único saldo de la pareja sigue siendo el de Balance (20.9).
- **Presupuesto del plan:** compara solo con el total compartido (o el total de un
  plan privado). No es un `budgets` de ADR-004 y no se suma ni se resta con ellos.
- Ninguna cifra del plan entra en las cinco métricas de DEC-G04, ni las altera.

**Regla de agregación del detalle compartido (F94-3).** En un plan compartido,
**todas** las cifras compartidas se calculan **exclusivamente** sobre los gastos
**compartidos** (`group_id` igual al del plan) y **activos** de esa pareja que
llevan la etiqueta del plan. Eso incluye el total, el desglose por categoría, los
porcentajes, el presupuesto, «pagó», «le corresponde» y «diferencia en este plan».

El filtro va **explícito** en la vista o en la función: `t.group_id = o.group_id
and t.status = 'active'`. Así quedan fuera **también los privados de quien
consulta**, que la RLS sí le deja ver. La RLS de `transactions` es una **defensa
adicional**, no el filtro que define el agregado. La única cifra que incluye
privados es la línea aparte «Tus gastos privados en este plan». Sale de una lectura
distinta, filtrada por `owner_user_id = auth.uid()`, y nunca se combina con las
cifras compartidas.

En un plan privado, las cifras salen de los gastos privados activos de su dueña
etiquetados en él.

**Gasto compartido pagado con una meta compartida (Q24, opción A; decisión 27.4,
25 de noviembre de 2026).** Cuenta completo en el total y en el desglose por
categoría (Q7). En «Quién pagó», la parte pagada con la meta, que es la suma de
los usos **aplicados y no anulados** de ese gasto (entradas `usage` de `goal_ledger_entries` sin su `void`), aparece como una línea
propia por meta, «Pagado con la meta {meta}», que no se asigna a nadie. Una
solicitud pendiente, rechazada o cancelada no cuenta.

Para un gasto de importe A con usos aplicados por U (0 ≤ U ≤ A), confirmado por
los fundadores el 25 de noviembre de 2026 (spec 006, Q24):

- `plan_paid` del pagador suma **A − U**.
- `plan_share` reparte **A − U** con pesos iguales a la **proporción de las
  asignaciones originales** de `transaction_allocations`, sea cual sea el modo de
  reparto (50/50, Porcentaje o Importe; 003, FR-019): mayor residuo, pesos
  enteros y desempate por orden de ingreso a la pareja (ADR-002, nota de la
  decisión 20.8). Una asignación de 0 da 0. Ejemplo en modo Importe: $400.000 =
  $300.000 + $100.000, con U = $150.000, da $187.500 y $62.500.
- Se cumplen dos igualdades: Σ `plan_paid` + Σ líneas de meta = total, y Σ
  `plan_share` = Σ `plan_paid`.

**Intacto:** `gross_paid` (sigue siendo A para el pagador, maestro §5.1),
`transaction_allocations`, `net_owed`, Balance y las cinco métricas de DEC-G04.
**Recalculado:** `plan_paid`, `plan_share` y la diferencia del plan, cada vez que
U cambia (uso aplicado, solicitud aprobada, «Quitar el uso de la meta», anulación
del gasto o del uso). Son cifras de lectura: no se guardan, se derivan en la
función pura del dominio y en la vista.

**Matiz de Balance, aceptado por los fundadores.** La «Diferencia en este plan» es
informativa y puede no coincidir con lo que ese gasto mueve en Balance. Balance
conserva el reparto completo (004, FR-058) y sigue siendo **el único saldo real**
de la pareja (20.9). Ni el balance de la pareja ni ADR-010 cambian.

Todas se calculan en funciones puras del dominio, con pruebas, y en vistas
`security_invoker`.

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
- **Eliminar:** borra el plan, y la cascada borra sus etiquetas, **incluidas las de
  gastos privados de la otra persona**, sin revelárselas a quien elimina. Los gastos
  no cambian, y la foto se borra según ADR-014.
  - **Confirmación previa:** puede contar los gastos que ve **quien elimina**,
    incluidos sus propios privados, porque solo se le muestra a esa persona. Ese
    conteo se lee de las **tablas del plan** (`outing_transactions` con
    `transactions`, a través de las vistas `security_invoker` del plan), **nunca de
    `audit_events`** (F94-8).
  - **Auditoría compartida (F94-1):** el evento `outing / delete` guarda solo el
    actor, la operación, el id del plan, el instante y, como mucho, el **número de
    gastos compartidos** que tenía. **Nunca** guarda un número que incluya
    privados, ni los ids de etiquetas o gastos privados. En el ejemplo, Sara
    elimina un plan con dos gastos compartidos y uno privado suyo: el evento dice
    «2», no «3».
  - **Auditoría personal de las etiquetas privadas:** la etiqueta de cada gasto
    privado que cae por la cascada se registra en un evento aparte,
    `outing_tag / untag`, por dueña. Ese evento lleva una columna nueva y
    obligatoria, `visible_to_user_id`, con el id de **la dueña del gasto**,
    **también cuando el actor es la otra persona**. El evento queda clasificado
    para acceso exclusivo de la dueña cuando exista un lector autorizado.
  - La regla vale para cualquier evento sobre un plan compartido: un dato derivado
    de privados solo va en un evento con `visible_to_user_id`.
  - **Hoy nadie lee `audit_events` desde la app:** `authenticated` no tiene
    ninguna política ni ningún permiso de lectura, y este ADR no los añade.
  - **Contrato para futuros lectores (F94-8).** Cualquier lector autorizado que se
    añada después tiene que aplicar el filtro de visibilidad **antes** de devolver
    nada, sea una vista, una función, una exportación o una herramienta de soporte.
    El filtro es `visible_to_user_id is null or visible_to_user_id = auth.uid()`, y
    aplica a las filas, a los conteos, a las fechas (`max(occurred_at)`) y a los
    errores. Añadir un lector así es un cambio de este contrato y se revisa contra
    este ADR.
- **Gasto anulado:** conserva su etiqueta (auditoría) y sale de las cifras.
- **Mover a Pareja (ADR-001):** dentro de la misma transacción.
  - Si el plan es compartido de esa pareja, la etiqueta pasa al gasto compartido
    nuevo.
  - Si es privado y está **activo**, la etiqueta se quita y la confirmación lo dice.
  - Si es privado y está **cerrado**, la operación se rechaza (Q23, arriba).
  - Su Deshacer sigue las mismas reglas.

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
5. **Eliminar sin filtrar privados (F94-1 y F94-8).** Plan compartido con dos
   gastos compartidos y uno privado de Sara. Son tres verificaciones separadas:
   1. **Confirmación previa**, leída con la identidad de cada persona desde las
      vistas del plan: la de Sara cuenta 3 y la de Tomás, 2.
   2. **Contenido de la auditoría, en pgTAP con inspección privilegiada** (como
      dueño de las tablas, no como `authenticated`). Se ejecuta dos veces: primero
      elimina Sara y luego, sobre un plan igual, elimina Tomás. En los dos casos:
      - el evento `outing / delete` contiene solo datos compartidos (actor,
        operación, plan, instante y «2»), sin ningún dato del gasto privado;
      - el evento `outing_tag / untag` registra `visible_to_user_id` = Sara,
        **también cuando el actor es Tomás**.
   3. **Permisos:** Sara, Tomás y una tercera cuenta, como `authenticated`, siguen
      **sin poder leer** `audit_events` directamente. Un `select` falla o no
      devuelve filas, y lo mismo ocurre con los conteos.

   El contrato para futuros lectores (§5) no se prueba aquí, porque hoy no existe
   ningún lector. Se prueba en el PR que añada uno.
6. **Cifras compartidas sin privados propios (F94-3).** Se calculan dos veces, con
   la identidad de Sara y con la de Tomás, antes y después de que Sara etiquete un
   gasto privado en el plan:
   - total, desglose por categoría, porcentajes, presupuesto, «pagó», «le
     corresponde» y «diferencia»;
   - las ocho cifras son idénticas en las cuatro lecturas;
   - solo cambia la línea «Tus gastos privados» de Sara.
7. **Auditoría ampliada (F94-6).** pgTAP de crear, editar, cerrar, reabrir y
   eliminar un plan: el evento y el actor son los correctos, y el evento no se
   puede editar ni borrar.
8. **Gasto pagado con una meta (Q24; F95-1 a F95-3).** La matriz de Q24 de la
   spec 006 (US-2), en dominio e integración, con `plan_share` en 50/50,
   Porcentaje e Importe, una base impar y una asignación de 0. En cada caso,
   `gross_paid`, `net_owed`, `transaction_allocations` y las cinco métricas de
   DEC-G04 son iguales con y sin la etiqueta del plan.

## Referencias

- `docs/JUNTIA_MASTER.md` §2.3, §5.1, §5.3, §5.4, §5.6, §7.3, §7.4, §15.3, §15.5 y
  §15.10 (decisiones 16.15, 20.9, 20.12 y 22.11)
- ADR-001 · ADR-004 · ADR-007 · ADR-010 · ADR-013 §2, §3 y §5.1 · ADR-014
- `specs/006-planes/spec.md`
