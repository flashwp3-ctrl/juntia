# Research — 001 · Frontend Foundation

**Fase 0 del plan.** Este documento resuelve las incógnitas técnicas del plan y
registra la ejecución de los tres `[V]` que **deciden cómo se construye**
(ADR-012 §2). Cada decisión cita la fuente que la obliga; lo que no tiene fuente
superior es una **decisión del plan** —local, reversible y no significativa—, y
se marca así para que el revisor pueda objetarla.

**Dónde se ejecutó.** El 3 de noviembre de 2026, en Windows 11 con Git Bash,
Node v24.22.1 y npm 11.1.0, en un proyecto desechable **fuera del repositorio**:

```
C:\Users\aleja\AppData\Local\Temp\claude\…\scratchpad\v-stack       (stack elegido)
C:\Users\aleja\AppData\Local\Temp\claude\…\scratchpad\v-eslint10    (alternativa ESLint 10)
```

Ningún archivo de ese proyecto entra al repositorio: el scaffold es trabajo de
la implementación. Las salidas de abajo son las reales, recortadas solo donde
se indica con `…`.

**Qué reproduce el ensayo de la 001.** Un root layout con el script de tema en
`<head>`, `tokens.css` con los dos temas y el respaldo sin JavaScript, Tailwind
v4 mapeado a variables, `next/font` con las tres familias, un selector Yo/Nosotros
con perilla de Motion, un aviso de Anotar con Radix Dialog, dos iconos de
Phosphor (`HouseSimple`, `Scales`), la ruta interna con su compuerta, un
`not-found`, Vitest con los dos proyectos, Playwright con axe y la configuración
de ESLint con las reglas propias. Más dos rutas de control que no existirán en la
001: `/control` (tema aplicado en un `useEffect`, para demostrar que el detector
de destello funciona) y `/sin-suppress` (el script sin `suppressHydrationWarning`).

---

## R1 · `[V]` Versiones estables y compatibles del stack (maestro §7.1)

**Fuente.** Maestro §7.1: «Verificar compatibilidad exacta de la versión estable
de Next, React, Motion y estrategia PWA durante bootstrap; registrar versiones
fijadas y lockfile». La estrategia PWA no aplica: la 001 no tiene manifiesto
(FR-002, FR-048).

### Decisión: versiones fijadas

Exactas (sin `^` ni `~`) en `package.json`, con `package-lock.json` versionado y
`packageManager: "npm@11.1.0"` (el caché de `actions/setup-node` lo necesita,
ADR-011 §Referencias).

| Paquete | Versión | Publicada | Para qué la usa la 001 |
| --- | --- | --- | --- |
| `next` | **16.4.4** | 2026-11-02 | App Router, `next/font`, build (FR-001) |
| `react`, `react-dom` | **19.3.1** | 2026-10-14 | — |
| `typescript` | **6.0.3** | 2026-04-16 | `strict` (§7.1). **No 7.x**: ver abajo |
| `motion` | **14.9.0** | 2026-10-30 | Perilla del Segmented, aparición de hoja y diálogo (FR-015, FR-031a) |
| `@phosphor-icons/react` | **2.1.10** | 2025-05-22 | `AppIcon` (FR-008, §15.2). MIT |
| `@radix-ui/react-dialog` | **1.3.1** | 2026-10-12 | Base accesible de BottomSheet/Modal del aviso de Anotar (FR-031a). MIT |
| `server-only` | **0.0.1** | — | Impide importar la página interna desde cliente (R4) |
| `tailwindcss`, `@tailwindcss/postcss` | **4.3.4** | 2026-11-02 | Utilidades mapeadas a tokens (§7.1, handoff paso 1) |
| `eslint` | **9.39.5** | — | Lint. **Ver la advertencia de R1.3** |
| `eslint-config-next` | **16.4.4** | 2026-11-02 | Igual a `next`, no 16.4.5 (que salió solo el 3 de noviembre, sin `next` 16.4.5) |
| `@eslint/css` | **1.4.0** | 2026-07-01 | Regla de hex crudos en CSS (R3) |
| `vitest` | **5.1.0** | 2026-11-02 | Proyectos `domain` y `components` (ADR-011) |
| `vite` | **8.3.5** | — | Peer de Vitest 5 |
| `jsdom` | **30.1.3** | — | Entorno del proyecto `components` |
| `@testing-library/react` | **16.3.3** | — | RTL selectivo (§10.1) |
| `@testing-library/dom` | **10.4.2** | — | Peer de RTL |
| `@testing-library/user-event` | **14.6.8** | — | Teclado y clic reales en RTL |
| `@playwright/test` | **1.64.1** | 2026-10-14 | Job 5, solo Chromium |
| `@axe-core/playwright` | **4.14.0** | 2026-10-15 | Job 5 |
| `@types/node` | **24.19.2** | — | Node 24 |
| `@types/react`, `@types/react-dom` | **19.3.0** | — | — |

