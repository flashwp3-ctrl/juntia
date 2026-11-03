# Contrato de rutas — 001

Qué responde cada URL, en qué composición y en qué destino de despliegue. Las
rutas de producto llevan el AppShell y el aviso de versión base (FR-028).

| URL | Pantalla | Estado en la 001 | Selector Yo/Nosotros | Fuente |
| --- | --- | --- | --- | --- |
| `/` | Inicio | Estado vacío diseñado | Sí | FR-030, decisión 9 |
| `/actividad` | Actividad | Estado vacío diseñado | Sí | FR-030 |
| `/metas` | Metas | Estado vacío diseñado, sin «Crear meta» | Sí | FR-030 |
| `/plan` | Plan | Estado vacío diseñado; no sugiere que el presupuesto sea obligatorio | Sí | FR-030, DEC-R01 |
| `/balance` | Balance | «Todavía no disponible»: el balance aparece cuando exista la pareja | Sí | FR-032, decisión 4 |
| `/cuenta` | Mi cuenta | La cuenta llega con el inicio de sesión. Móvil: pantalla apilada sin barra, con «Volver». Escritorio: dentro del shell, Mi cuenta como actual | Móvil no; desde 1280, en el sidebar | FR-033, decisión 8 |
| `/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad`, `/cuenta/seguridad` | — | No existen: estado de «no encontrado» del shell, HTTP 404 | — | Caso límite de la spec |
| Cualquier otra | — | Estado de «no encontrado» del shell, HTTP 404, con salida hacia Inicio | — | Maestro §6.3 |
| `/interno/primitivos` | Superficie interna | Ver tabla siguiente | No (fuera del shell) | FR-049 a FR-053 |

Error de render en una ruta de producto: estado de error dentro del shell, sin
mensaje técnico crudo (`docs/CONVENTIONS.md` B.1).

## Disponibilidad de `/interno/primitivos` por destino

Mecanismo en research R4.

| Destino | Señal | HTTP | Contenido |
| --- | --- | --- | --- |
| Desarrollo local (`next dev`) | `NODE_ENV=development` | 200 | Superficie identificada como interna |
| Local con build de producción (capturas del PR) | `JUNTIA_INTERNAL_SURFACE=1` al compilar | 200 | Ídem |
| CI, job 5 | `JUNTIA_INTERNAL_SURFACE=1` al compilar | 200 | Ídem; axe en los dos temas; el job falla si no encuentra el encabezado (FR-052) |
| Preview de Vercel | `VERCEL_ENV=preview` | 200 | Ídem |
| Producción de Vercel | `VERCEL_ENV=production` | **404** | Estado de «no encontrado» del shell |
| Build sin ninguna señal | — | **404** | Ídem (cerrado por defecto) |

Siempre: sin enlaces desde la navegación, `robots: noindex, nofollow`, la página
importa `server-only`.
