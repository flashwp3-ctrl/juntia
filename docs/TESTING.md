# TESTING.md — Cómo se prueba Juntia

Documento operativo. La decisión y su justificación están en
[`docs/adr/ADR-011`](adr/ADR-011-estrategia-de-pruebas-y-ci.md), que está en estado
**Propuesto**: hasta que los fundadores lo aprueben, este documento describe el
plan acordado, no una práctica vigente.

> **Nada de lo que hay aquí se ha ejecutado todavía.** No existe scaffold de
> aplicación (maestro §15.1), no hay `package.json` y no hay suite. Los comandos
> describen lo que la primera especificación de ingeniería de P0 debe crear.
>
> Los presupuestos de tiempo son **objetivos razonados y todavía no medidos**.
> **En cuanto exista CI pasan a ser contractuales** y superar el presupuesto del
> humo falla el build (§9). La transición ocurre con el primer pipeline en verde
> de la especificación 001: antes de eso son objetivos, después son el contrato.

---

## 1. El principio, en una frase

**Un test E2E solo existe si falla por algo que ninguna capa inferior puede
detectar.** Si pasaría igual con la base de datos mockeada, no es un E2E: es un
test de UI mal ubicado.

Y el corolario, que importa más: **los tests derivan de los criterios de
aceptación, nunca de lo que hace la implementación.** Un test escrito mirando el
código afirma el bug además de la función.

---

## 2. Comandos

| Comando | Qué hace | Presupuesto |
| --- | --- | --- |
| `npm run verify` | lint + typecheck + unit de dominio + tests SQL/RLS. **El comando por defecto.** | **< 90 s** |
| `npm run test:unit` | Vitest, proyecto `domain`, suite completa | **< 15 s** |
| `npm run test:unit -- --changed` | Solo lo afectado por los cambios. Para el bucle local | — |
| `npm run test:components` | Vitest, proyecto `components` (RTL selectivo, §10.1) | incluido en `verify` |
| `npm run test:db` | `supabase test db` contra Supabase local | **< 60 s** |
| `npm run test:e2e:smoke` | Playwright, 3 specs, solo Chromium | **< 3 min** |
| `npm run test:e2e` | Playwright, suite completa, Chromium + WebKit | nivel 2 |
| `npm run test:a11y` | axe en 5 rutas × 2 temas | nivel 2 |

Si vas a ejecutar una sola cosa antes de abrir un PR, ejecuta `verify`.

---

## 3. Qué corre dónde

### Nivel 1 — cada push a un PR

Cuatro jobs **en paralelo**:

1. lint + typecheck + build
2. Vitest: dominio completo **y componentes (RTL selectivo)**
3. Supabase local en contenedor, migraciones aplicadas, tests SQL de RLS
4. E2E de humo: **specs 1, 2 y 3, solo Chromium**

**Gate de PR completo: < 6 min, medido como job. Superar el presupuesto del humo
falla el build.**

### Nivel 2 — al mergear a `main` y de noche

1. E2E completo: **las cinco specs**, Chromium + WebKit
2. axe en 5 rutas × 2 temas
3. Snapshots visuales de **las 5 rutas** — no de cada componente
4. Rendimiento contra los umbrales del maestro §15.7

### Fuera de CI — el gate visual humano

El maestro §10.1 marca **«Visual y motion»** como bloqueante para cada flujo
insignia, y **sigue siéndolo**. Se cumple con **capturas adjuntas al PR, revisadas
por los dos fundadores** (§10.3, §10.4). No se automatiza: automatizar un criterio
subjetivo produce falsos positivos que la gente aprende a ignorar, y un gate que se
ignora es peor que ninguno.

Las partes objetivas de esa fila sí están en CI: axe, `prefers-reduced-motion`,
snapshots de ruta y los umbrales de §15.7.

Esto **no releva de nada más**. Ninguna verificación de seguridad, autorización o
atomicidad se pospone al lanzamiento (maestro §15.6, advertencia de jerarquía).

---

## 4. Dónde va cada test

La tabla completa, criterio por criterio, está en el ADR-011 §2. El resumen
utilizable:

| Si lo que pruebas es… | Va en | Dura |
| --- | --- | --- |
| Aritmética de dinero, agregados, saldos, DEC-G04, clasificación de movimientos | **Vitest, dominio puro** | ms |
| Quién puede leer o escribir qué | **SQL / RLS sobre Supabase local** | s |
| Atomicidad, idempotencia, concurrencia, auditoría | **Integración de servidor, sin navegador** | s |
| El recorrido completo de una persona por rutas reales con sesión real | **E2E** | min |
| Que una ruta no tiene violaciones de accesibilidad | **E2E barato por ruta** (visitar + axe) | s por ruta |