Motor: **Node 24 LTS** (`engines.node: ">=24 <25"`); Next 16.4.4 exige
`>=20.9.0`.

### R1.1 · Compatibilidad comprobada: instalación, build, lint, tipos y pruebas

```
$ npm install --no-audit --no-fund
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 472 packages in 50s
EXIT=0

$ npx next --version
Next.js v16.4.4
$ npm run build
▲ Next.js 16.4.4 (Turbopack)
✓ Compiled successfully in 683ms
  Running TypeScript ...
  Finished TypeScript in 2.6s ...
✓ Generating static pages using 6 workers (5/5) in 661ms
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /control
├ ○ /interno/primitivos
└ ○ /sin-suppress
EXIT=0

$ npx tsc --version && npx tsc --noEmit
Version 6.0.3
EXIT=0

$ npx vitest --version
vitest/5.1.0 win32-x64 node-v24.22.1
$ npx vitest run --project components
 Test Files  2 passed (2)
      Tests  8 passed (8)
EXIT=0

$ npx playwright --version
Version 1.64.1
```

La prueba de componentes del ensayo renderiza a la vez Motion, Radix Dialog y
Phosphor con RTL y `user-event`: el selector cambia y se anuncia, y el aviso se
cierra con Escape y devuelve el foco al disparador.

### R1.2 · Incompatibilidades encontradas, no supuestas

**TypeScript 7.0.2 (`latest`) no sirve.** `typescript-eslint`, del que depende
`eslint-config-next`, declara `typescript: ">=4.8.4 <6.1.0"`:

```
$ npm view typescript-eslint peerDependencies --json
{ "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" }
$ npm install --dry-run   (con typescript 7.0.2)
npm warn ERESOLVE overriding peer dependency   (×8)
```

Se fija **6.0.3**, la última de la línea 6.0.

**RTL sin limpieza automática.** Con Vitest sin `globals: true`, RTL no registra
su `cleanup` y el segundo test ve el DOM del primero:

```
$ npx vitest run --project components
 ❯ src/components/demo.test.tsx:18:28
     18|     const trigger = screen.getByRole("button", { name: "Anotar" });
 … getMultipleElementsFoundError …
      Tests  1 failed | 7 passed (8)
```

Se resuelve con un `setupFiles` que hace `afterEach(() => cleanup())`; con eso,
8 de 8 (salida de R1.1). **No hace falta `@vitejs/plugin-react`**: Vitest 5
transforma TSX con `"jsx": "react-jsx"` del `tsconfig`.

**Aviso de Vite.** Con `vitest.config.ts` en un paquete sin `"type": "module"`:
`(!) Your Vite config uses features that are unsupported by configLoader: 'native'
… ESM syntax in a file loaded as CommonJS`. Decisión del plan: el archivo se llama
`vitest.config.mts`.

**Motion avisa en desarrollo con movimiento reducido.** En `next dev`, con la
emulación `reducedMotion: 'reduce'` que exige ADR-011 regla 3, Motion escribe
`warning: You have Reduced Motion enabled on your device…`. No aparece en el
build de producción, que es contra lo que corre el job 5 (R2.3). No es un error
de la app; se registra para que nadie lo confunda con uno.

### R1.3 · ESLint: 9 está sin soporte y 10 no está declarado por los plugins

Es la única elección del stack sin una opción limpia, y se dice:

- **ESLint 9.39.5** instala sin conflictos de peers, pero npm lo marca
  `This version is no longer supported`.
- **ESLint 10.14.0** funciona, pero tres plugins que trae `eslint-config-next`
  no lo declaran: `eslint-plugin-react` (`^9.7`), `eslint-plugin-import` (`^9`)
  y `eslint-plugin-jsx-a11y` (`^9`). npm lo instala sobreescribiendo peers.

Se ejecutó la misma configuración con los dos, contra un archivo con fallos de
cada plugin (hook condicional, `key` ausente, `<img>` sin `alt`, `<a>` interno) y
los de las reglas propias. **La salida es idéntica:**

