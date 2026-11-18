# Borrado manual de cuenta (005 · FR-067; D2, opción a)

Procedimiento del contrato [`specs/005-gate-mvp-1/contracts/account-deletion.md`](../../specs/005-gate-mvp-1/contracts/account-deletion.md).
**En P0-4 solo se ensaya en `juntia-dev`** (V15, T053): la línea de órdenes no admite otro destino.

| Archivo | Qué hace |
| --- | --- |
| `run.mjs` | Orquesta las fases `planned → locked → data_deleted → auth_deleted → verified` (y `aborted`), con el estado en disco tras cada paso |
| `scope.sql` | Alcance del borrado, su cierre (§3) y el recuento por tabla; solo tablas temporales |
| `closure.sql` | Comprobación previa, de solo lectura, antes de la fase 0 |
| `delete-account.sql` | Fase 1, en una transacción (`psql -1`) |

```powershell
node scripts/account-deletion/run.mjs C:\ruta\fuera\del\repo\deletion-<id>.json
```

```powershell
node scripts/account-deletion/run.mjs --resume C:\ruta\fuera\del\repo\deletion-<id>.json
```

```powershell
node scripts/account-deletion/run.mjs --abort C:\ruta\fuera\del\repo\deletion-<id>.json
```

Pasa el guardia de destino y toma el bloqueo de `juntia-dev` (decisión 18). El estado queda en
`deletion-<id>.state.json`, junto al manifiesto.

## Manifiesto (`deletion-<id>.json`, fuera del repositorio)

```json
{
  "request_id": "uuid aleatorio",
  "target": "juntia-dev",
  "users": ["uuid persona 1", "uuid persona 2"],
  "group_id": "uuid de la pareja (null con una persona)",
  "access_token_lifetime_s": 3600,
  "backup": null,
  "approvals": [{ "user_id": "…", "approved_at": "ISO 8601", "channel": "…", "text_sha256": "64 hex" }],
  "exports": [{ "user_id": "…", "exported_at": "ISO 8601", "file_sha256": "64 hex", "size_bytes": 1234 }],
  "confirmations": [{
    "user_id": "…", "channel": "su propio canal", "message_ref": "hilo y hora", "received_at": "ISO 8601",
    "message_sha256": "64 hex", "request_id": "el mismo", "approval_sha256": "la huella de SU aprobación",
    "scope": { "kind": "couple | self", "users": ["8 hex de sha256(uuid)", "…"] }
  }]
}
```

- `access_token_lifetime_s`: la vida de los tokens de acceso, copiada del panel de Auth.
- Con dos personas: aprobaciones de las dos, con huellas distintas; confirmaciones por canales distintos.
- Sin un campo, o con uno incoherente, el script se detiene **antes de escribir nada** (ni estado ni bloqueo).

## Precisiones de implementación

- **Cierre de sesiones (§4.1):** la API de administración de Auth solo cierra sesiones con el JWT de la propia persona,
  así que `run.mjs` borra sus filas de `auth.sessions` y `auth.refresh_tokens` como dueño. Un token de acceso ya emitido
  se cubre con la espera de su vida útil, que el estado registra.
- **Recuento de referencia:** el que se compara al renovar un bloqueo caducado antes de la fase 1 lo calcula la
  comprobación previa y se guarda en el estado (`counts_at_plan`); el gestor no lo copia a mano.
- **`allocations_check_sum` no se suspende** (T042, N1): con el gasto borrado en la misma transacción, la comprobación
  diferida no encuentra el movimiento y no rechaza el borrado. Lo demuestra el caso 1 de
  `tests/integration/account-deletion.test.ts`.
- **Auditoría de terceros (F87-1):** nunca se borra la auditoría de un actor externo al alcance. Si un actor de fuera dejó
  auditoría sobre una entidad del alcance, el cierre se detiene antes de la fase 0 y nombra la fila; la fase 1 solo borra
  la auditoría de los actores del alcance.
- **Manifiesto fijo (F87-2):** el estado guarda la SHA-256 del manifiesto completo, en forma canónica y sin campos
  excluidos. `--resume` y `--abort` lo rechazan si cambió, antes de tocar Auth o la base. Justo antes de la fase 1 se
  repiten la pertenencia, el cierre y los recuentos del plan.
- **Caída tras el COMMIT (F87-5):** el estado marca «fase 1 en curso» antes del SQL. Al reanudar, si el alcance ya está
  vacío, la transacción se confirmó: no se repite y se conservan los recuentos del plan, con la recuperación registrada.
- **`blocked_external_link` (F87-11):** si el cierre se detiene por la auditoría de un actor externo, el gestor registra el
  bloqueo con la fila implicada (identificador, sin datos) y lo comunica a los fundadores. La decisión sobre ese registro
  (conservar, anonimizar o suprimir) vuelve a ellos; el script no decide nada solo y la regla de F87-1 no cambia.
- **`--abort` tras empezar a borrar (F87-8):** con `phase1_started` en el estado, `--abort` se rechaza siempre: la única salida
  es `--resume`.
- **Recuperación por identificadores (F87-10):** el plan guarda los identificadores del alcance por tabla (la huella del
  correo en `signup_allowlist`). Con la fase 1 interrumpida: ninguno de los planeados existe → recuperado; queda alguno → se
  repite la fase 1, que exige los identificadores del plan; aparece alguno no planeado → `indeterminate`, se detiene y lo
  concilia el gestor. Detalle en el contrato, §4.2.
- **Bloqueos de la fase 1 (gate del PR #87):** la transacción toma todas sus tablas en `ACCESS EXCLUSIVE`, en un orden fijo y
  con `lock_timeout` (5 s por defecto), antes de leer nada. O los consigue todos, o revierte sin cambiar nada con el error
  `lock: …`: el estado sigue en `locked` y `--resume` reintenta. Mientras dura, la app no puede leer ni escribir en esas
  tablas (segundos): conviene hacerlo con poco uso.
- **Categorías propias:** el esquema no tiene categorías por persona (`categories` es el catálogo común).
- **Salida para la evidencia:** `request_id`, huellas cortas de los UUID, fechas de aprobaciones y exportaciones,
  secuencia de fases y recuentos por tabla. Nunca correos, nombres, importes ni textos.
