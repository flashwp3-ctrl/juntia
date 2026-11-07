# Contrato de la aplicación — 003 · Server Actions, enlace y estado del cliente

Cómo habla la interfaz con `src/lib/db/` en P0-2. Sigue el patrón de la 002:
Server Components leen, Server Actions escriben, sin ORM, sin TanStack Query
(research R8.12 de la 002). Lo nuevo de P0-2 está aquí.

## 1. Resultado de una escritura

Toda Server Action de escritura devuelve uno de tres resultados, y la interfaz
**no puede** tratarlos igual (spec FR-059, precisión F47-4):

| Resultado | Cuándo | Qué hace la interfaz |
| --- | --- | --- |
| `ok` | La función respondió con éxito | E5, A4, aviso con «Deshacer», resaltado |
| `rejected` (con su error de dominio) | La función respondió con un `JTnnn` | Puede decir «no se guardó / no se movió / no se registró». Los campos siguen editables (salvo que el error diga lo contrario) |
| `unknown` | Error de red, tiempo agotado, respuesta perdida, 5xx sin `JTnnn` o reintentos de `40P01`/`40001` agotados | **Nunca** afirma que no se escribió. Conserva la clave, bloquea los campos, ofrece «Reintentar» (misma clave, misma carga) y «Comprobar estado». Cerrar pregunta «¿Cerrar sin confirmar?» |