```
=== v-stack:     $ npx eslint tests/lint-fixtures   → v9.39.5   ✖ 12 problems (10 errors, 2 warnings)
=== v-eslint10:  $ npx eslint tests/lint-fixtures   → v10.14.0  ✖ 12 problems (10 errors, 2 warnings)
  3:32  error    React Hook "useState" is called conditionally. …
  5:29  error    Missing "key" prop for element in iterator
  5:43  warning  Using `<img>` could result in slower LCP …
  5:43  warning  img elements must have an alt prop, …
  5:63  error    Do not use an `<a>` element to navigate to `/`. Use `<Link />` …
  (+ las 7 de R3)
$ npm install   (v-eslint10)
      3 npm warn ERESOLVE overriding peer dependency
```

**Decisión del plan: ESLint 9.39.5**, porque es la versión que el árbol de
`eslint-config-next` 16.4.4 declara compatible y la que exige la palabra
«compatibles» del `[V]`. Es una herramienta de desarrollo, sin código en el
navegador. La subida a 10 es un PR propio cuando los tres plugins la declaren.
**Confirmado por el gestor** el 3 de noviembre de 2026: se queda 9.39.5, y la
subida a 10 va en un PR propio cuando los tres plugins la declaren.

### R1.4 · Lo que la 001 **no** instala

| Del stack de §7.1 | Por qué no en la 001 |
| --- | --- |
| React Hook Form + Zod | No hay formularios que se envíen (FR-031: el aviso no tiene campos) |
| TanStack Query | No hay datos (FR-048) |
| Supabase, Auth, Storage | FR-048; P0-1 |
| PWA (manifiesto, service worker) | FR-002, FR-048 |
| CLI de shadcn/ui y sus dependencias (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) | shadcn/ui es un patrón de código copiado sobre Radix, no una dependencia. Los primitivos de la 001 se escriben con ese patrón sobre Radix; el CLI traería `lucide-react`, que §15.2 descarta |
| Vaul | El aviso no se arrastra (FR-031a). Handoff paso 3: «Vaul o Radix Dialog + Motion»; se elige Radix Dialog |
| `@radix-ui/react-radio-group` y `react-tabs` | El Segmented necesita `radiogroup` **o** `tablist` según el uso (FR-015). Dos paquetes para un control de dos roles pesa más que el teclado con flechas escrito a mano, que se prueba con RTL |
| `@testing-library/jest-dom` | Las aserciones de Vitest y las consultas por rol bastan |
| `@vitejs/plugin-react` | No hace falta (R1.2) |
| `eslint-plugin-playwright`, Stylelint | La regla propia con `no-restricted-syntax` cubre las dos reglas sin dependencias nuevas (R3) |
| `next-themes` | El script propio cabe en una línea y no necesita proveedor de React (R2) |
| Librería de i18n | `docs/CONVENTIONS.md` B.3 |

---

## R2 · `[V]` Script de tema bloqueante con App Router, sin destello ni error de hidratación

**Fuente.** `DESIGN_SYSTEM.md`, convención: «Script inline bloqueante en `<head>`
para evitar el destello del tema incorrecto. [V: validar con Next App Router]».
Maestro §15.10, «Tema»; FR-005; SC-006; caso límite «Script de tema sin
almacenamiento ni JavaScript tardío».

### Decisión

1. **Un `<script>` inline sin `async` ni `defer` dentro de `<head>` en el root
   layout**, con `dangerouslySetInnerHTML`. No se usa `next/script`.
2. **`<html suppressHydrationWarning>`**, porque el script cambia un atributo de
   `<html>` antes de hidratar.
3. El script hace tres cosas, todas antes de que exista `<body>`:
   - pone `data-theme="light" | "dark"` según `prefers-color-scheme`;
   - escucha el cambio de la preferencia y actualiza el atributo (US-5, escenario 2);
   - lee el contexto recordado (`juntia:context`) dentro de `try/catch` y, si es
     válido, pone `data-context` (R5).
4. **Respaldo sin JavaScript** en `tokens.css`:
   `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }`, con
   los mismos valores que `[data-theme="dark"]`. Una prueba unitaria comprueba que
   los dos bloques tienen exactamente las mismas propiedades y valores (R7), para
   que la duplicación no se desincronice.
5. `color-scheme` va en cada bloque de tema, para que los controles nativos y las
   barras de desplazamiento sigan al tema.
6. **No hay `<meta name="theme-color">`**: necesitaría hex en TypeScript, fuera
   de `tokens.css` (regla 7), y la 001 no la pide.

### Cómo se midió

- **HTML servido.** `curl` contra `next start`: el script está dentro de `<head>`,
  sin `async`, antes de `</head>` y de `<body>`; es bloqueante para el parser por
  definición.
