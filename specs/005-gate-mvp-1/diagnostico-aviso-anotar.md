# Diagnóstico: «rectángulos distintos del aviso» en axe con sesión — 005, F111-12

**Qué es.** El diagnóstico que pidió la revisión adversarial del PR #111 (ronda 2, F111-12) sobre los fallos intermitentes de
`tests/a11y/routes.a11y.ts` en `npm run e2e:dev`. **No corrige nada**: ni el producto ni el arnés, sin `skip` ni más
tolerancia. Termina con una propuesta para que los fundadores decidan si la autorizan, en un PR aparte. Es iteración
contra `juntia-dev`, no evidencia de CI.

## El fallo

- **Dónde:** el bloque de producto de `routes.a11y.ts` (l.312–319). Abre Anotar con su disparador visible
  (`annotateFrames`, l.67–86), guarda en cada cuadro (`requestAnimationFrame`) el rectángulo del diálogo o de la hoja y
  exige un único rectángulo en 10 cuadros (`new Set(notice.rects).size === 1`). No falla AxeBuilder, sino esta aserción
  geométrica.
- **Cuándo:** en `e2e:dev` completo, con 8 workers. En la ronda 1, `/ · Inicio con datos · dark · 390px`; con el código de
  `main` falló igual (esa vez en claro). En la ronda 2, `/actividad` (con datos y mes vacío), `/metas` y `/balance`, en
  claro a 390. Aisladas pasan a veces y fallan otras.
- **Lo que precede en la prueba:** justo antes, `knobFrames` (l.51–65) pulsa «Nosotros», registra la perilla durante 10
  cuadros y **vuelve a pulsar «Yo»** sin esperar a que el cambio de contexto termine. Después se abre Anotar.

## Reproducción

Arnés `tests/evidence/f111-12.capture.ts`. Corre con `F111_12=1 npm run e2e:dev -- tests/evidence/f111-12.capture.ts`.

- **Qué mide:** la misma medición de `annotateFrames`, 12 veces por ruta (`/`, `/actividad`, `/metas` y `/balance`), a 390,
  en claro y con movimiento reducido, con un usuario sembrado con movimientos del mes. Por cada serie registra la ruta, el
  cuadro en que aparece la hoja, los 10 rectángulos (`top/left/width/height`) y qué componente cambió. Guarda un trace por
  ruta.
- **Variables:**
  - `F111_12_CPU`: ralentización de CPU por CDP, para simular la carga de 8 workers.
  - `F111_12_KNOB=1`: antes de medir hace lo mismo que `knobFrames` («Nosotros» 10 cuadros y vuelta a «Yo»).
  - `F111_12_LABEL`: el nombre de la corrida.
- **Candidato:** la rama del PR #111. **`main`:** los mismos archivos de `src/` que `main` (`git checkout main -- src`),
  con el mismo arnés.

| Código | CPU | Paso de `knobFrames` | Series | Con más de un rectángulo | Por ruta (`/`, `/actividad`, `/metas`, `/balance`) |
| --- | ---: | --- | ---: | ---: | --- |
| candidato | 1× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| candidato | 6× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| `main` | 1× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| `main` | 6× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| candidato | 1× | sí | 48 | **28** | 11 · 6 · 1 · 10 |
| candidato | 6× | sí | 48 | **29** | 8 · 3 · 8 · 10 |
| `main` | 1× | sí | 48 | **26** | 10 · 5 · 2 · 9 |
| `main` | 6× | sí | 48 | **30** | 7 · 6 · 7 · 10 |

**En todas las series con más de un rectángulo, el cambio es el mismo:** `142.41/0.00/390.00/701.59` →
`142.00/0.00/390.00/702.00`. Solo cambian `top` y `height`, en **0,41 px**, a mitad de la serie, y una vez. Ejemplo,
`/balance`, candidato, CPU 6×, serie 2: cinco cuadros con 701,59 y cinco con 702,00. Sin el paso previo, la hoja se queda
en 701,59 los 10 cuadros.

## Clasificación

- **No lo causa el PR #111.** Se reproduce igual con `src/` de `main` (26 y 30 de 48) y con el candidato (28 y 29 de 48).
- **No es carga de CPU.** Sin el paso previo, 0 de 192 series con y sin ralentizar; con él, casi la mitad, también a 1×.
- **Lo dispara el propio orden del arnés.** La hoja se abre mientras el cambio de contexto que dejó `knobFrames` todavía se
  está aplicando. Cuando termina dentro de la ventana de 10 cuadros, la hoja se vuelve a pintar y se mueve 0,41 px.
- **Y hay un efecto real del producto, mínimo:** la hoja sí cambia de rectángulo, aunque menos de medio píxel y sin
  animación. No es un salto perceptible ni un movimiento con movimiento reducido. Pero existe: una aserción estricta lo ve.

**Hipótesis del mecanismo, no demostrada.** `BottomSheet` (`src/components/ui/bottom-sheet.tsx`, l.128–142, `holdKey`)
fija en un `useLayoutEffect` sin dependencias, en cada render, `minHeight = min(${offsetHeight}px, max)`. `offsetHeight`
redondea a entero: el alto natural es 701,59 y el mínimo queda en 702, así que la hoja anclada abajo sube su borde
0,41 px. Si no hay un render posterior dentro de la ventana, no se ve. El cambio de contexto provoca ese render. Coincide
con las cifras (701,59 → 702,00, entero), pero no se instrumentó el efecto: confirmarlo es parte de la propuesta.

**En resumen:** la causa es mixta. El arnés mide un estado de transición que crea él mismo, y el producto tiene un ajuste
subpíxel al volver a pintarse. No es un defecto de C-1 a C-7, ni una regresión.

## Propuesta para los fundadores (PR aparte, si la autorizan)

1. **Arnés (recomendado).** En `routes.a11y.ts`, después de `knobFrames`, esperar a que el cambio de vuelta a «Yo» termine
   antes de abrir Anotar (por ejemplo, con una aserción web-first sobre el contexto ya aplicado), sin tocar la tolerancia
   ni la aserción. Así se mide el estado estable que la prueba quiere vigilar. Es un cambio de pruebas, pero toca una
   prueba del gate: necesita autorización.
2. **Producto (opcional, a valorar).** En `BottomSheet`, medir el alto con un valor fraccionario
   (`getBoundingClientRect().height`) en vez de `offsetHeight`, o redondear igual en los dos lados, para que volver a
   pintarse no mueva la hoja. Antes, instrumentar el efecto para confirmar la hipótesis. Toca un componente de producto y
   está fuera de la excepción de la decisión 30.2: necesita autorización expresa.
3. **Mientras tanto,** el paso 4 (CI sobre el candidato) dirá si el fallo aparece en el runner. Si aparece, es este mismo
   caso: no lo introduce el PR #111.

## Lo que no se conserva en el repositorio

Los traces de Playwright (`test-results/f111-12/*.zip`) llevan las cookies de sesión de las cuentas sembradas. Se quedan
en local y no se suben. Los registros por serie (JSON) quedan en el log de cada corrida y se resumen en la tabla.
