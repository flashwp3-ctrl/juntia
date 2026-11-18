# Contrato del borrado manual de cuenta — 005

Aplica Q8 (opción a) y FR-067: en MVP-1, la eliminación de cuenta es un **procedimiento
manual documentado y ensayado en `juntia-dev`**, que ejecuta el gestor con el «sí» de la
persona y cuyo resultado es verificable; la interfaz sigue diciendo «no disponible» y
explica cómo pedirlo; la revisión legal se exige antes de abrir la app a terceros.

> **D2, decidido** (fundadores, 18 nov 2026): opción **(a)** ([../plan.md](../plan.md),
> «Para los fundadores»).
>
> - **Sin pareja activa:** se borra todo lo de la persona.
> - **Con pareja activa:** se borra la pareja completa, con el «sí» escrito de las dos y
>   la exportación previa de cada una.
>
> **Consecuencia que se decide con ella:** el script suspende los triggers de solo
> inserción dentro de una transacción como dueño (§3). Se registra como **nota a ADR-007
> y ADR-013 en el PR documental T085** (fila 19 de la lista de T085 del plan), no como ADR
> nuevo.
>
> **Nada se ejecuta contra producción** por este plan: solo el ensayo en `juntia-dev`.

## 1. Hechos del esquema que lo condicionan

Comprobados en las migraciones de `main` (`94675ca`):

- **Tablas de `juntia_data`:** `profiles`, `categories`, `transactions`,
  `transaction_allocations`, `settlements`, `groups`, `group_members`,
  `group_invitations`, `budgets`, `budget_versions`, `savings_goals`,
  `goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations`,
  `idempotency_records`, `audit_events` y `signup_allowlist`.
- **Ninguna clave foránea hacia `auth.users` tiene `on delete`.** Borrar el usuario de Auth
  falla mientras quede una fila que lo nombre.
- **Triggers que rechazan `delete`:** `audit_events_append_only`,
  `budget_versions_append_only`, `goal_ledger_append_only`,
  `goal_allocations_append_only` y `settlements_guard`; más sus gemelos `*_no_truncate`.
  Otras tablas rechazan la escritura directa por privilegios (ADR-013), no por trigger.
- **Mezcla de personas:** gastos compartidos y sus asignaciones, liquidaciones, metas
  compartidas con su ledger y solicitudes, e invitaciones nombran a las dos.

## 2. Alcance (D2, opción a)

| Caso | Qué se borra | Consentimiento |
| --- | --- | --- |
| La persona **no tiene pareja activa** | Todo lo que la nombra en las tablas de §1, su fila de `signup_allowlist` y su usuario de Auth | El «sí» escrito de la persona |
| La persona **tiene pareja activa** | **La pareja completa:** las dos personas, el grupo y todo lo de las dos | El «sí» escrito de **las dos**, tras exportar cada una sus datos (V10) |

Lo que **no** hace: seudonimizar, borrar a una persona y dejar a la otra con datos
compartidos, ni tocar las copias cifradas ya hechas (su retención es la del propio
fundador; la checklist lo dice).

## 3. Procedimiento

`scripts/account-deletion/` (PR A): un `delete-account.sql` y un `run.sh` que lo llama con
`psql -1` (una sola transacción) como dueño de las tablas, igual que el protocolo de
restauración de P0-3.

1. **Precondiciones, o se para sin tocar nada:**
   - el destino es el esperado: en el ensayo, el guardia de `juntia-dev`; en producción,
     solo con el procedimiento de migraciones y el «sí» por paso;
   - existe la persona (por id, nunca por correo escrito a mano);
   - consta el «sí» (el `run.sh` pide teclear el id y una frase de confirmación);
   - hay copia del día (si es producción).
2. **Recuento previo:** filas que nombran a cada persona, por tabla, sin datos.
3. **En la transacción:**
   - suspende por nombre solo los triggers de §1 que rechazan `delete`;
   - borra en orden de dependencias (hijas antes que padres; voids antes que sus
     asientos);
   - reactiva los triggers con `enable trigger`;
   - comprueba que no queda ninguna fila que nombre a las personas borradas;
   - cualquier fallo revierte todo, incluido el DDL.
4. **Auth:** borrar el usuario con la API de administración (en el ensayo, con la clave
   de `juntia-dev`; en producción, la dueña desde el panel).
5. **Recuento posterior** y `check-invariants.sql` sobre lo que queda.

## 4. Prueba

`tests/integration/account-deletion.test.ts` (PR A, job `db`, +3–8 s):

- siembra una pareja con el dataset dorado de P0-1 a P0-3 y una tercera persona sin
  pareja;
- borra a la tercera: no queda nada suyo; la pareja queda intacta, recuento a recuento;
- borra la pareja: no queda nada de las dos; la tercera, si se resiembra, sigue intacta;
- tras cada borrado, los triggers están activos (un `delete` directo sobre
  `audit_events` vuelve a fallar) y las invariantes pasan;
- un fallo a mitad (provocado) deja todo como estaba.

Si `db` se acerca a 600 s, la prueba pasa al tramo `lab-interaction` del job `release`
([ci.md](ci.md)).

## 5. Ensayo en `juntia-dev` (V15)

El gestor, con el guardia de destino y un solo agente en `juntia-dev`: sembrar una pareja
y una persona sola con `db:dev:reset`, ejecutar los dos casos, comprobar el recuento a
cero y que el usuario de Auth ya no existe, y `check-invariants.sql`. **Evidencia:** los
recuentos antes y después, por tabla, y la salida de las invariantes.

## 6. Lo que dice la interfaz

Mi cuenta → Privacidad dice hoy «La solicitud de eliminación todavía no está disponible en
la app. Nada se borra sin que lo confirmes.» (`src/lib/copy/es.ts`, `deleteDescription`).
**No explica cómo pedirla**, que FR-067 exige. El PR B añade una frase que lo explique
(a quién se pide y que la ejecuta el gestor tras confirmar), con su prueba de componentes;
el texto exacto lo aprueban los fundadores en la revisión del PR B. La checklist comprueba
el texto en producción.