- **Atributo antes de `<body>`.** Un `MutationObserver` instalado con
  `page.addInitScript` registra `data-theme` en el instante en que el parser crea
  `<body>`. Si ya está, nada del cuerpo pudo pintarse con el tema contrario.
- **Primer cuadro pintado.** Con la CPU a 6× (`Emulation.setCPUThrottlingRate`) y
  red de 400 kbit/s con 400 ms de latencia, `Page.startScreencast` captura cada
  cuadro en PNG. Se toma el primero posterior a `first-paint` y se lee el píxel de
  la esquina inferior izquierda, que es el lienzo: `#121416` = `[18,20,22]`
  (oscuro), `#F7F3EB` = `[247,243,235]` (claro).
- **Control negativo.** `/control` aplica el tema en un `useEffect`. Con el
  sistema en oscuro **debe** pintar primero claro: si el detector no lo viera, la
  prueba no probaría nada (`docs/TESTING.md` §6, «Míralo fallar»).
- **Hidratación.** Errores y avisos de consola en `next dev` (donde React informa
  de los desajustes) y en producción.

### R2.1 · Salida: HTML servido (`next start`)

```
$ curl -s http://localhost:3100/ | sed 's/></>\n</g' | grep -n -E '^<(head|/head|body|script|link rel="stylesheet")'
3:<head>
10:<link rel="stylesheet" href="/_next/static/chunks/40t7b4p2qnudb.css" data-precedence="next"/>
12:<script src="/_next/static/chunks/31zl3_kzhtcbg.js" async="">
…
24:<script>(function(){var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");function a(){d.setAttribute("data-theme",m.matches?"dark":"light")}a();if(m.addEventListener){m.addEventListener("change",a)}try{var c=window.localStorage.getItem("juntia:context");if(c==="me"||c==="us"){d.setAttribute("data-context",c)}}catch(e){}})();</script>
25:<script src="/_next/static/chunks/0cz1d0mv5g_q7.js" noModule="">
27:</head>
28:<body class="bg-canvas text-ink font-sans">
```

### R2.2 · Salida: primer pintado, sin JavaScript, cambio en vivo y contexto (`next start`)

```
$ npx playwright test --project theme  (contra next start, build de producción)
Running 12 tests using 2 workers
/ dark: {"themeAtBody":"dark","contextAtBody":null,"firstFrame":[18,20,22],"framesAfterPaint":5,"firstPaintMs":1632,"consoleProblems":[]}
  ok  2 [theme] › …theme-script.theme.ts:95:9 › esquema dark › script bloqueante · / (7.6s)
/control dark: {"themeAtBody":"light","contextAtBody":null,"firstFrame":[247,243,235],"framesAfterPaint":5,"firstPaintMs":1572,"consoleProblems":[]}
  ok  6 [theme] › …theme-script.theme.ts:103:9 › esquema dark › control negativo, tema en useEffect · /control (6.0s)
/ light: {"themeAtBody":"light","contextAtBody":null,"firstFrame":[247,243,235],"framesAfterPaint":5,"firstPaintMs":1588,"consoleProblems":[]}
  ok  7 [theme] › …theme-script.theme.ts:95:9 › esquema light › script bloqueante · / (7.1s)
/control light: {"themeAtBody":"light","contextAtBody":null,"firstFrame":[247,243,235],"framesAfterPaint":5,"firstPaintMs":1576,"consoleProblems":[]}
  ok  8 [theme] › …theme-script.theme.ts:103:9 › esquema light › control negativo, tema en useEffect · /control (6.0s)
sin JS, oscuro: {"attr":null,"bg":"rgb(18, 20, 22)"}
  ok  9 [theme] › …theme-script.theme.ts:115:7 › sin JavaScript › el CSS de respaldo sigue al sistema (126ms)
  ok 10 [theme] › …theme-script.theme.ts:129:7 › cambio del sistema con la app abierta › el atributo sigue a prefers-color-scheme (271ms)
contexto: {"themeAtBody":"dark","contextAtBody":"us"}
  ok 11 [theme] › …theme-script.theme.ts:141:7 › contexto recordado › se aplica antes de <body> (7.1s)
almacenamiento bloqueado: {"themeAtBody":"dark","contextAtBody":null,"consoleProblems":[]}
  ok 12 [theme] › …theme-script.theme.ts:147:7 › contexto recordado › almacenamiento bloqueado: arranca sin contexto y sin errores (7.0s)
  12 passed (42.6s)
EXIT=0
```

