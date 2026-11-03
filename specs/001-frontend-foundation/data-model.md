# Data Model — 001 · Frontend Foundation

La 001 **no tiene entidades de dominio ni datos en servidor** (spec, «Key
Entities»; FR-003, FR-048). Lo que sigue es **estado de interfaz** y datos
estáticos tipados. Ningún tipo de aquí es de dinero, de contexto de datos ni de
persona: esos son de P0-1 (maestro §15.10, «Dataset dorado»).

Identificadores en inglés (`docs/CONVENTIONS.md` A.1). Ninguno es un término de
negocio nuevo, así que ninguno entra en `docs/GLOSSARY.md` (FR-036).

## ContextChoice — contexto seleccionado

Preferencia de interfaz del selector Yo/Nosotros (FR-025 a FR-027).

| Campo | Tipo | Regla |
| --- | --- | --- |
| valor | `"me" \| "us"` | `"me"` se muestra «Yo»; `"us"`, «Nosotros» (strings del catálogo) |

- **Por defecto:** `"me"` (supuesto «Contexto por defecto: Yo»).
- **Persistencia:** `localStorage["juntia:context"]`, en el mismo dispositivo.
  Lectura y escritura dentro de `try/catch`. Un valor ilegible o ausente se trata
  como `"me"` y no se reescribe hasta que la persona elige.
- **Antes de pintar:** el script de tema copia un valor válido a
  `<html data-context>` (research R2, R5).
- **No es** `scope` ni usa sus literales propuestos (`docs/GLOSSARY.md` §10). No
  autoriza nada ni filtra datos.

Transiciones: `me ⇄ us` por clic, toque o flechas. Varios cambios seguidos dejan
el último valor elegido, que es el que se guarda.

## EffectiveTheme — tema efectivo

| Campo | Tipo | Regla |
| --- | --- | --- |
| valor | `"light" \| "dark"` | Derivado de `prefers-color-scheme` en cada carga y en cada cambio del sistema |

- Vive solo en `<html data-theme>`. **No se guarda** (FR-005).
- Sin JavaScript no existe el atributo y decide el CSS de respaldo (research R2).
- La superficie interna anida `data-theme` en dos contenedores para mostrar los
  dos temas; eso no cambia el tema efectivo del documento.

## NavDestination — destino de navegación

Datos estáticos, un único arreglo tipado consumido por la barra, el rail y el
sidebar (FR-019, FR-021).

| Campo | Tipo | Ejemplo |
| --- | --- | --- |
| `id` | `"home" \| "activity" \| "goals" \| "plan" \| "balance"` | `"balance"` |
| `href` | ruta | `"/balance"` |
| `icon` | nombre de `AppIcon` | `"scales"` |
| `label` | clave del catálogo de copy | `copy.nav.balance` |
| `desktopOnly` | `boolean` | `true` solo para Balance |

| `id` | `href` | `icon` | Barra móvil | Rail y sidebar |
| --- | --- | --- | --- | --- |
| `home` | `/` | `house-simple` | Sí | Sí |
| `activity` | `/actividad` | `receipt` | Sí | Sí |
| `goals` | `/metas` | `flag-banner` | Sí | Sí |
| `plan` | `/plan` | `chart-pie-slice` | Sí | Sí |
| `balance` | `/balance` | `scales` | **No** | Sí |

Mi cuenta (`/cuenta`, icono `user-circle`) y Anotar (`plus`) **no** son destinos
de este arreglo: tienen su propio lugar en cada composición (FR-020, FR-023).

Regla de destino actual: coincidencia exacta para `/`; por prefijo para las demás.

## AnnotateNoticeState — aviso de Anotar

| Campo | Tipo | Regla |
| --- | --- | --- |
| `open` | `boolean` | Un solo aviso a la vez: `N` con el aviso abierto no abre otro |
| `returnFocusTo` | elemento | El disparador que lo abrió (botón o, con `N`, el elemento enfocado antes) |
| contenedor | `"sheet" \| "dialog"` | Derivado de `min-width: 768px`; puede cambiar con el aviso abierto sin cerrarlo |

## AmountValue — valor de AmountInput

| Campo | Tipo | Regla |
| --- | --- | --- |
| entrada | cadena de dígitos, 0–9 caracteres | Al escribir o pegar se descartan los no dígitos; si no queda ninguno, el valor no cambia |
| valor entregado | `number \| null` | **Pesos enteros**; `null` si está vacío. `0` es un valor distinto de vacío. Máximo 999.999.999 |

No es `Money`: la conversión a unidades menores y la moneda son de `domain/money`
en P0-1 (FR-014, maestro §5.2). El primitivo no decide si `0` es válido.

## InternalSurfaceGate — disponibilidad de la superficie interna

Dos funciones puras en `src/lib/internal-surface.ts`, que no importa
`server-only` (research R4). La página las llama en cada petición y responde
`notFound()` si cualquiera de las dos dice `false`.

`isInternalSurfaceEnabled(env)` — destino de despliegue:

| Entrada | Resultado |
| --- | --- |
| `VERCEL_ENV === "production"` | `false`, siempre |
| `VERCEL_ENV` `"preview"` o `"development"` | `true` |
| `NODE_ENV === "development"` | `true` |
| `JUNTIA_INTERNAL_SURFACE === "1"` | `true` |
| cualquier otro caso | `false` |

`isAllowedInternalHost(host, env)` — host de la petición:

| Entrada | Resultado |
| --- | --- |
| `VERCEL_ENV !== "preview"` | `true` (la primera función ya decidió) |
| Host vacío o ausente | `false` |
| Host = `VERCEL_PROJECT_PRODUCTION_URL` | `false` |
| Host = `VERCEL_URL` o `VERCEL_BRANCH_URL` | `true` |
| Cualquier otro host (un alias) | `false` |

El host se compara en minúsculas, sin puerto ni punto final.

## CopyCatalog — catálogo de copy

`src/lib/copy/es.ts` (`docs/CONVENTIONS.md` B.2): objeto anidado `as const`.
Textos con parámetros como funciones tipadas, de modo que una clave inexistente o
un parámetro faltante sean errores de tipo (FR-035).

Secciones que la 001 necesita, sin fijar aquí la redacción (se revisa en el PR):

| Sección | Contenido |
| --- | --- |
| `shell` | «Ir al contenido», nombre de la navegación, aviso de versión base |
| `nav` | Inicio, Actividad, Metas, Plan, Balance, Mi cuenta, Anotar, pista del atajo `N` |
| `context` | «Yo», «Nosotros», nombre del grupo, anuncio «Ahora ves: {contexto}» |
| `annotate` | Título y cuerpo del aviso, «Cerrar» |
| `empty` | Estado vacío de Inicio, Actividad, Metas y Plan |
| `balance` | «Todavía no disponible» y su explicación |
| `account` | Mensaje de `/cuenta`, «Volver» |
| `states` | No encontrado, error, salida hacia Inicio |
| `primitives` | Textos de los primitivos: carga del botón, ayuda y errores de AmountInput, «Cargando…», textos de Badge |
| `internal` | Encabezado y nota de valores de prueba de la superficie interna |

El catálogo no contiene «P0-1» ni otras fases, ni fechas (FR-034), ni palabras de
`docs/GLOSSARY.md` §9.