Dos preguntas que resuelven casi todos los casos dudosos:

1. **¿Pasaría igual con la base de datos mockeada?** Si sí, no es un E2E.
2. **¿El ataque usa el botón?** Si no, es un test de RLS, no de UI. Un test que
   comprueba que el botón está escondido no comprueba que la escritura está
   prohibida.

### Tope de specs E2E

**4 a 6 para TODO P0.** No por slice: en total. Y ya están nombradas:

| # | Spec | ¿Corre en PR? |
| --- | --- | --- |
| 1 | Acceso y Mi cuenta | **Sí** |
| 2 | Anotar gasto, cronometrado (US-12) | **Sí** |
| 3 | Pareja 50/50 y liquidación | **Sí** |
| 4 | Meta con aportes y uso | Nocturno |
| 5 | Presupuesto activado/desactivado | Nocturno |

Las cuatro familias de smoke de §10.1 más US-12 y Mi cuenta caben en esas cinco.
Queda **una sexta plaza libre** dentro del tope.

**Cada especificación de slice declara cuántas añade, con un máximo de 2.** Si
crees necesitar más, **detente y plantéalo**. No las añadas y lo menciones después.

### Y la capa de componentes

La fila «Componentes · RTL selectivo» de §10.1 sigue vigente y corre como proyecto
aparte dentro del job de Vitest. **No tiene presupuesto de tiempo propio: cabe
dentro de los < 90 s de `verify`.** Las dos palabras del maestro son el límite:
*selectivo* y *en flujos críticos*. Si esa capa empieza a necesitar su propio
presupuesto, el problema no es el presupuesto: es que hay un test por componente.

---

## 5. Las siete reglas duras

1. **Sembrar estado por base de datos o API, nunca por la interfaz.** Un helper
   tipo `seedCouple()` inserta directo y devuelve el `storageState`. Ningún test
   crea su pareja haciendo clic en el formulario de invitación.
   **Cada worker siembra su propia pareja aislada.** De ahí sale la respuesta al
   paralelismo: `workers: 1` es el scaffold por defecto de Playwright, no un
   mandato, y lo que de verdad rompe al paralelizar no es el navegador sino que dos
   workers se pisen los datos. Eso se arregla en la siembra, no bajando los
   workers. Con parejas aisladas, varios workers son seguros; cuántos caben lo mide
   la 001.
2. **Autenticar una vez** y reutilizar `storageState`. La documentación de
   Playwright recomienda hacerlo con un **proyecto `setup` y `dependencies`**, no
   con `globalSetup` («This is the recommended approach, as it integrates better
   with the Playwright test runner»). `playwright/.auth` va en `.gitignore`.
3. **`reducedMotion: 'reduce'` por defecto** en el contexto de Playwright. Es más
   rápido, es mucho menos frágil frente a los springs y las View Transitions, y
   ejercita de continuo un criterio de aceptación. **Un** test corre con motion
   activo, para los dos momentos L2.
4. **Cero `waitForTimeout`.** Solo aserciones web-first (`await expect(...)`), que
   reintentan solas. Se impone con una **regla de ESLint**, no con buena voluntad.
5. **Retries 0 en local, 1 en CI.** Un test que necesita el segundo intento **dos
   veces** se saca a cuarentena y se arregla (§8).
6. **Un solo navegador en los PRs.** WebKit solo en el nocturno.
7. **Nada de colores hex crudos** fuera de `styles/tokens.css`. Regla de lint.

---

## 6. Cómo se escribe un test desde un criterio de aceptación

El orden importa y no es negociable: **primero el criterio, después el test,
después el código.** Si abres el archivo de la función para saber qué comprobar,
ya perdiste: vas a escribir un test que afirma el bug.

### Ejemplo trabajado: DEC-G04

**Paso 1 — localizar el criterio, literal.**
`docs/design/HANDOFF_CLAUDE_CODE.md`, «Criterios de aceptación (solo P0)»:

> DEC-G04: `total_destinado_neto` reproduce cada fila de la tabla anterior y nunca
> se rotula «Total gastado» ni ocupa el número héroe.

**Paso 2 — localizar la fórmula aprobada.** Maestro §15.4:

```
total_destinado_neto = gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta
```

**Paso 3 — darse cuenta de que la tabla ya es el test.** La tabla de DEC-G04 del
handoff tiene siete filas con entradas y salida esperada. Eso es un
`test.each`, no siete tests escritos a mano:

| Caso · vista | consumo | aportes | retiros | financiado | **esperado** |
| --- | ---: | ---: | ---: | ---: | ---: |
| Octubre · Nosotros | 2.840.000 | 900.000 | 0 | 0 | **3.740.000** |
| Octubre · Yo, Sara | 1.912.900 | 500.000 | 0 | 0 | **2.412.900** |
| Octubre · Yo, Tomás | No disponible | 400.000 | 0 | 0 | **No disponible** |
| Retiro · Yo, Sara libera 200.000 | 0 | 0 | 200.000 | 0 | **−200.000** |
| Tiquetes Japón · Nosotros | 3.000.000 | 0 | 0 | 3.000.000 | **0** |
| Tiquetes · Yo, Sara | 1.500.000 | 0 | 0 | 1.620.000 | **−120.000** |
| Tiquetes · Yo, Tomás | 1.500.000 | 0 | 0 | 1.380.000 | **+120.000** |

**Paso 4 — escribirlo.** `test.each` con las siete filas, en el proyecto `domain`,
sin tocar React, Supabase ni la red. Importes en unidades menores (ADR-002); la
tabla está en pesos por legibilidad del diseño.

Tres cosas que la tabla obliga a modelar y que un test escrito desde el código no
habría descubierto:

- **La fila «No disponible» no es cero.** Es ausencia de dato (el fixture no define
  los privados de Tomás, y en la app Sara nunca los vería). La función tiene que
  distinguir «no disponible» de `0`, igual que DEC-R01 distingue `null` de cero en
  los presupuestos. Un test que convierta eso en `0` está mal.
- **El resultado puede ser negativo y eso es correcto.** −200.000 y −120.000 son
  valores válidos. No hay `Math.max(0, …)` en ninguna parte.
- **Las vistas no se suman.** Sara −120.000 + Tomás +120.000 = Nosotros 0 es una
  propiedad que merece su propia aserción, derivada de la nota del handoff.

**Paso 5 — lo que NO se automatiza.** «Nunca se rotula “Total gastado” ni ocupa el
número héroe» es jerarquía visual. Va a la **revisión humana del PR**, no a un
selector. Un test que busca la cadena «Total gastado» se satisface con un sinónimo
igual de malo.

### El mismo procedimiento, en seco

1. Copia el criterio literal del handoff o del maestro al principio del test, como
   comentario, con la referencia (`§15.4`, «Criterios de aceptación»).
2. Localiza la decisión aprobada que lo respalda (DEC, ADR o §15).
3. Pregúntate en qué capa vive (§4 de este documento).
4. Si hay una tabla, es `test.each`. Si hay un dataset, es el fixture dorado.
5. Escribe el test. **Míralo fallar.** En RLS, la documentación de Supabase
   recomienda explícitamente romper la política a propósito («Break each policy and
   watch the suite fail») para comprobar que el test realmente detecta algo.
6. Después escribe el código.

### El fixture de octubre es un activo, no una maqueta

Los datos de `docs/design/COMPONENT_SPECIFICATIONS.md` tienen totales verificados a
mano: consumo 2.840.000, aportes 900.000, saldo Sara +429.900 / Tomás −429.900,
arriendo 55/45. Son **el dataset dorado de la suite**, no decoración de las
pantallas. Los fixtures tipados que §15.1 asigna a F0-b sirven a las dos cosas.

Si un cálculo no reproduce esos números **exactos**, el cálculo está mal. No el
fixture.

---

## 7. Quién responde de qué

Tres responsables, tres cosas distintas. Confundirlas es cómo una suite verde deja
pasar un bug.

### El agente que implementa — **hechos**

Lo que se puede comprobar y pegar. En el PR:

- Que `verify` pasa, **con la salida real pegada**. No «todo en verde».
- Que los números del fixture de octubre salen **exactos**.
- **Cuántos tests añadió y cuáles**, por nombre.
- Cuántas specs E2E añadió (recuerda: máximo 2 por especificación) y por qué cada
  una no podía vivir en una capa inferior.
- Los tiempos medidos de cada suite contra su presupuesto.

`AGENTS.md` 12 y 18: no se afirma «verificado» sin haber ejecutado, y no se
inventan salidas, capturas ni URLs. Un `[V]` no se marca resuelto por haber escrito
el test; se marca resuelto pegando su salida.

### CI — **lo que el agente no puede**

- Instalación limpia desde cero.
- Migraciones aplicadas desde cero sobre una base vacía.
- Que no rompió otro slice.
- Los presupuestos de tiempo en una máquina que no es la de nadie.