Lectura: con el sistema en oscuro, el primer cuadro de `/` ya es `#121416` y el
atributo estaba puesto antes de crear `<body>`. El control, con el mismo esquema,
pinta primero `#F7F3EB`: **el detector ve el destello cuando existe**. Sin
JavaScript, el respaldo CSS pinta oscuro. El cambio de preferencia con la app
abierta se refleja en el atributo. Con `localStorage` lanzando `SecurityError`, el
tema se aplica igual y no hay errores.

### R2.3 · Salida: hidratación

```
$ RM=no BASE_URL=http://localhost:3101 npx playwright test hydration --project=theme --workers=1  (next dev, movimiento sin reducir)
/ dark: 0 problemas []
/sin-suppress dark: 1 problemas ["error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:\n\n- A server/client bran"]
/ light: 0 problemas []
/sin-suppress light: 1 problemas ["error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. …"]
  4 passed (2.4s)

$ BASE_URL=http://localhost:3101 npx playwright test hydration --project=theme --workers=1  (next dev, reducedMotion: 'reduce')
/ dark: 1 problemas ["warning: You have Reduced Motion enabled on your device. Animations may not appear as expected.. …motion.dev/troubleshooting/reduced-motion-disabled"]
/sin-suppress dark: 1 problemas ["error: A tree hydrated but some attributes of the server rendered HTML didn't match …"]
…

$ npx playwright test --project theme  (next start)   → hidratación
/ dark: 0 problemas []
/sin-suppress dark: 0 problemas []
/ light: 0 problemas []
/sin-suppress light: 0 problemas []
```

Lectura: **sin `suppressHydrationWarning` React informa del desajuste de
atributos en `<html>`; con él, cero errores**, en desarrollo y en producción. El
aviso «Encountered a script tag while rendering React component» que React 19
emite para scripts renderizados por componentes cliente **no aparece**: el
script vive en un componente de servidor. El único mensaje con la ruta buena es el
aviso de Motion de R1.2, propio de `next dev` con la emulación de movimiento
reducido.

**Resultado del `[V]`: verificado** en Next.js 16.4.4 y React 19.3.1. Queda para
la implementación, porque **comprueba lo construido** y no decide nada: CLS = 0
en la carga de cada ruta real (SC-006), medido en el PR.

---

## R3 · `[V]` Herramienta y configuración de la regla de hex crudos y esperas fijas

**Fuente.** ADR-011 §6, reglas 4 y 7; `[V]` 5 y pregunta abierta 2 («Lo resuelve
la especificación 001 al crear el scaffold»). FR-006, FR-044; US-7, escenario 3.

### Decisión: ESLint con `no-restricted-syntax`, sin plugins nuevos

Una sola herramienta para TypeScript, TSX y CSS. `@eslint/css` es el lenguaje
CSS oficial de ESLint; el resto es una regla del núcleo.

```js
// eslint.config.mjs (extracto del ensayo)
const HEX = "#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])";
// TS/TSX: literales y plantillas (incluye clases arbitrarias de Tailwind: bg-[#123456])
{ files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"], rules: { "no-restricted-syntax": ["error",
  { selector: `Literal[value=/${HEX}/]`, message: HEX_MSG },
  { selector: `TemplateElement[value.raw=/${HEX}/]`, message: HEX_MSG } ] } },
// Pruebas de navegador: además, esperas fijas
{ files: ["tests/**/*.ts"], rules: { "no-restricted-syntax": ["error", /* las dos de hex */,
  { selector: "CallExpression[callee.property.name='waitForTimeout']", message: "…" },
  { selector: "CallExpression[callee.name='setTimeout']", message: "…" } ] } },
// CSS, salvo tokens.css: Hash = valores parseados; Raw = valores de --propiedades, que CSSTree no parsea
{ files: ["**/*.css"], ignores: ["src/styles/tokens.css"], plugins: { css }, language: "css/css",
  languageOptions: { tolerant: true }, rules: { "no-restricted-syntax": ["error",
  { selector: "Hash", message: HEX_MSG }, { selector: `Raw[value=/${HEX}/]`, message: HEX_MSG } ] } },
```

### Salida

Primero solo con `Hash` en CSS: **no detectaba** el hex dentro de `@theme inline
{ --color-bad: #2d4b3d; }`, porque CSSTree deja sin parsear los valores de las
propiedades personalizadas. Se añadió el selector `Raw` y se repitió:

