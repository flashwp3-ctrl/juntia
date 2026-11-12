# Correcciones B de la auditoría Impeccable — capturas

Antes y después de cada hallazgo del PR de correcciones B (Actividad, Cuenta, Balance, acceso, 404, Exportar y la fila
«Guardando…»), a 390 y 1440 y en claro y oscuro. Se tomaron contra **juntia-dev** con `npm run e2e:dev` y un spec
temporal que no se commitea (pareja dorada sembrada por `seedCouple({ golden: true })` + compartidos del mes en curso,
movimiento reducido). Son capturas de iteración, no evidencia de gate (ADR-011 §9.8).

- `before/`: `main` en `b21d4e3`. Las de oscuro · 390 de F01, F07, F08, F12 y F23 salieron de una segunda pasada sobre
  el mismo commit (en la primera, la descarga de D4 tardó más que la espera del spec).
- `after/`: esta rama.

Nombre: `Fnn-<pantalla>-<tema>-<ancho>.png`.

| Hallazgo | Captura | Qué mirar |
| --- | --- | --- |
| F01 | `F01-anotar-e4-*` | La fila en vuelo: sin opacidad; contorno punteado y reloj de arena con «Guardando…» |
| F07 | `F07-actividad-nosotros-*` | 1440: «Aporte a Japón» con «Sara · aporte» en PAGÓ · REPARTO y la fecha en FECHA |
| F08 | `F08-inicio-tomas-*` | 390: «Hola, Tomás», el avatar y el selector en una línea |
| F09 | `F09-entrar-*` | «Olvidé mi contraseña» y «Crear cuenta» en tinta subrayada, sin verde |
| F10 | `F10-perfil-caducada-*` | «Entrar de nuevo» como botón secundario `sm` dentro del aviso |
| F11 | `F11-exportar-*` | Encabezado con el título centrado y la «×»; sin «Cerrar» al pie |
| F12 | `F12-balance-*` | 1440: cada gasto del desglose en una línea (rejilla 6/12 – 6/12) |
| F16 | `F16-actividad-yo-*` | 390: las fichas del resumen en una fila con scroll horizontal |
| F17 | `F17-cuenta-*` | 1440: la fila de cuenta del sidebar con fondo y elevación, sin anillo |
| F21 | `F21-404-*` | Brújula en vez de advertencia; el sidebar conserva «Sara · Mi cuenta · con Tomás» |
| F23 | `F23-exportar-listo-*` | «Archivo listo. juntia-datos-AAAA-MM-DD.json» |

A 390 no hay sidebar, así que F17 solo cambia a 1440; F07 y F12 cambian solo en escritorio y F08 y F16, solo en móvil.
Las capturas del otro ancho se guardan igual para comprobar que no cambió nada más.