«Comprobar estado» llama a `write_status(acción, clave)`
([contracts/database.md](database.md), «Estado de una escritura»; revisión del PR
#49, F49-4). Es una lectura protegida por (actor, acción, clave), que **no
reejecuta nada** y devuelve solo `completed` con el resultado autorizado o
`not_found`. Con `completed` la interfaz lleva al resultado real (E5, A4, el
saldo nuevo); con `not_found` dice que todavía no consta y que reintentar es
seguro. Reintentar con la misma clave es siempre seguro por la
idempotencia; si el primer intento sí llegó, el reintento devuelve el mismo
resultado.

## 2. Clave de idempotencia y token de invitación

- La clave nace en el **navegador** (`crypto.randomUUID()`) al abrir cada hoja o
  diálogo, y se reutiliza en cada reintento de esa apertura (002, FR-036).
- **Enlace de invitación recuperable (FR-012a; research R3).** Al pulsar «Crear
  invitación» o «Generar enlace nuevo», el navegador genera, junto con la clave,
  un **token de 32 bytes aleatorios** (`crypto.getRandomValues`, base64url). La
  Server Action recibe el token, calcula su SHA-256 en hex y llama a la función
  **solo con el hash**. El navegador conserva el par (clave, token) **solo en
  memoria**, mientras la hoja está abierta o con un resultado `unknown` pendiente,
  y lo descarta al confirmar o al cerrar. Un reintento con la misma clave envía el
  mismo token, recibe el mismo resultado guardado y vuelve a mostrar **el mismo
  enlace**, que sigue valiendo, porque es el token cuyo hash quedó en la base. El
  servidor y la base nunca guardan el token, y la Server Action no lo registra ni
  lo devuelve.
- **Sin reanudación tras recargar (decisión del gestor, PR B, hallazgos F55-5 y
  F55-6).** La primera versión guardaba el par en `sessionStorage`; la revisión
  mostró que podía reanudarse con otra cuenta en la misma pestaña o devolver como
  válido un enlace ya reemplazado. Al recargar, la intención se pierde y Mi pareja
  muestra el estado del servidor: si la escritura se confirmó, M4 ofrece «Generar
  enlace nuevo», que invalida el anterior. Perder un enlace es barato.
- **Límite de espera y vigencia.** Una escritura o un «Comprobar estado» que no
  responde en **15 s** pasa a `unknown` con la misma clave y la misma carga (FR-059,
  «tiempo agotado»), y una respuesta tardía se ignora. Un `ok` de crear o regenerar
  que llega después de un `unknown` se revalida contra `my_couple`: el enlace solo
  se muestra si su `invitation_id` sigue siendo la invitación pendiente; si no, la
  hoja avisa de que la invitación cambió (`copy.couple.invite.changed`).
- Formato del enlace: `https://<host>/invitacion#t=<token>`. El token va en el
  **fragmento**, que el navegador no envía en ninguna petición: no aparece en
  registros de Vercel, en `Referer` ni en el payload RSC (spec, caso límite «El
  token en la URL»).

## 3. Invitación sin sesión (M5) y retorno (research R5)

1. `/invitacion` es una ruta **pública** (no está en `PRODUCT` de
   `src/lib/routes.ts`) y su HTML no contiene ningún dato: lo decide el cliente.
2. El cliente lee `#t=…`, lo guarda en `localStorage["juntia:invitation"]` con
   `{token, savedAt}` y limpia el fragmento con `history.replaceState`.
3. Sin sesión, muestra M5 con «Entrar» (`/entrar?volver=/invitacion`) y «Crear
   cuenta» (`/crear-cuenta?volver=/invitacion`).
4. Con sesión, llama a `previewInvitation(tokenHash)`: M6 si la invitación vale
   para el correo de la sesión, M7 en cualquier otro caso.
5. **Retorno sin `volver`**: crear la cuenta y verificarla (otra pestaña u otro
   dispositivo) no conserva `volver` (research R5). Por eso, al montar la
   aplicación con sesión, si `localStorage["juntia:invitation"]` existe y tiene
   menos de 7 días, la app lleva a `/invitacion`. Si no existe, la persona abre
   otra vez el enlace (spec, caso límite «Verificación de correo desde otro
   dispositivo»).
6. La entrada se borra al aceptar, al ver M7, con «Ahora no», al cerrar sesión y
   **cuando su `savedAt` tiene 7 días o más**: se comprueba cada vez que se lee, y
   una entrada vencida se borra sin abrir `/invitacion` (revisión del PR #49,
   F49-7).

## 4. Contexto Yo/Nosotros en el servidor (FR-037 a FR-040)

- La cookie `juntia_context` (`me`/`us`) de la 002 sigue decidiendo qué rama
  construye el servidor. Con `us`, el servidor **comprueba además** `my_couple`
  con estado `active`; sin pareja activa pinta el estado «sin pareja», sin leer
  datos.
- Con `us`, ninguna lectura toca `my_transactions` ni `me_month_summary`; con `me`,
  ninguna toca `couple_expenses` ni `couple_month_summary` salvo `my_shared_parts`
  (la parte propia de lo compartido, visible para los dos de todos modos).
- **Cambio de contexto (S1)**: el selector escribe la cookie y pide la página con
  `router.refresh()`. Mientras llega el RSC del contexto nuevo, se ve el Skeleton
  de ese contexto, **nunca** cifras del anterior; la coreografía de
  MOTION_SYSTEM §1 arranca solo cuando el RSC nuevo ya está. Las cachés de
  cliente (aviso, resaltado, filas recientes) se guardan **por contexto** y no se
  reutilizan en el otro (FR-040).
- **Prefetch**: los `<Link>` de las rutas de producto llevan `prefetch={false}`
  en el selector y en la navegación cuando el destino depende del contexto, o el
  prefetch se invalida al cambiar la cookie. El caso de la spec E2E 3 lo
  comprueba (lección F44-1).

## 5. Lecturas paginadas (FR-042, FR-043; research R4)

- Las listas (`couple_expenses`, `couple_settlements`) se leen con `readByCursor`
  de la 002 (`src/lib/db/paginate.ts`), con su orden total y su garantía: ninguna
  fila dos veces y toda fila que existía de principio a fin, una vez.
- Los totales y el Balance **no** se suman en el servidor de la aplicación: salen
  de `couple_month_summary`, `me_month_summary` y `couple_balance`, cada uno una
  sola sentencia. La página puede mostrar una lista y un total leídos en momentos
  distintos; cada uno es coherente por sí mismo (FR-043).

## 6. Estado que sobrevive a la navegación (FR-060 a FR-062)

Se extiende el proveedor de Anotar de la 002 (el aviso y el resaltado viven por
encima de las rutas):

- Los avisos con «Deshacer» de gasto compartido, liquidación y Mover a Pareja
  viven en el proveedor, con un identificador por operación; una respuesta tardía
  solo actualiza su propio aviso.
- Si el registro nuevo no está en la pantalla, se navega a
  `/actividad?mes=<mes>` en el contexto del registro (F45-2).
- La hoja de Anotar guarda su propio contexto al abrirse; cambiar el selector con
  la hoja abierta no lo cambia (FR-062).
- Al volver a la pestaña (`visibilitychange` a `visible`) se hace
  `router.refresh()` para traer lo que anotó la otra persona (Q16).