```
$ npx eslint tests/lint-fixtures/hex.css src/styles/tokens.css src/app/globals.css
…\src\styles\tokens.css
  0:0  warning  File ignored because no matching configuration was supplied
…\tests\lint-fixtures\hex.css
  4:15  error  Color hex crudo: usa un token de src/styles/tokens.css (ADR-011 §6, regla 7)  no-restricted-syntax
  8:10  error  Color hex crudo: usa un token de src/styles/tokens.css (ADR-011 §6, regla 7)  no-restricted-syntax
✖ 3 problems (2 errors, 1 warning)
EXIT=1

$ npx eslint tests/lint-fixtures
…\tests\lint-fixtures\hex.tsx
  2:16  error  Color hex crudo: … (const tone = `color: #1a1c1a`)
  4:26  error  Color hex crudo: … (style={{ color: "#FF0000" }})
  4:49  error  Color hex crudo: … (className="bg-[#123456]")
…\tests\lint-fixtures\wait.a11y.ts
  5:9   error  Espera fija prohibida: usa una aserción web-first (ADR-011 §6, regla 4)  no-restricted-syntax
  6:28  error  Espera fija prohibida en pruebas de navegador (ADR-011 §6, regla 4)      no-restricted-syntax
EXIT=1

$ npx eslint . --ignore-pattern "tests/lint-fixtures/**"
…\postcss.config.mjs
  1:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export
✖ 1 problem (0 errors, 1 warning)
EXIT=0
```

Lo que **no** marca, a propósito, y se comprobó en los mismos archivos:
`href="#contenido"` en TSX y el selector `#contenido` en CSS (un id no es un
color: `o` y `n` no son hexadecimales). `tokens.css` queda exento por
configuración, no por comentario.

Límite conocido, aceptado: un ancla cuyo id sea solo hexadecimal de 3, 4, 6 u 8
letras (`#add`, `#bead`) se marcaría. Se evita no usando esos ids.

**Resultado del `[V]`: verificado.** Las dos reglas fallan cuando deben y pasan en
código limpio. Las regresiones de las reglas se prueban en la implementación con
fixtures de lint (R7).

---

## R4 · Mecanismo de la superficie interna por destino de despliegue (FR-049, FR-053)

**Fuente.** FR-049 («el plan solo elige el mecanismo» y propone el nombre),
FR-053, supuesto «Destinos de despliegue»; maestro §7.1 (Vercel Hobby).

### ¿Se distinguen un preview y producción en Vercel? Sí

Documentación oficial de Vercel, consultada el 3 de noviembre de 2026:

- *System environment variables*: `VERCEL_ENV`, «Available at: Both build and
  runtime. The environment that the app is deployed and running on. The value can
  be either production, preview, or development». `VERCEL=1` es «an indicator to
  show that system environment variables have been exposed», y la exposición se
  controla con la casilla «Enable access to System Environment Variables».
- *Promoting deployments*: promover un preview a producción es «a complete
  rebuild», y «You cannot use your preview environment variables in a production
  deployment». Instant Rollback reasigna dominios a un despliegue **que ya sirvió
  producción**, y promover un *staged production build* tampoco reconstruye, pero
  ese build ya es de producción.

Conclusión: **todo lo que sirve el dominio de producción se compiló con
`VERCEL_ENV=production`.** El supuesto de la spec se cumple; no hay que detenerse.

### Decisión: compuerta cerrada por defecto

```ts
// src/lib/internal-surface.ts
export function isInternalSurfaceEnabled(env: Env): boolean {
  if (env.VERCEL_ENV === "production") return false;                       // nunca, ni con la bandera
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") return true;
  if (env.NODE_ENV === "development") return true;                         // `next dev`: nunca es un despliegue
  return env.JUNTIA_INTERNAL_SURFACE === "1";                              // CI y capturas locales, explícito
}
```

| Destino (FR-049) | Qué la habilita | Resultado |
| --- | --- | --- |
| Desarrollo local | `next dev` (`NODE_ENV=development`) | Disponible |
| CI (job 5) | `JUNTIA_INTERNAL_SURFACE=1` en el job | Disponible y auditada |
| Preview de Vercel | `VERCEL_ENV=preview` | Disponible e identificada |
| Producción de Vercel | `VERCEL_ENV=production` | `notFound()` → 404 |
| Cualquier build sin señal (incluido Vercel con las variables de sistema desactivadas) | nada | 404: **falla cerrada** |

**Por qué cerrada por defecto.** La primera versión del ensayo abría todo lo que
no tuviera `VERCEL=1`. La documentación muestra que `VERCEL` depende de una
casilla del proyecto: con ella desactivada, producción no tendría ninguna de las
dos variables y la superficie quedaría expuesta. La versión final exige una señal
positiva. `NODE_ENV` no decide la exclusión —eso prohíbe la Precisión F11-1—; solo
reconoce el servidor de desarrollo como uno de los destinos que abren.

