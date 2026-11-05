# Errores: código → error de dominio → copy — 002

ADR-013, Consecuencias («hace falta una tabla de códigos de error y su
traducción a copy; la define la especificación de P0-1») y §6.3. La capa
`src/lib/db/errors.ts` traduce cada código a un **error de dominio** tipado, y la
interfaz lo muestra con su clave de `src/lib/copy/es.ts` (FR-060). **La copy no
se escribe aquí:** «copy en el PR, revisado en `es.ts`». Las claves son
propuestas del plan y la redacción final la aprueban los fundadores en cada PR.

Regla general: **el mensaje técnico nunca llega a la pantalla** (`docs/CONVENTIONS.md`
B.1). Un código desconocido cae en `unexpected`.

## Funciones de Juntia (`JTnnn`)

| Código | Error de dominio | Origen | Clave de copy | Dónde se ve |
| --- | --- | --- | --- | --- |
| `JT001` | `notAuthenticated` | Sin `sub` en los claims | `copy.errors.sessionExpired` | Hoja de Anotar, edición y Mi cuenta: «vuelve a entrar» sin perder lo escrito (edge case, PR B) |
| `JT002` | `invalidAmount` | Importe que no son dígitos | `copy.annotate.errors.amountInvalid` | E3. No debería llegar: el dominio lo valida antes |
| `JT003` | `amountOutOfRange` | ≤ 0, no múltiplo de 100 o > 99999999900 | `copy.annotate.errors.amountOutOfRange` | E3 |
| `JT004` | `invalidType` | Tipo fuera de `expense`/`income` | `copy.errors.unexpected` | Nunca en uso normal |
| `JT005` | `invalidCategory` | Categoría inexistente o de otro tipo | `copy.annotate.errors.category` | E3 |
| `JT006` | `invalidDate` | Fecha no válida | `copy.annotate.errors.date` | E2 |
| `JT007` | `descriptionTooLong` | > 140 caracteres | `copy.annotate.errors.descriptionTooLong` | E2 |
| `JT008` | `idempotencyKeyReused` | Misma clave, otra intención | `copy.errors.unexpected` | Indica un bug del cliente; se registra en consola de servidor sin datos |
| `JT009` | `invalidIdempotencyKey` | Clave que no es UUID | `copy.errors.unexpected` | Ídem |
| `JT010` | `transactionNotFound` | No existe o no es de quien llama (indistinguibles por RLS) | `copy.transaction.errors.notFound` | Detalle y edición |
| `JT011` | `versionConflict` | Otra edición llegó antes (Q15) | `copy.transaction.errors.versionConflict` | Edición: explica que cambió y ofrece recargar; nada se sobrescribe |
| `JT012` | `transactionVoided` | Ya eliminado (otra pestaña) | `copy.transaction.errors.alreadyDeleted` | Edición y diálogo de eliminar |
| `JT013` | `immutableField` | Trigger: cambio de tipo, autora, moneda… | `copy.errors.unexpected` | Nunca en uso normal (la interfaz no permite cambiar el tipo, Q14) |
| `JT014` | `invalidDisplayName` | Vacío, > 60 o con saltos | `copy.account.profile.errors.displayName` | P2 (validación) |
| `JT015` | `invalidTheme` | Fuera de los tres valores | `copy.errors.unexpected` | Nunca en uso normal |
| `JT017` | `invalidVoidReason` | Motivo fuera de `delete`/`undo` | `copy.errors.unexpected` | Nunca en uso normal |

`JT016` queda reservado (moneda distinta de COP): en P0-1 la moneda no es un
parámetro y la garantiza el `check` de la tabla.

## Postgres y PostgREST

| Código | Error de dominio | Tratamiento | Clave de copy |
| --- | --- | --- | --- |
| `40P01`, `40001` | `retryable` | La capa de servidor reintenta **la misma petición con la misma clave**, hasta 3 intentos con espera corta creciente (ADR-013 §3.4); si se agotan, `retryExhausted` | `copy.errors.saveFailed` («No pudimos guardar… Reintentar», 02·5) |
| `23514`, `23503`, `23505` | `constraintViolation` | Una restricción de la tabla rechazó algo que la función debía haber rechazado antes: se trata como bug | `copy.errors.unexpected` |
| `42501` | `forbidden` | Privilegio o RLS. En uso normal no ocurre | `copy.errors.unexpected` |
| `PGRST301`, HTTP 401 | `notAuthenticated` | JWT caducado o no válido | `copy.errors.sessionExpired` |
| Otros `PGRST*`, HTTP 5xx | `unexpected` | | `copy.errors.unexpected` |
| Error de red o tiempo agotado | `network` | No se reintenta en silencio una lectura; una escritura se ofrece reintentar con la misma clave | `copy.errors.network` (04·6 «error de red» con Reintentar) |

## Supabase Auth (GoTrue)

**Sin enumeración en pantalla** (FR-023 y decisión 16.16): varias respuestas
distintas de la API se traducen al **mismo** resultado de interfaz.

| Respuesta de Auth | Pantalla | Clave de copy |
| --- | --- | --- |
| `signUp` → 200, 403 del hook (correo no permitido), 422 `user_already_exists`, 429 `over_email_send_rate_limit` | **Siempre A3** «Verifica tu correo», con el mismo texto | `copy.auth.verifyEmail.*` |
| `resend` (A3) → 200 o 429 | El mismo aviso uniforme, que ya incluye «inténtalo más tarde» | `copy.auth.verifyEmail.resent` |
| `signInWithPassword` → `invalid_credentials` | A1b «Correo o contraseña incorrectos.» (texto de la spec, US-1.4) | `copy.auth.signIn.invalidCredentials` |
| `signInWithPassword` → `email_not_confirmed` | A1c, con «Reenviar enlace» | `copy.auth.signIn.notVerified` |
| Error de red en cualquier pantalla de acceso | A1d | `copy.auth.networkError` |
| `resetPasswordForEmail` → 200, 429 o cualquier correo | **Siempre A4b** «enlace enviado» (US-1.5) | `copy.auth.recover.sent` |
| `verifyOtp` → `otp_expired` o enlace usado | A4 con aviso de enlace caducado, sin datos de la cuenta (edge case) | `copy.auth.recover.linkExpired` |
| `verifyOtp` (signup) → 200 | A1 con aviso corto de verificado (edge case) | `copy.auth.signIn.verified` |
| `updateUser` → `weak_password` | A5 validación | `copy.auth.newPassword.weak` |
| `updateUser` → `same_password` | A5 validación | `copy.auth.newPassword.same` |
| `signUp` → `weak_password` | A2 validación (solo depende de lo escrito, no del correo) | `copy.auth.signUp.weakPassword` |
| `signOut` falla | S2 | `copy.account.security.signOutFailed` |

El código de Auth y su `msg` en inglés nunca se muestran. La traducción vive en
`src/lib/db/auth-errors.ts` (o `src/features/auth/`), con pruebas de componente
de que las respuestas uniformes producen exactamente la misma salida.