### La revisión humana — **juicio**

Nada de esto lo puede decidir una máquina:

- **¿El test afirma la especificación o la implementación?** Si se escribió mirando
  el código, es un test que confirma lo que hay, no lo que debe haber.
- **¿Se marcó un `[V]` como resuelto sin ejecutarlo?**
- **¿Hay dependencias fuera del stack congelado** de §7.1 que el slice no
  necesitaba?
- **¿Algo privado se filtra al contexto Nosotros?** En totales, en búsquedas, en
  exportaciones.
- **¿`total_destinado_neto` está mal rotulado** o ocupa el número héroe?
- **¿El número de tests es proporcional al riesgo**, o hay un test por componente?
- Y el gate visual de §10.1: capturas a 390 y 1440, en los dos temas.

---

## 8. Cuarentena de flakes

Un test que necesita el segundo intento **dos veces** está roto, aunque pase.

1. **Marcarlo.** `test.fixme()` o `test.skip()` con un comentario que diga la fecha
   y el síntoma. No se borra.
2. **Abrir el issue en el mismo PR** que lo pone en cuarentena, con el trace de
   Playwright adjunto.
3. **No se queda ahí.** Un test en cuarentena es deuda visible: se arregla o se
   elimina razonadamente en el siguiente slice. Si se elimina, el PR dice qué
   criterio de aceptación queda sin cubrir y dónde se cubre ahora.
4. **Causas típicas, en orden de frecuencia:** una espera fija que la regla 4
   prohíbe; estado sembrado por la interfaz en vez de por la base, contra la regla
   1; animación no cubierta por `reducedMotion`; dos tests que comparten datos
   porque no se aisló la siembra.
5. **Si tres tests entran en cuarentena en un mismo mes**, el problema no son los
   tests: es la infraestructura de siembra o el diseño de la suite. Se para y se
   revisa, no se sigue poniendo tiritas.

Y lo que **no** es cuarentena: subir `retries`. Retries es 0 en local y 1 en CI, y
no se toca.

---

## 9. Los presupuestos son un contrato

| Suite | Presupuesto |
| --- | --- |
| `verify` | **< 90 s** |
| Unit de dominio, suite completa | **< 15 s** |
| Tests SQL / RLS | **< 60 s** |
| E2E de humo en PR | **< 3 min** |
| **Gate de PR completo** | **< 6 min** |
| Nocturno / post-merge | **< 15 min** |

Hoy son **objetivos razonados y todavía no medidos**, porque no hay suite.
**En cuanto exista CI son contractuales, y superar el presupuesto del humo falla el
build.** No hay un periodo de gracia después de eso.

**Cada presupuesto mide el job completo**, no solo los tests: checkout, `npm ci`,
instalación del navegador, arranque del servidor y ejecución. Es la lectura
honesta, porque es la que espera quien está mirando el PR.

Dos consecuencias prácticas:

- **Instala solo Chromium** en el humo: `npx playwright install --with-deps
  chromium`. Nunca los tres navegadores.
- **No cachees los binarios del navegador.** Eso **no es un olvido nuestro: es lo
  que dice la documentación oficial de Playwright** — «Caching browser binaries is
  not recommended, since the amount of time it takes to restore the cache is
  comparable to the time it takes to download the binaries». Si alguien añade un
  `actions/cache` para «arreglarlo», está reintroduciendo un coste, no quitándolo.

Y la regla de fondo: si una herramienta impide cumplir un presupuesto, **se dice**.
No se ajusta el presupuesto a la herramienta en silencio.

---

## 10. Referencias

- [`docs/adr/ADR-011`](adr/ADR-011-estrategia-de-pruebas-y-ci.md) — la decisión, su
  justificación, la tabla completa de ubicación por criterio, la documentación
  oficial consultada con versiones, y las dos preguntas que siguen abiertas a
  propósito y deciden los fundadores: **el mecanismo de los tests de RLS** (con
  recomendación de pgTAP en SQL plano) y **la herramienta para la regla de hex
  crudos**. Todo lo demás está cerrado.
- `docs/JUNTIA_MASTER.md` §7.1, §7.2, §10.1, §10.2, §10.3, §10.4, §15.4, §15.6.3,
  §15.7
- `docs/design/HANDOFF_CLAUDE_CODE.md` — criterios de aceptación de P0, tabla de
  DEC-G04, reglas de negocio de la UI, rendimiento
- `docs/design/COMPONENT_SPECIFICATIONS.md` — el fixture de octubre
- `AGENTS.md` 12, 16, 18