**Nombre de la ruta: `/interno/primitivos`.** Coherente con las rutas de producto
en español que fija el maestro §15.3 (`/cuenta/*`); «interno» identifica la
superficie en la propia URL; «primitivos» es el término del handoff, paso 2. La
página lleva `robots: { index: false, follow: false }` e importa `server-only`.

### Salida

```
$ npx vitest run --project components src/lib/internal-surface.test.ts
 ✓ … isInternalSurfaceEnabled > next dev local
 ✓ … isInternalSurfaceEnabled > next start local sin bandera
 ✓ … isInternalSurfaceEnabled > next start con bandera (CI, capturas)
 ✓ … isInternalSurfaceEnabled > preview de Vercel
 ✓ … isInternalSurfaceEnabled > producción de Vercel
 ✓ … isInternalSurfaceEnabled > producción con la bandera puesta por error
 ✓ … isInternalSurfaceEnabled > Vercel sin variables de sistema expuestas
      Tests  7 passed (7)

$ build+start con VERCEL=1 VERCEL_ENV=production; curl /interno/primitivos → 404
$ build+start con VERCEL=1 VERCEL_ENV=preview; curl /interno/primitivos → 200
$ build+start con JUNTIA_INTERNAL_SURFACE=1; curl /interno/primitivos → 200
$ build+start con (ninguna); curl /interno/primitivos → 404
```

En los cuatro builds, `/` respondió 200. La ruta se prerenderiza en el build
(`○ /interno/primitivos`): la variable tiene que estar **al compilar**. Si el job
5 la olvidara, la ruta daría 404 y la comprobación de FR-052 fallaría en voz alta,
no en silencio.

**Lo que esto no prueba.** No existe todavía un proyecto de Vercel para la 001 y
no se creó ninguno: crear o enlazar el proyecto no está en el alcance de la spec.
Lo ejecutado reproduce las variables que Vercel documenta. La comprobación sobre
un preview real queda para cuando exista el proyecto; si el PR de implementación
lo crea, la incluye.

---

## R5 · Recuerdo del contexto Yo/Nosotros sin parpadeo

**Fuente.** FR-026, SC-007, decisión 10; casos límite «Valor del contexto
recordado ilegible o ausente» y «Cambios rápidos del selector».

**Decisión del plan.**

- Almacenamiento: `localStorage`, clave `juntia:context`, valores `"me" | "us"`.
  Es una preferencia de interfaz y **no** reutiliza `scope` ni sus literales
  propuestos (FR-036, `docs/GLOSSARY.md` §10).
- El script de R2 copia el valor a `data-context` en `<html>` antes de `<body>`
  (R2.2: `contextAtBody: "us"`). La posición inicial de la perilla y el estado
  visual salen de ese atributo por CSS, así que la primera pintura ya es la
  correcta y la perilla **no se desliza al cargar**: solo responde a un cambio de
  la persona.
- React lee el valor con `useSyncExternalStore`, con `"me"` como instantánea de
  servidor; escribe dentro de `try/catch`. Sin almacenamiento, el selector cambia
  durante la visita y no recuerda (R2.2, «almacenamiento bloqueado»).

**Alternativa descartada:** cookie leída en el servidor. Haría dinámica cada
ruta, enviaría la preferencia al servidor sin necesidad y contradice el supuesto
«se recuerda en el almacenamiento del navegador».

---

## R6 · Estructura, rutas y piezas de la 001

**Fuente.** Maestro §7.2; handoff, orden de implementación pasos 1, 2 y 4;
`docs/CONVENTIONS.md` A.1 y B.2.

- **Rutas.** `/` (Inicio), `/actividad`, `/metas`, `/plan`, `/balance`, `/cuenta`
  y `/interno/primitivos`. El maestro solo nombra `/cuenta/*`; las demás siguen ese
  precedente de URL en español. **Decisión del plan, señalada para revisión**:
  `docs/CONVENTIONS.md` A.1 pide carpetas en inglés, pero también dice que «donde
  el maestro … ya den un identificador, manda ese identificador», y el maestro dio
  URLs en español. Mezclar `/activity` con `/cuenta` sería peor que cualquiera de
  las dos opciones.
- **Shell.** Un único root layout (`src/app/layout.tsx`) con fuentes, script y
  tokens. Un grupo `(app)` con el AppShell para las rutas de producto. La
  superficie interna vive en un grupo `(internal)` **fuera** del AppShell: no es
  producto, no lleva navegación ni aviso de versión base, y presenta los dos temas
  a la vez anidando `data-theme` (los tokens están en selectores de atributo, no
  solo en `:root`, precisamente para eso).
- **No encontrado y error.** `src/app/not-found.tsx` envuelve su estado en el
  AppShell, para que tanto una URL inexistente como el `notFound()` de la ruta
  interna en producción muestren el estado diseñado (caso límite de la spec).
  `src/app/(app)/error.tsx` muestra el estado de error dentro del shell.
- **`/cuenta` en móvil** sin barra inferior y con «Volver»: el AppShell decide por
  ruta (FR-033).
- **Tokens.** `src/styles/tokens.css`, el único archivo con hex: primitivos y
  semánticos de `DESIGN_SYSTEM.md` §1 y §2, `person.1–2`, categorías, elevación,
  radios y espacio. `src/app/globals.css` importa Tailwind y mapea con `@theme
  inline` a `var(--…)`: es «el equivalente del repo» a `tailwind.config` (handoff
  paso 1). Los tokens de motion viven en `src/lib/motion/tokens.ts` (handoff paso 6).
- **Copy.** `src/lib/copy/es.ts`, objeto anidado `as const` con funciones para
  los textos con parámetros (`docs/CONVENTIONS.md` B.2).

---

## R7 · Pruebas por capa y CI

**Fuente.** ADR-011, `docs/TESTING.md` §2–§5; FR-042 a FR-047, FR-051 a FR-053.

- **Lint** (la capa más baja): hex crudo, esperas fijas y **regla de dependencia
  de `domain`** (`no-restricted-imports` en `src/domain/**` contra `react`,
  `react-dom`, `next`, `motion`, `@phosphor-icons/*`, `@radix-ui/*`,
  `@supabase/*` y `@/components/*`; §7.2, FR-003). Fixtures de lint con un caso que
  debe fallar por regla, ejecutados por un test que espera errores.
- **Vitest `domain`** (`environment: 'node'`): sin pruebas en la 001, porque no
  hay reglas de dominio (FR-003). Se ejecuta con `--passWithNoTests` y `verify` lo
  imprime como «0 pruebas — la 001 no tiene dominio financiero», **no** como
  «pasado».
- **Vitest `components`** (`jsdom`, RTL selectivo): AmountInput, selector,
  Anotar, ausencia de cifras en rutas de producto (FR-045); más las comprobaciones
  sin DOM que no son de dominio: la compuerta de R4, la paridad del respaldo de
  tokens de R2 y la página interna con `VERCEL_ENV=production` (FR-053). No se
  crea un tercer proyecto: `docs/TESTING.md` define dos.
- **Playwright, proyecto `a11y`** (job 5): build de producción con
  `JUNTIA_INTERNAL_SURFACE=1`, `reducedMotion: 'reduce'`, solo Chromium, retries 0
  local y 1 en CI. Visita cada ruta implementada en los dos temas, más una URL
  inexistente para el estado de «no encontrado» y la superficie interna con su
  encabezado comprobado (FR-052). Salida del ensayo sobre `/` y la ruta interna:

```
$ npx playwright test --project a11y  (next start)
light /: 0 violaciones, 0 serias o críticas
light /interno/primitivos: 0 violaciones, 0 serias o críticas
dark /: 0 violaciones, 0 serias o críticas
dark /interno/primitivos: 0 violaciones, 0 serias o críticas
  4 passed (3.8s)
```

- **CI.** `.github/workflows/ci.yml`, en `pull_request`, tres jobs en paralelo:
  `actions/checkout@v7` (v7.0.1, 2026-07-20) y `actions/setup-node@v7` (v7.1.0,
  2026-10-08) con caché de npm. Cada job mide su duración y la de cada comando y
  escribe en `$GITHUB_STEP_SUMMARY` la tabla contra el presupuesto, con
  `::warning::` si lo supera, nunca `exit 1` (ADR-011 §4). El resumen declara los
  jobs 3 y 4 «no aplicables — los incorpora P0-1».
- **Cero specs E2E.** Las pruebas de axe viven en `tests/a11y/` con el sufijo
  `.a11y.ts`; `tests/e2e/` no se crea.

---

## Resumen de incógnitas

| Incógnita del contexto técnico | Resuelta en |
| --- | --- |
| Versiones y compatibilidad | R1 (verificado) |
| Script de tema con App Router | R2 (verificado) |
| Herramienta de la regla de hex y esperas fijas | R3 (verificado) |
| Mecanismo y nombre de la superficie interna | R4 (verificado en local con las variables de Vercel) |
| Recuerdo del contexto sin parpadeo | R5 |
| Rutas, grupos y ubicación de tokens y copy | R6 |
| Reparto de pruebas, CI y presupuestos | R7 |

No queda ningún `NEEDS CLARIFICATION`.
