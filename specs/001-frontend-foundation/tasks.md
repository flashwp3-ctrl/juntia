---

description: "Lista de tareas de la especificación 001 · Frontend Foundation"
---

# Tasks: 001 · Frontend Foundation

> En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
> dependencias). **No** es la marca de propuesta del paquete de diseño. Una
> tarea que implementa algo propuesto lo dice en palabras —«propuesta
> §15.9»— y nunca con la etiqueta suelta.

**Input**: `specs/001-frontend-foundation/` — [spec.md](spec.md) (PR #11), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md) y [contracts/](contracts/) (PR #12).

**Status**: Draft — fase Tasks. No avanza a Implement sin el merge de su PR documental (ADR-012 §3.1).

**Quién lo ejecuta**: Codex, a partir de este archivo mergeado (ADR-012 §3.3). Cada tarea se entiende sin la conversación que la escribió: lleva las rutas exactas, el requisito que cumple y un criterio de terminado que se comprueba con un comando o una revisión concreta. **Las tareas no deciden y no amplían alcance**: si una tarea no se puede cumplir sin decidir algo que no está en la spec, el plan o sus auxiliares, la implementación se detiene y lo reporta (`AGENTS.md` 17).

**Tests**: se rigen por `docs/TESTING.md` y ADR-011, que prevalecen sobre
cualquier heurística genérica de generación de tests. Cada criterio de
aceptación va en **la capa más baja que puede detectar su fallo**
(`docs/TESTING.md` §4); cada tarea de test nombra su capa y el criterio que
cubre. **No** se genera un contract test por endpoint ni por interfaz: una
tarea de test que contradiga la matriz de capas está mal aunque la haya
generado la skill (ADR-012 §4). La auditoría de este archivo está en el
[Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4-f7-4-punto-2).

**Specs E2E que añade este slice (obligatorio)**: **0** (FR-047; spec, «Specs E2E que añade la 001»; ADR-011: «la especificación 001 no tiene ninguna spec E2E»). La comprobación de axe por ruta es un E2E barato por ruta y no cuenta como spec E2E. `tests/e2e/` **no se crea**.

**Organization**: el orden de las fases sigue las dependencias del plan —scaffold, tokens y CI base; primitivos; shell, comportamiento provisional y axe; superficie interna— y se reparte en los cuatro PR de «Estrategia de implementación» y cada tarea de una historia lleva su etiqueta `[USn]`. El orden no coincide con la prioridad de las historias porque el AppShell (US1, P1) no se puede construir sin los tokens (US5) y los primitivos (US6). Ver «Dependencias».

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo con las demás `[P]` **de su mismo grupo**: archivos distintos, ninguna depende de otra del grupo y **ninguna compite por el mismo checkout, servidor o puertos**. Una tarea cuyo criterio de terminado compila, sirve la app, ocupa un puerto, ejecuta `npm ci` o modifica un archivo de forma temporal no lleva `[P]` (revisión del PR #14, F14-2). Un grupo empieza cuando termina el anterior.
- **[Story]**: historia de la spec a la que pertenece (US1…US7). Setup, Fundacional y Verificación no llevan etiqueta.
- Cada tarea dice debajo **Cumple** (requisitos de la spec) y **Terminado cuando** (comprobación concreta).

## Reglas que aplican a todas las tareas

Se enuncian una vez para no repetirlas en cada tarea. Una tarea que las incumpla no está terminada.

1. **Versiones exactas** de [research.md](research.md) R1, sin `^` ni `~`. No se cambia ninguna. No se instala nada de la lista de R1.4 («Lo que la 001 no instala»).
2. **Ningún color hex** fuera de `src/styles/tokens.css` (ADR-011 §6, regla 7). **Ninguna cadena visible ni nombre accesible** escrito inline en JSX: todo sale de `src/lib/copy/es.ts` (`docs/CONVENTIONS.md` B.1, B.2). Identificadores, archivos y carpetas en inglés; los segmentos de URL siguen al maestro §15.3 (plan, R6). Comentarios en español (`docs/CONVENTIONS.md` A.3).
3. **Ninguna cifra financiera** en una ruta de producto (FR-029) y **ningún valor del caso de octubre ni de la tabla de DEC-G04** en ningún archivo (FR-017, FR-050; maestro §15.10, «Dataset dorado», regla 3).
4. **Tokens semánticos y alternativa de movimiento reducido** para todo lo que se mueve (`docs/design/MOTION_SYSTEM.md`); foco visible con anillo de 2 px y offset de 2 px; área táctil ≥ 44×44 en lo interactivo (contrato de [primitives.md](contracts/primitives.md), «Común a todos»).
5. **Ninguna tarea implementa un elemento propuesto sin aprobar** (maestro §15.9). La 001 no implementa la anatomía de `AccountButton`, `LimitNote`, `SharedBalance`, `ExpenseRow`, el flujo E1–E5, la Context Transition S1, selector ni persistencia de tema, ni `person.3–6` (FR-048; plan, comprobación de jerarquía).
6. **Ningún test de Vitest importa un módulo que importe `server-only`** (plan, F12-3). **Ninguna espera fija** en pruebas de navegador (ADR-011 §6, regla 4).
7. **Los tests de una fase se escriben antes que el código que prueban y se ven fallar** (`docs/TESTING.md` §6, «Míralo fallar»). Cada test copia como comentario, al principio, el criterio literal que cubre con su referencia.
8. **Ninguna afirmación sin salida real** (`AGENTS.md` 12 y 18). Una tarea `[V]` se cierra pegando su salida en el PR, nunca escribiendo «verificado».

## Interpretaciones de ejecución

No son decisiones: son lecturas necesarias para que una tarea se pueda ejecutar donde la spec y el plan no fijan el detalle. Las aceptó el gestor en la revisión del gate de tasks; si el revisor del PR de implementación las objeta, se cambian sin tocar el alcance.

| # | Dónde | Lectura | Por qué |
| --- | --- | --- | --- |
| I1 | T021, T040, T060 | axe y las aserciones de movimiento reducido corren a **390 y 1440 px** | El plan no fija el ancho de la pasada de axe; `CLAUDE.md` 5 hace obligatorios esos dos, que además son composiciones distintas del shell |
| I2 | T010, T034 | El control de cierre del aviso es un **botón de texto «Cerrar»** | El mapa semántico de `DESIGN_SYSTEM.md` §3 no tiene ícono de cierre; elegir uno sería una decisión de diseño |
| I3 | T015, T022 | El script de tema se comprueba en **dos capas**: su lógica en unidad y su posición en el HTML servido | El respaldo CSS oculta un fallo del script a axe; ninguna de las dos capas ve por sí sola los dos fallos (Anexo A, B17 y B18) |

---

## Phase 1: Setup — scaffold

**Purpose**: el proyecto Next.js con el stack fijado, sin nada de los slices siguientes (FR-001, FR-002, FR-003).

### Grupo 1A

- [ ] T001 Crear `package.json` y `package-lock.json` en la raíz con las versiones exactas de research R1
  - Contenido: `"private": true`; `"packageManager": "npm@11.1.0"`; `"engines": { "node": ">=24 <25" }`. Dependencias: `next` 16.4.4, `react` y `react-dom` 19.3.1, `motion` 14.9.0, `@phosphor-icons/react` 2.1.10, `@radix-ui/react-dialog` 1.3.1, `server-only` 0.0.1. Desarrollo: `typescript` 6.0.3, `tailwindcss` y `@tailwindcss/postcss` 4.3.4, `eslint` 9.39.5, `eslint-config-next` 16.4.4, `@eslint/css` 1.4.0, `vitest` 5.1.0, `vite` 8.3.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.8, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0, `@types/node` 24.19.2, `@types/react` y `@types/react-dom` 19.3.0.
  - Scripts, según [contracts/ci.md](contracts/ci.md): `dev`, `build`, `start` (Next); `lint` = `eslint .`; `typecheck` = `tsc --noEmit`; `test:unit` = `vitest run --project domain --passWithNoTests`; `test:components` = `vitest run --project components`; `test:a11y` = `playwright test --project a11y`; `check:internal-surface` = `node scripts/check-internal-surface.mjs`; `check:theme-script` = `node scripts/check-theme-script.mjs` (añadido en la revisión del gate de tasks, T022; no está en la tabla de [contracts/ci.md](contracts/ci.md)); `verify` = `node scripts/verify.mjs`. **No** se crean `test:db` ni `test:e2e*` (`docs/TESTING.md` §3, regla 2).
  - Cumple: FR-001, FR-002.
  - Terminado cuando: `npm ci` termina con exit 0 y el único aviso es el de ESLint 9 sin soporte (research R1.3); `node -e "const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};const bad=Object.entries(all).filter(([,v])=>/[\^~]/.test(v));if(bad.length){console.error(bad);process.exit(1)}"` termina con exit 0; `npm ls --depth=0` lista exactamente los paquetes de arriba y ninguno de R1.4.

### Grupo 1B (después de T001)

- [ ] T002 [P] Crear `tsconfig.json` con `"strict": true`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`, el plugin `next` y el alias `"@/*": ["./src/*"]`
  - Cumple: FR-001 (TypeScript `strict`, maestro §7.1). El alias `@/` lo usa la regla de dependencia de `domain` (T013).
  - Terminado cuando: `npx tsc --noEmit` termina con exit 0 después de T006.

- [ ] T003 Crear `next.config.ts` (sin opciones experimentales) y `postcss.config.mjs` con el plugin `@tailwindcss/postcss`, exportando una constante con nombre y no un objeto anónimo
  - Cumple: FR-001. El export con nombre evita el aviso `import/no-anonymous-default-export` que vio research R3.
  - Terminado cuando: `npm run build` termina con exit 0 después de T006.

- [ ] T004 [P] Añadir a `.gitignore` de la raíz, sin borrar ninguna línea existente: `/node_modules/`, `/.next/`, `/test-results/`, `/playwright-report/`, `*.tsbuildinfo`
  - Cumple: FR-001.
  - Terminado cuando: `git check-ignore node_modules .next test-results playwright-report` imprime las cuatro rutas y `git diff .gitignore` solo muestra líneas añadidas.

- [ ] T005 [P] Crear `src/domain/README.md`: la capa de dominio existe vacía de reglas financieras; enuncia la regla de dependencia del maestro §7.2 (no importa `react`, `react-dom`, `next`, `motion`, `@phosphor-icons/*`, `@radix-ui/*`, `@supabase/*` ni `@/components/*`) y que los tipos de dinero, contexto de datos, persona y moneda son de P0-1
  - Cumple: FR-003.
  - Terminado cuando: `ls src/domain` muestra solo `README.md`.

### Grupo 1C (después del grupo 1B)

- [ ] T006 Crear `src/app/layout.tsx` mínimo (`<html lang="es-CO">`, `<body>{children}</body>`) y `src/app/(app)/page.tsx`, que solo devuelve `<main id="contenido" />` sin texto
  - Cumple: FR-001. Fase 3 completa el layout y la fase 5 la página.
  - Terminado cuando: `npm run build` y `npx tsc --noEmit` terminan con exit 0 y la tabla de rutas del build muestra `○ /`.

**Checkpoint**: `npm ci && npm run build && npx tsc --noEmit` en verde. Comienza el punto de control **A** (PR A; ver «Estrategia de implementación»).

---

## Phase 2: Foundational — herramientas de calidad y módulos compartidos

**Purpose**: Vitest, Playwright, las reglas de lint propias con su prueba de regresión, el catálogo de copy y los tokens de motion. Todo lo demás depende de esto.

**⚠️ CRITICAL**: ninguna tarea de historia empieza antes de terminar esta fase.

### Grupo 2A

- [ ] T007 [P] Crear `vitest.config.mts` con `test.projects` (no `vitest.workspace.ts`): proyecto `domain` (`environment: 'node'`, `include: ['src/domain/**/*.test.ts']`) y proyecto `components` (`environment: 'jsdom'`, `include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts']`, `exclude` de `src/domain/**`, `setupFiles: ['./vitest.setup.ts']`); y `vitest.setup.ts` con `afterEach(() => cleanup())` de RTL
  - Las pruebas sin DOM del proyecto `components` (T012, T014, T036) declaran `// @vitest-environment node` en su primera línea. Sin `@vitejs/plugin-react` (research R1.2). El alias `@/` se resuelve igual que en `tsconfig.json`.
  - Cumple: FR-042, FR-045 (los dos proyectos de `docs/TESTING.md` §2; research R1.2 y R7).
  - Terminado cuando: `npm run test:unit` termina con exit 0 sin pruebas y `npx vitest run --project components --passWithNoTests` termina con exit 0.

- [ ] T008 [P] Crear `playwright.config.ts` con un único proyecto `a11y`: `testDir: 'tests/a11y'`, `testMatch: '**/*.a11y.ts'`, solo Chromium (`devices['Desktop Chrome']`), `use: { reducedMotion: 'reduce', baseURL: 'http://localhost:3000' }`, `retries: process.env.CI ? 1 : 0`, y `webServer: { command: 'npm run start', url: 'http://localhost:3000', env: { JUNTIA_INTERNAL_SURFACE: '1' }, reuseExistingServer: !process.env.CI }`
  - El `webServer` sirve el build ya hecho; no compila. No se configura ningún otro navegador ni proyecto.
  - Cumple: FR-044 (ADR-011 §6, reglas 3, 5 y 6), FR-043.
  - Terminado cuando: `npx tsc --noEmit` termina con exit 0 y `npx playwright --version` imprime `Version 1.64.1`. La ejecución real se comprueba en T021.

- [ ] T009 [P] Crear los fixtures de lint en `tests/lint-fixtures/`: `hex.tsx`, `hex.css`, `wait.a11y.ts` y `domain-import.ts`
  - `hex.tsx`: hex en la línea 2 (plantilla ``const tone = `color: #1a1c1a` ``) y dos en la línea 4 (`style={{ color: "#FF0000" }}` y `className="bg-[#123456]"`), más un `href="#contenido"` que **no** debe marcarse.
  - `hex.css`: hex en la línea 4 y en la línea 8, uno de ellos dentro de `@theme inline { --color-bad: #2d4b3d; }`, más un selector `#contenido` que **no** debe marcarse.
  - `wait.a11y.ts`: `page.waitForTimeout(…)` en la línea 5 y `setTimeout(…)` en la línea 6.
  - `domain-import.ts`: un `import` de `react` y otro de `@/components/ui/button`.
  - Ningún fixture lleva un id solo hexadecimal (`#add`, `#bead`): es el límite conocido de research R3.
  - Cumple: FR-006, FR-044, FR-003.
  - Terminado cuando: existen los cuatro archivos con los fallos en las líneas indicadas (las comprueba T010).

- [ ] T010 Crear `src/lib/copy/es.ts`: catálogo `as const` con las secciones de [data-model.md](data-model.md) («CopyCatalog»): `shell`, `nav`, `context`, `annotate`, `empty`, `balance`, `account`, `states`, `primitives`, `internal`; los textos con parámetros son funciones tipadas (por ejemplo `context.announce(label)` → «Ahora ves: {contexto}»)
  - Redacción provisional según `docs/design/BRAND_FOUNDATION.md` §4: tuteo, frases cortas, es-CO, sin emojis ni exclamaciones. Usa «Yo», «Nosotros» y «Mi cuenta» de `docs/GLOSSARY.md`; ninguna palabra de su §9. El aviso de Anotar dice que registrar gastos llega con la próxima versión; Balance, que aparece cuando exista la pareja; `/cuenta`, que la cuenta llega con el inicio de sesión. **Ningún texto nombra «P0-1», «P0-2» ni otra fase, ni promete fechas** (FR-034). La redacción final se revisa en el PR (spec, supuesto «El copy final se revisa en el PR»).
  - El botón de cierre del aviso es un texto («Cerrar», sección `annotate`): el mapa semántico de `DESIGN_SYSTEM.md` §3 no tiene ícono de cierre y la tarea no lo elige.
  - Cumple: FR-034, FR-035, FR-036.
  - Terminado cuando: `npx tsc --noEmit` termina con exit 0; `git grep -nE "P0-[0-9]|Total gastado|Depositad|Invertir|está en deuda|excedido|Proporcional|Transferencia verificada" -- src/lib/copy` no devuelve nada; y un uso de prueba de una clave inexistente (`copy.nav.noExiste`) en un archivo temporal hace fallar `tsc` (se borra el archivo después y se pega la salida en el PR).

- [ ] T011 [P] Crear `src/lib/motion/tokens.ts` con los springs y duraciones de `docs/design/MOTION_SYSTEM.md` que usa la 001: `snappy` (perilla del Segmented, pulsación de Button), `sheet` (aparición de la hoja), la escala .98 → 1 del diálogo y los 180 ms de la transición de color de tema
  - Solo constantes; sin React. Los valores se copian del documento, no se inventan.
  - Cumple: FR-015, FR-040 (handoff, orden de implementación, paso 6).
  - Terminado cuando: `npx tsc --noEmit` termina con exit 0 y cada constante lleva comentario con la sección de `MOTION_SYSTEM.md` de la que sale.

### Grupo 2B (después de T007 y T009)

- [ ] T012 Escribir `tests/lint-rules.test.ts` (`// @vitest-environment node`, proyecto `components`) — **capa: lint, probada con la API de ESLint**
  - Usa `new ESLint({ ignore: false })` y afirma **las líneas exactas** que marca cada regla propia: `[2, 4, 4]` en `hex.tsx`, `[4, 8]` en `hex.css`, `[5, 6]` en `wait.a11y.ts`. Afirma que `href="#contenido"` y `#contenido` no se marcan. Con `lintText(source, { filePath: 'src/styles/tokens.css' })` afirma que un hex en `tokens.css` queda exento. Con `lintText(<contenido de domain-import.ts>, { filePath: 'src/domain/fixture.ts' })` afirma que los dos `import` se marcan por la regla de dependencia.
  - Cumple: FR-006, FR-044, FR-003; US-7, escenario 3.
  - Terminado cuando: `npx vitest run tests/lint-rules.test.ts` **falla** porque las reglas todavía no existen (se pega la salida del fallo en el PR).

### Grupo 2C (después de T012)

- [ ] T013 Crear `eslint.config.mjs` sobre `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript`, con `globalIgnores(['.next/**', 'node_modules/**', 'tests/lint-fixtures/**', 'next-env.d.ts'])` y las tres reglas propias de research R3 y R7
  - Hex crudo con `no-restricted-syntax` (selectores `Literal` y `TemplateElement` con la expresión `HEX` de R3) en `**/*.{js,jsx,mjs,cjs,ts,tsx}`; en `**/*.css` salvo `src/styles/tokens.css`, con `@eslint/css` (`language: 'css/css'`, `languageOptions: { tolerant: true }`) y los selectores `Hash` y `Raw`.
  - Esperas fijas en `tests/**/*.ts`: `CallExpression[callee.property.name='waitForTimeout']` y `CallExpression[callee.name='setTimeout']`, además de las dos de hex.
  - Dependencia de `domain`: `no-restricted-imports` en `src/domain/**` contra `react`, `react-dom`, `next`, `motion`, `@phosphor-icons/*`, `@radix-ui/*`, `@supabase/*` y `@/components/*`.
  - Mensajes en español que citan la regla de ADR-011 (texto de R3).
  - Cumple: FR-006, FR-044, FR-003.
  - Terminado cuando: `npx vitest run tests/lint-rules.test.ts` pasa; `npm run lint` termina con exit 0 y 0 errores **sin banderas** en la línea de comandos.

**Checkpoint**: `npm run lint`, `npm run typecheck` y `npx vitest run --project components` en verde.

---

## Phase 3: User Story 5 — Ver la app en el tema del sistema, sin destello (Priority: P2)

**Goal**: los tokens de I2 Bosque & Arena en los dos temas y el tema que sigue al sistema desde el primer cuadro.

**Independent Test**: cargar `/` emulando `prefers-color-scheme: light` y `dark`, con red lenta, y comprobar el primer pintado; cambiar la preferencia con la app abierta (spec, US-5).

### Tests for User Story 5 — por capas (`docs/TESTING.md` §4) ⚠️

- [ ] T014 [US5] Escribir `src/styles/tokens.test.ts` (`// @vitest-environment node`, proyecto `components`) — **capa: unidad sin DOM sobre el texto de `tokens.css`**
  - Lee `src/styles/tokens.css` y afirma que el bloque `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` declara **exactamente las mismas propiedades con los mismos valores** que `[data-theme="dark"]`, sin propiedades de más ni de menos.
  - Cumple: FR-005 (caso límite «Script de tema sin almacenamiento ni JavaScript tardío»; research R2, punto 4).
  - Terminado cuando: `npx vitest run src/styles/tokens.test.ts` **falla** porque `tokens.css` no existe (salida pegada en el PR).

- [ ] T015 [US5] Escribir `src/lib/theme-script.test.ts` (`// @vitest-environment node`, proyecto `components`) — **capa: unidad sin DOM, ejecutando la cadena del script**
  - Importa la cadena de `src/lib/theme-script.ts` y la ejecuta con `new Function` sobre dobles mínimos: `document.documentElement` con `setAttribute`/`getAttribute`, `window.matchMedia` que devuelve `{ matches, addEventListener }` y `window.localStorage`. Afirma: con `matches: true` pone `data-theme="dark"` y con `false`, `"light"`; al disparar el `change` registrado, el atributo cambia; con `juntia:context` = `"us"` pone `data-context="us"`; con un valor ilegible no pone `data-context`; con `getItem` lanzando `SecurityError` no lanza y el tema se aplica igual.
  - **Por qué esta capa:** el respaldo CSS pinta el tema del sistema aunque el script falle, así que axe en oscuro no ve una regresión del script. La lógica del script es la capa más baja que detecta que deja de fijar el atributo. Dónde queda el script en el documento no lo ve esta prueba: lo comprueba T022 sobre el HTML servido, porque el root layout importa `next/font` y no se renderiza fuera de Next.
  - Cumple: FR-005, FR-026; SC-006.
  - Terminado cuando: `npx vitest run src/lib/theme-script.test.ts` **falla** porque el módulo no existe (salida pegada en el PR).

### Implementation for User Story 5

#### Grupo 3A (después de T014 y T015)

- [ ] T016 [US5] Crear `src/styles/tokens.css`, el **único** archivo con hex del repositorio
  - Primitivos de `docs/design/DESIGN_SYSTEM.md` §1 y semánticos de §2 como variables CSS, en `:root, [data-theme="light"]` (claro) y `[data-theme="dark"]` (oscuro), más el bloque de respaldo sin JavaScript con los mismos valores que el oscuro. `color-scheme: light` / `dark` en cada bloque. Categorías (las diez de §1.3), elevación, radios, espacio, breakpoints, capas, `focus.ring`, `skel` y los tokens `comp.button.*` de `COMPONENT_SPECIFICATIONS.md` §Button.
  - Personas: **solo** `person.1` y `person.2` (maestro §15.9, fila «Personas»). Los tokens `finance.*` entran, aunque ninguna pantalla de la 001 los usa.
  - Incluye los valores de paleta ya codificados en `DESIGN_SYSTEM.md` §4 (Sara petróleo, Hogar azul tenue, superficie oscura `#191C1F`), que son **propuesta §15.9 pendiente de aprobación** en la revisión del PR viendo la pantalla (plan, comprobación de jerarquía).
  - Los tokens van en selectores de atributo, no solo en `:root`, para que la superficie interna anide `data-theme` (plan, «Tokens y temas»).
  - Cumple: FR-004, FR-005, FR-006.
  - Terminado cuando: `npx vitest run src/styles/tokens.test.ts` pasa; `git grep -nE "person-?[3-6]" -- src/styles/tokens.css` no devuelve nada; `npm run lint` termina con exit 0.

- [ ] T017 [P] [US5] Crear `src/lib/theme-script.ts`, que exporta el script bloqueante como cadena, con el comportamiento exacto de research R2.1, línea 24: pone `data-theme="light" | "dark"` según `matchMedia('(prefers-color-scheme: dark)')`, escucha su evento `change` y actualiza el atributo, y lee `localStorage['juntia:context']` dentro de `try/catch` para poner `data-context` solo si vale `"me"` o `"us"`
  - No lee cookie ni perfil (FR-005; plan, fila «Persistencia del tema»).
  - Cumple: FR-005, FR-026 (research R2, R5).
  - Terminado cuando: `npx vitest run src/lib/theme-script.test.ts` pasa, y `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

#### Grupo 3B (después de T016)

- [ ] T018 [US5] Crear `src/app/globals.css`: `@import "tailwindcss"`, importa `../styles/tokens.css`, mapea los tokens a Tailwind con `@theme inline` hacia `var(--…)` (sin hex), aplica `font-variant-numeric: tabular-nums` global y la transición de color de 180 ms **solo** dentro de `@media (prefers-reduced-motion: no-preference)`
  - Cumple: FR-004, FR-007, FR-040; US-5, escenario 2.
  - Terminado cuando: `npm run lint` termina con exit 0 (la regla de hex cubre este archivo) y `npm run build` termina con exit 0.

#### Grupo 3C (después de T017 y T018)

- [ ] T019 [US5] Completar `src/app/layout.tsx`: `<html lang="es-CO" suppressHydrationWarning>`; dentro de `<head>`, un `<script dangerouslySetInnerHTML={{ __html: themeScript }} />` sin `async` ni `defer` (no `next/script`); importa `./globals.css`; fuentes con `next/font/google` como variables CSS —Instrument Serif 400 normal e itálica, Geist 400–600, Geist Mono 500—; sin `<meta name="theme-color">`
  - Serif solo para titulares; nunca en tablas ni formularios (FR-007).
  - Cumple: FR-005, FR-007 (research R2, puntos 1–6).
  - Terminado cuando: `npm run build` termina con exit 0; con `npm run start` en marcha, `curl -s http://localhost:3000/ | sed 's/></>\n</g' | grep -n -E '^<(head|/head|body|script)'` muestra el script de tema dentro de `<head>`, sin `async`, antes de `</head>` y de `<body>` (mismo comando que research R2.1); en `npm run dev` la consola del navegador no muestra errores de hidratación en claro ni en oscuro.

**Checkpoint**: US5 demostrable en `/` vacía. La medición del primer cuadro y de CLS es T065.

---

## Phase 4: User Story 7 — CI base: `verify`, jobs 1, 2 y 5 y axe de `/` (Priority: P3)

**Goal**: el workflow llega **junto al scaffold**, como pide ADR-011 §5, y cada control entra con lo que controla: `verify` y los jobs 1 y 2; el job 5 con axe sobre la única ruta que existe en A, `/`; la comprobación del script de tema, que nace en A. La superficie interna figura como **no aplicable, la incorpora B** (`docs/TESTING.md` §3, regla 1).

**Independent Test**: en el PR A, los tres jobs corren en paralelo, fallan cuando deben y el resumen nombra los controles no aplicables (spec, US-7).

#### Grupo 4A (en serie: T020 → T021 → T022 → T023)

- [ ] T020 [US7] Crear `scripts/verify.mjs`: ejecuta en orden `npm run lint`, `npm run typecheck`, `npm run test:unit` y `npm run test:components`; se detiene en el primer fallo con su código de salida; mide cada uno e imprime al final la tabla de [contracts/ci.md](contracts/ci.md) («Salida de `verify`»)
  - Fila `unit (domain)`: «0 pruebas — la 001 no tiene dominio financiero» cuando Vitest no encuentra pruebas, nunca «pasó». Fila `SQL/RLS`: «NO APLICABLE — lo incorpora P0-1», con presupuesto `< 60 s`. Presupuestos `< 15 s` (domain) y `< 90 s` (total). Si un tiempo supera su presupuesto, la fila dice «SUPERA EL PRESUPUESTO (aviso)» y **el código de salida no cambia por eso** (ADR-011 §4; cláusula anticliquet).
  - Node puro, igual en Windows y en Linux.
  - Cumple: FR-042, FR-046; SC-009; US-7, escenarios 2 y 4.
  - Terminado cuando: `npm run verify` termina con exit 0 e imprime la tabla con las seis filas; con un error de tipo introducido a propósito, termina con exit distinto de 0 en `typecheck` (las dos salidas se pegan en el PR y el error se revierte).

- [ ] T021 [US7] Crear `tests/a11y/routes.a11y.ts` — **capa: E2E barato por ruta (visitar + axe), no es una spec E2E**
  - Las rutas a visitar están en una lista tipada al principio del archivo; **en A solo contiene `/`**, y cada PR posterior la amplía con las rutas que crea (B: T040; C: T060), porque cada ruta entra en la comprobación con el PR que la crea (`docs/TESTING.md` §3).
  - Con `@axe-core/playwright`, para cada tema (`page.emulateMedia({ colorScheme: 'light' | 'dark' })`) y en los dos anchos obligatorios, 390 y 1440 px (`CLAUDE.md` 5): afirma que cada respuesta es **200** (una ruta que no existe nunca cuenta como verificada) y falla si hay violaciones `serious` o `critical`; imprime una línea por ruta, tema y ancho con el número de violaciones (forma de research R7).
  - **Movimiento reducido (ADR-011 §2, fila 17)**, con la emulación `reducedMotion: 'reduce'` del proyecto (T008), en cada ruta de la lista: `getComputedStyle(document.body).transitionDuration` es `0s` en todas sus entradas (la transición de color de tema de 180 ms solo existe sin movimiento reducido, T018).
  - Sin `waitForTimeout` ni `setTimeout`, tampoco dentro de `page.evaluate`: los cuadros se cuentan con `requestAnimationFrame`, y fuera de él solo hay aserciones web-first.
  - Cumple: FR-040, FR-043; SC-002, SC-010; ADR-011 §2, filas 16 y 17.
  - Terminado cuando: `npm run build && npm run test:a11y` termina con exit 0 con las 4 combinaciones de tema y ancho para `/`; **míralo fallar**: con `reducedMotion: 'no-preference'` puesto temporalmente en `playwright.config.ts`, la aserción de la transición de tema falla; se pegan las dos salidas y se restaura la configuración.

- [ ] T022 [US5] Crear `scripts/check-theme-script.mjs` — **capa: HTTP real contra el build**, la más baja que ve dónde queda el script en el documento servido
  - Sobre el build ya hecho, arranca `next start` en un puerto libre, pide `/` y comprueba en el HTML recibido: hay un `<script>` inline **dentro de `<head>`**, sin `src`, `async` ni `defer`, antes de `</head>` y de `<body>`; su contenido es el de `src/lib/theme-script.ts` (compara un fragmento distintivo, como `prefers-color-scheme` junto a `data-theme`); `<html>` no trae `data-theme` del servidor. Imprime una fila por comprobación y termina con exit 1 si alguna falla. Node puro, igual en Windows y en Linux.
  - Complementa a T015, no la repite: T015 ve la lógica del script y no su posición; esta ve la posición y no la lógica. El primer cuadro real sigue siendo la medición del PR (T065).
  - Cumple: FR-005; SC-006.
  - Terminado cuando: `npm run build && npm run check:theme-script` termina con exit 0; **míralo fallar**: con `async` añadido temporalmente al `<script>` de `src/app/layout.tsx`, recompilado, el script termina con exit 1; se pegan las dos salidas y se revierte el cambio.

- [ ] T023 [US7] Crear `.github/workflows/ci.yml` según [contracts/ci.md](contracts/ci.md), **con los jobs 1, 2 y 5**
  - Disparo `pull_request`; `permissions: contents: read`; `actions/checkout@v7` y `actions/setup-node@v7` con `node-version: 24` y `cache: npm`.
  - Tres jobs **en paralelo**, cada uno con `npm ci`: `lint-typecheck-build` (`npm run lint`, `npm run typecheck`, `npm run build`); `vitest` (`npm run test:unit`, `npm run test:components`); `a11y` (`npm run build` una sola vez y sin variables, `npx playwright install --with-deps chromium`, `npm run test:a11y` y `npm run check:theme-script`). El job 5 corre sobre las rutas que existan en cada PR: en A, solo `/` (`docs/TESTING.md` §3).
  - **Sin caché de navegadores** (ADR-011 §4, «Mitigación en el humo»).
  - Cada job guarda la hora de inicio en su primer paso y mide cada comando; en un último paso con `if: always()` escribe en `$GITHUB_STEP_SUMMARY` su duración y la de cada comando contra el presupuesto (gate de PR < 6 min); si lo supera emite `::warning::` y termina con éxito, **nunca** `exit 1` por presupuesto.
  - El resumen del job 1 incluye siempre la tabla de controles no aplicables: «3 · Supabase local, migraciones y SQL/RLS — NO APLICABLE — lo incorpora P0-1»; «4 · E2E de humo — NO APLICABLE — la primera spec E2E nace en P0-1»; «Superficie interna (FR-052, FR-053) — NO APLICABLE — la incorpora la 001 en su PR B». La última fila se retira en T041.
  - Cumple: FR-043, FR-046; SC-009; US-7, escenarios 1, 2 y 4.
  - Terminado cuando: en el PR A, el run de CI muestra los tres jobs en paralelo y el resumen con las tres filas no aplicables (enlace pegado en el PR); **míralo fallar**: un commit temporal con un hex crudo en `src/app/globals.css` hace fallar el job 1 (`lint`); se pega el enlace del run rojo y se revierte el commit.

**Checkpoint**: `npm run verify`, `npm run test:a11y` y `npm run check:theme-script` en verde en local y los tres jobs en verde en el PR. Fin del punto de control **A**.

---

## Phase 5: User Story 6 — Recibir primitivos listos para conectar P0-1 (Priority: P2)

**Goal**: los nueve primitivos del paso 2 del handoff y la base accesible de BottomSheet y Modal, según [contracts/primitives.md](contracts/primitives.md).

**Independent Test**: las pruebas de componentes de AmountInput pasan; la revisión humana ve cada primitivo en sus estados y en los dos temas en la superficie interna (fase 7).

Archivos en `src/components/ui/`. Anatomía, tamaños y tokens: `docs/design/COMPONENT_SPECIFICATIONS.md`; la tabla de [primitives.md](contracts/primitives.md) es lo que P0-1 puede dar por hecho. Los nombres de props los fija la implementación y no pueden contradecir esa tabla.

### Tests for User Story 6 — por capas (`docs/TESTING.md` §4) ⚠️

(T024 está en el grupo 5A, junto a los primeros primitivos.)

### Grupo 5A

- [ ] T024 [P] [US6] Escribir `src/components/ui/amount-input.test.tsx` — **capa: componente (Vitest + RTL + user-event)**
  - Claude Design: no necesita el comp: se deriva de la spec y del contrato, no de la pantalla.
  - Afirma: el campo tiene `inputmode="numeric"`; al escribir `1234567` muestra `1.234.567` (`Intl.NumberFormat('es-CO')`, sin decimales); no acepta un décimo dígito (tope 999.999.999); al pegar `$ 1.200 abc` conserva `1.200`; al pegar `abc` el valor no cambia; vacío entrega `null` y `0` entrega `0` (vacío ≠ 0); el valor entregado está en **pesos enteros**; con error, el campo lleva `aria-invalid="true"` y `aria-errormessage` que apunta a un mensaje existente, el mensaje está en una región `aria-live="polite"` y el ícono de error está oculto a lectores; la ayuda queda enlazada con `aria-describedby`.
  - Valores solo de `COMPONENT_SPECIFICATIONS.md` §Input (Monto); nunca del caso de octubre.
  - Cumple: FR-014, FR-013 (estado de error en el campo de monto); US-6, escenarios 1 y 2; casos límite «Importe de 999.999.999 y más» y «AmountInput vacío frente a cero».
  - Terminado cuando: `npx vitest run src/components/ui/amount-input.test.tsx` **falla** porque el componente no existe (salida pegada en el PR).

- [ ] T025 [P] [US6] Crear `src/components/ui/app-icon.tsx`: `<AppIcon name weight size label? />` con un mapa tipado `nombre → componente` e imports individuales desde `@phosphor-icons/react/dist/ssr/*`; pesos `regular`, `fill`, `bold`, `duotone`; `aria-hidden="true"` salvo que reciba `label`, que se convierte en su nombre accesible
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, los íconos en sus cuatro pesos y la ficha; el mapa de nombres manda en `DESIGN_SYSTEM.md` §3.
  - Nombres del mapa: los del mapa semántico de `DESIGN_SYSTEM.md` §3 que usa la 001 (`house-simple`, `receipt`, `flag-banner`, `chart-pie-slice`, `scales`, `user-circle`, `plus`, `caret-left`, `warning`, `warning-circle`, `check-circle`, `clock`, `lock-simple`, `tray`), `circle-notch` (carga de Button, `COMPONENT_SPECIFICATIONS.md` §Button) y los íconos de las diez categorías de §1.3. Ninguna otra familia, ningún emoji.
  - Cumple: FR-008.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0; `git grep -n "lucide\|tabler\|iconoir" -- src package.json` no devuelve nada.

- [ ] T026 [P] [US6] Crear `src/components/ui/avatar.tsx`: inicial y color de `person.1` o `person.2`; sin patrón de tramo
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Avatar de `person.1` y `person.2`.
  - Cumple: FR-009 (maestro §15.9, fila «Personas»; spec, conflicto 1).
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0 y el tipo de la prop de persona solo admite `1 | 2`.

- [ ] T027 [P] [US6] Crear `src/components/ui/skeleton.tsx`: replica la geometría que recibe; pulso de opacidad 1 → .55 en 1,6 s en CSS, sin shimmer; estático con movimiento reducido; contenedor con `aria-busy="true"` y texto oculto de carga del catálogo; **solo aparece si la carga supera 300 ms**
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Skeleton.
  - Cumple: FR-016, FR-040 (`COMPONENT_SPECIFICATIONS.md` §Skeleton; `MOTION_SYSTEM.md` §6).
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0. Su presentación se revisa en la superficie interna (T038, T068).

- [ ] T028 [P] [US6] Crear `src/components/ui/segmented.tsx`: riel, perilla y etiqueta; prop de rol `radiogroup` o `tablist`; foco itinerante y flechas ←/→ escritos a mano (sin `@radix-ui/react-radio-group` ni `react-tabs`, research R1.4); perilla con `motion` `layoutId` y el spring `snappy` de `src/lib/motion/tokens.ts`; con `useReducedMotion()`, `duration: 0`; **no anima al montar**
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Segmented; y `Juntia DS v1 - 04 Pantallas.dc.html`, 04·1 (encabezado de 390) y 04·7 (sidebar de 1440) para el selector Yo/Nosotros.
  - Cumple: FR-015, FR-040 (Clarifications, Q2).
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0. El comportamiento con teclado se prueba en T042.

### Grupo 5B (después de T025)

- [ ] T029 [P] [US6] Crear `src/components/ui/category-icon.tsx`: tamaños sm 32, md 40, lg 48, xl 64 (ícono al 50 %, radio 32 % del lado); las diez categorías de `DESIGN_SYSTEM.md` §1.3 con sus fondos; peso Duotone; forma según el tipo de fila (cuadrada, círculo de ahorro, círculo de contorno); anillo de seleccionado; decorativo
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, fichas de categoría en sus cuatro tamaños y tres formas.
  - Cumple: FR-010.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

- [ ] T030 [P] [US6] Crear `src/components/ui/badge.tsx`: los cinco estados de `COMPONENT_SPECIFICATIONS.md` §Badge de estado (POR SALDAR con `clock` y borde punteado, LIQUIDADO con `check-circle`, EXCEDIDO, CERCA DEL LÍMITE con `warning`, PRIVADO con `lock-simple`), siempre ícono + texto del catálogo
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Badge de estado.
  - Cumple: FR-011.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

- [ ] T031 [P] [US6] Crear `src/components/ui/button.tsx`: `<button>` nativo; variantes `primary`, `secondary`, `ghost`, `danger`; tamaños sm 36, md 44, lg 52–56 con área táctil mínima de 44; estados hover, pressed (spring `snappy`; con movimiento reducido solo cambia el color), focus, disabled con `aria-disabled` y loading con `circle-notch` girando a 0,8 s/vuelta, etiqueta en gerundio del catálogo y **ancho fijado al del contenido inicial**
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Button en sus variantes, tamaños y estados.
  - Cumple: FR-012, FR-037.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

- [ ] T032 [P] [US6] Crear `src/components/ui/input.tsx`: label, ayuda, error y disabled; campo de 46–48 px; error con borde `status.danger`, ícono `warning-circle`, `aria-invalid`, `aria-errormessage` y mensaje en región `aria-live="polite"`; ayuda con `aria-describedby`; disabled con fondo canvas y borde punteado
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Input.
  - Cumple: FR-013.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

### Grupo 5C (después del grupo 5B)

- [ ] T033 [P] [US6] Crear `src/components/ui/amount-input.tsx` sobre `input.tsx`: `<input inputmode="numeric">` controlado sobre una cadena de 0 a 9 dígitos; formato `Intl.NumberFormat('es-CO')` sin decimales; al pegar conserva solo dígitos y, sin dígitos, no cambia; entrega `number | null` en **pesos enteros** sin aritmética de punto flotante ni conversión a unidades menores; reduce el tamaño con `clamp` hasta 28 px sin cortar
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Input de monto.
  - No crea tipos de dinero ni decide si `0` es válido (FR-003, FR-014; [data-model.md](data-model.md), «AmountValue»).
  - Cumple: FR-014, FR-013.
  - Terminado cuando: `npx vitest run src/components/ui/amount-input.test.tsx` pasa.

- [ ] T034 [P] [US6] Crear `src/components/ui/bottom-sheet.tsx` sobre `@radix-ui/react-dialog`: `role="dialog"`, foco atrapado, Escape, control de cierre (Button `ghost` con el texto «Cerrar» del catálogo), retorno del foco al disparador, `padding-bottom: env(safe-area-inset-bottom)`, aparición con el spring `sheet` y solo opacidad con movimiento reducido
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, BottomSheet; y `Juntia DS v1 - 04 Pantallas.dc.html`, la hoja de Anotar a 390 (solo la base: sin paradas ni arrastre).
  - **No** incluye paradas `peek`/`full`, arrastre ni confirmación de descarte (FR-031a).
  - Cumple: FR-031a, FR-041.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0. El comportamiento se prueba en T049.

- [ ] T035 [P] [US6] Crear `src/components/ui/modal.tsx` sobre `@radix-ui/react-dialog`: las mismas garantías que T034, como diálogo centrado de 520 px con scrim, aparición con escala .98 → 1 y solo opacidad con movimiento reducido; `role="dialog"`, nunca `alertdialog` en la 001
  - Claude Design: `Juntia DS v1 - 02 Componentes.dc.html`, secciones 02·1 Galería · Claro y 02·2 Galería · Oscuro, Modal; y `Juntia DS v1 - 04 Pantallas.dc.html`, el diálogo de Anotar de 520 px en escritorio (solo la base).
  - Cumple: FR-031, FR-031a.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0. El comportamiento se prueba en T049.

**Checkpoint**: `npx vitest run --project components` en verde. Sigue el PR B con la fase 6 (superficie interna).

---

## Phase 6: User Story 6 — Superficie interna de revisión (Priority: P2)

**Goal**: `/interno/primitivos`, disponible en desarrollo, CI y previews, y con 404 en producción y en cualquier alias (FR-049 a FR-053; research R4). Llega en B, con los primitivos que muestra, para que la revisión visual de los primitivos ocurra en su propio PR y la superficie entre en axe con el PR que la crea (FR-052).

**Independent Test**: la superficie se ve en `npm run dev`; `check:internal-surface` da los seis resultados esperados sobre un solo build; el job 5 falla si no la visita.

#### Grupo 6A (en serie: T036 → T037 → T038 → T039)

### Tests for User Story 6 (superficie) — por capas (`docs/TESTING.md` §4) ⚠️

- [ ] T036 [US6] Escribir `src/lib/internal-surface.test.ts` (`// @vitest-environment node`, proyecto `components`) — **capa: unidad de funciones puras, sin importar la página**
  - Claude Design: no necesita el comp: la superficie muestra primitivos ya construidos.
  - `isInternalSurfaceEnabled(env)`, con la tabla de [data-model.md](data-model.md) («InternalSurfaceGate»): `next dev` local → `true`; `next start` sin bandera → `false`; `JUNTIA_INTERNAL_SURFACE=1` → `true`; `VERCEL_ENV=preview` → `true`; `VERCEL_ENV=production` → `false`; producción con la bandera puesta por error → `false`; Vercel sin variables de sistema → `false`.
  - `isAllowedInternalHost(host, env)`: preview por su `VERCEL_URL` → `true`; por su `VERCEL_BRANCH_URL` con puerto y mayúsculas → `true`; alias al dominio de producción → `false`; alias a otro dominio (`www`) → `false`; sin cabecera `host` → `false`; preview sin variables de URL → `false`; fuera de un preview → `true`.
  - Cumple: FR-049, FR-053.
  - Terminado cuando: `npx vitest run src/lib/internal-surface.test.ts` **falla** porque el módulo no existe (salida pegada en el PR).

### Implementation for User Story 6 (superficie)

- [ ] T037 [US6] Crear `src/lib/internal-surface.ts` con `isInternalSurfaceEnabled` e `isAllowedInternalHost` exactamente como research R4 (cerrada por defecto; host normalizado en minúsculas, sin puerto ni punto final); **no** importa `server-only`
  - Claude Design: no necesita el comp: la superficie muestra primitivos ya construidos.
  - Cumple: FR-049, FR-053.
  - Terminado cuando: `npx vitest run src/lib/internal-surface.test.ts` pasa.

- [ ] T038 [US6] Crear `src/app/(internal)/interno/primitivos/page.tsx`: `import "server-only"`; `await connection()` de `next/server` al principio; `notFound()` si `isInternalSurfaceEnabled(process.env)` es `false` o si `isAllowedInternalHost((await headers()).get("host"), process.env)` es `false`; `metadata.robots = { index: false, follow: false }`; ningún enlace hacia ella desde la navegación
  - Claude Design: no necesita el comp: la superficie muestra primitivos ya construidos.
  - Mientras C no exista, el `notFound()` de la superficie cerrada muestra el «no encontrado» por defecto de Next; C lo sustituye por el diseñado (T059) sin tocar esta página. El código HTTP, que es lo que comprueban T039 y T040, es el mismo.
  - Fuera del AppShell, sin aviso de versión base. Un encabezado y una nota visibles, del catálogo (`internal`), la identifican como superficie interna con **valores de prueba**.
  - Muestra los nueve primitivos del paso 2 —AppIcon (cuatro pesos), Avatar (`person.1` y `person.2`), CategoryIcon (cuatro tamaños, diez categorías, tres formas, seleccionado), Badge (cinco estados), Button (cuatro variantes, tres tamaños, disabled y loading), Input (normal, con ayuda, con error, disabled), AmountInput (vacío, con 999.999.999, con error, importe largo), Segmented (`radiogroup` y `tablist`), Skeleton— en los dos temas **lado a lado**, anidando `data-theme="light"` y `data-theme="dark"`.
  - Valores solo de `COMPONENT_SPECIFICATIONS.md`; nunca el caso de octubre ni la tabla de DEC-G04; ningún valor presentado como dato financiero de una persona; no usa los tokens `finance.*` (FR-050).
  - Cumple: FR-017, FR-049, FR-050; US-6, escenario 7.
  - Terminado cuando: `npm run build` lista `ƒ /interno/primitivos` y `○` para las seis rutas de producto; `npm run dev` muestra la superficie en `http://localhost:3000/interno/primitivos`; `git grep -nE "412\.900|2\.840\.000|429\.900|3\.740\.000|229\.900|900\.000" -- src` no devuelve nada.

- [ ] T039 [US6] Crear `scripts/check-internal-surface.mjs`: sobre el build ya hecho, arranca `next start` en un puerto libre con cada entorno de la tabla de [contracts/ci.md](contracts/ci.md) y pide `/interno/primitivos` con la cabecera `Host` de cada fila; URLs de prueba ficticias fijadas en el script (nunca dominios reales); imprime una fila por caso con el código obtenido y el esperado; termina con exit 1 si alguno difiere
  - Claude Design: no necesita el comp: la superficie muestra primitivos ya construidos.
  - Los seis casos: producción + host de producción → 404; producción + URL de despliegue → 404; preview + URL de despliegue → 200; preview + URL de rama → 200; preview + host de producción (alias) → 404; sin variables + `localhost` → 404.
  - Funciona en Windows (Git Bash) y en Linux: Node puro, sin `curl` ni utilidades de shell.
  - Cumple: FR-053; SC-002.
  - Terminado cuando: `npm run build && npm run check:internal-surface` termina con exit 0 y seis filas correctas; **míralo fallar**: con la segunda barrera comentada temporalmente en `page.tsx`, el script termina con exit 1 en el caso del alias (las dos salidas se pegan en el PR y la barrera se restaura).

#### Grupo 6B (en serie: T040 → T041)

- [ ] T040 [US6] Añadir `/interno/primitivos` a la lista de `tests/a11y/routes.a11y.ts`, en los dos temas y los dos anchos: afirma **200**, que su encabezado de superficie interna es visible y que no hay violaciones `serious` o `critical`; **falla si no encuentra el encabezado** (FR-052)
  - **Movimiento reducido de los primitivos que no muestra ninguna ruta de producto** (ADR-011 §2, fila 17), con la emulación del proyecto y el mismo registro de 10 cuadros con `requestAnimationFrame`:
    - **Skeleton**: su pulso es estático: `getAnimations()` del elemento está vacío y su opacidad no cambia entre cuadros.
    - **Button**: con `pointerdown` sobre un Button `primary`, su rectángulo (`top`, `height`) no cambia entre cuadros: la pulsación no desplaza ni escala; el color puede cambiar (`COMPONENT_SPECIFICATIONS.md` §Button, «Motion»).
  - No es una prueba RTL ni una spec E2E: no contradice FR-045 ni FR-047.
  - Claude Design: no necesita el comp: es una prueba de accesibilidad y movimiento sobre la superficie ya construida.
  - Cumple: FR-012, FR-016, FR-040, FR-051, FR-052; SC-002, SC-010.
  - Terminado cuando: `npm run build && npm run test:a11y` termina con exit 0 con las 4 combinaciones de tema y ancho para `/` y `/interno/primitivos`; **míralo fallar**: con `JUNTIA_INTERNAL_SURFACE` quitado temporalmente del `webServer` de `playwright.config.ts`, la prueba falla en la superficie; con `reducedMotion: 'no-preference'`, fallan las aserciones de Skeleton y Button; se pegan las salidas y se restaura la configuración.

- [ ] T041 [US7] Añadir `npm run check:internal-surface` al job 5 de `.github/workflows/ci.yml`, en el mismo paso que `npm run check:theme-script` (`npm run check:internal-surface && npm run check:theme-script`), y retirar del resumen del job 1 la fila «Superficie interna — NO APLICABLE»
  - Claude Design: no necesita el comp: es configuración de CI.
  - Cumple: FR-043, FR-053; SC-009.
  - Terminado cuando: en el PR B, el run muestra el job 5 con las dos comprobaciones y el resumen ya sin filas de la 001 no aplicables (enlace pegado en el PR).

**Checkpoint**: `npm run verify`, `npm run test:a11y`, `npm run check:theme-script` y `npm run check:internal-surface` en verde en local y en el PR. Fin del punto de control **B**.

---

## Phase 7: User Stories 1 y 4 — Navegación de cada ancho y selector Yo/Nosotros (Priority: P1 y P2)

**Goal**: el AppShell responsive con sus destinos, el acceso mínimo a Mi cuenta y el selector que recuerda el contexto, sin Context Transition.

**Independent Test**: abrir la app a 360, 390, 430, 768, 1024, 1280 y 1440 px en los dos temas y recorrer cada destino con toque y teclado (US1); cambiar el contexto con clic y flechas, recargar y navegar (US4).

### Tests for User Story 4 — por capas (`docs/TESTING.md` §4) ⚠️

(T042 está en el grupo 7A.)

### Grupo 7A

- [ ] T042 [P] [US4] Escribir `src/components/shell/context-selector.test.tsx` — **capa: componente (Vitest + RTL + user-event)**
  - Claude Design: no necesita el comp: se deriva de la spec y del contrato, no de la pantalla.
  - Renderiza `<ContextProvider><ContextSelector /></ContextProvider>` y afirma: sin valor guardado está seleccionada «Yo» (`role="radio"`, `aria-checked`); al hacer clic en «Nosotros» queda seleccionada y la región viva dice «Ahora ves: Nosotros»; las flechas ←/→ cambian la opción; `localStorage['juntia:context']` pasa a `"us"`; al desmontar y volver a montar, arranca en «Nosotros»; con un valor ilegible guardado arranca en «Yo» y no lo reescribe hasta que la persona elige; con `localStorage.getItem` y `setItem` lanzando `SecurityError`, arranca en «Yo», cambia durante la visita y no lanza; tres cambios seguidos dejan guardado el último; un nodo de contenido renderizado junto al selector **no cambia** al cambiar el contexto (sin Context Transition).
  - Cumple: FR-025 (opciones), FR-026, FR-027; SC-007; US-4, escenarios 1, 2 y 5; casos límite «Cambios rápidos del selector» y «Valor del contexto recordado ilegible o ausente».
  - Terminado cuando: `npx vitest run src/components/shell/context-selector.test.tsx` **falla** porque el componente no existe (salida pegada en el PR).

### Implementation for User Stories 1 y 4

#### Grupo 7A (continúa)

- [ ] T043 [P] [US1] Crear `src/components/shell/nav-destinations.ts`: el arreglo tipado de [data-model.md](data-model.md) («NavDestination») con `id`, `href`, `icon`, `label` (clave del catálogo) y `desktopOnly` (`true` solo para Balance): `home` `/` `house-simple`, `activity` `/actividad` `receipt`, `goals` `/metas` `flag-banner`, `plan` `/plan` `chart-pie-slice`, `balance` `/balance` `scales`; y la función de destino actual (coincidencia exacta para `/`, por prefijo para las demás)
  - Claude Design: no necesita el comp: datos de `data-model.md` y `DESIGN_SYSTEM.md` §3.
  - Mi cuenta y Anotar **no** están en el arreglo (data-model).
  - Cumple: FR-019, FR-021.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

- [ ] T044 [P] [US4] Crear `src/lib/context-preference.ts`: lectura y escritura de `localStorage['juntia:context']` con valores `"me" | "us"` dentro de `try/catch`; suscripción para `useSyncExternalStore` con `"me"` como instantánea de servidor; un valor ilegible o ausente se lee como `"me"` y no se reescribe
  - Claude Design: no necesita el comp: se deriva de la spec y del contrato, no de la pantalla.
  - Es una preferencia de interfaz: no usa `scope` ni sus literales propuestos (FR-036; `docs/GLOSSARY.md` §10).
  - Cumple: FR-026 (research R5).
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0. Se prueba a través de T042.

- [ ] T045 [US1] Crear las páginas de destino con solo su encabezado del catálogo, sin `<main>` propio (lo pone el layout de T048): actualizar `src/app/(app)/page.tsx` (Inicio), quitando el `<main>` de T006, y crear `src/app/(app)/actividad/page.tsx`, `src/app/(app)/metas/page.tsx`, `src/app/(app)/plan/page.tsx`, `src/app/(app)/balance/page.tsx` y `src/app/(app)/cuenta/page.tsx`
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, 04·1 (encabezado de Inicio a 390) y 04·7 (cabecera del contenido a 1440), solo el encabezado.
  - No se crean `/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad` ni `/cuenta/seguridad` (caso límite de la spec). Los estados provisionales los añade la fase 6.
  - Cumple: FR-019, FR-032, FR-033 (las rutas existen).
  - Terminado cuando: `npm run build` lista `○` para `/`, `/actividad`, `/metas`, `/plan`, `/balance` y `/cuenta`, y ninguna otra ruta de producto.

#### Grupo 7B (después del grupo 7A)

- [ ] T046 [US4] Crear `src/components/shell/context-selector.tsx`, que exporta `ContextProvider` (estado compartido con `useSyncExternalStore` sobre `context-preference.ts` y **una única** región `aria-live="polite"` para el anuncio) y `ContextSelector` (Segmented en modo `radiogroup` con «Yo» y «Nosotros» del catálogo)
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, 04·1 y 04·7: el segmentado de contexto en el encabezado móvil y en el sidebar.
  - La posición inicial de la perilla sale del atributo `data-context` de `<html>` por CSS, para que la primera pintura sea la correcta y la perilla no se deslice al cargar (research R5). El contenido no cambia al cambiar el contexto (FR-027).
  - Cumple: FR-025, FR-026, FR-027.
  - Terminado cuando: `npx vitest run src/components/shell/context-selector.test.tsx` pasa.

#### Grupo 7C (después de T046)

- [ ] T047 [US1] Crear `src/components/shell/app-shell.tsx`: **un** componente con tres composiciones por CSS (`md`, `lg`, `xl`), no tres árboles
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, 04·1 (barra a 390), 04·5 (barra en oscuro), 04·7 y 04·8 (sidebar de 1440 en claro y oscuro) y 04·9 (360 a 1280, con el rail de 1024 y la barra centrada de 768).
  - **< 1024 px**: barra inferior flotante con Inicio · Actividad · Anotar · Metas · Plan; Anotar integrado al centro, 54×54, a ras de la barra (no elevado); entre 768 y 1023, centrada con ancho máximo de 560 px; piezas de 46–56 px; `padding-bottom: env(safe-area-inset-bottom)`; Balance **no** aparece. Con texto al 200 %, la barra oculta las etiquetas y conserva el nombre accesible.
  - **1024–1279 px**: sin barra inferior; rail de 76 px con los cinco destinos (Balance incluido), Anotar al final del rail y Mi cuenta al pie; sin popover desde el rail.
  - **≥ 1280 px**: sidebar de 248 px con la marca «Juntia», el `ContextSelector` bajo la marca, los cinco destinos de 46 px, Anotar como bloque fijo con el atajo `N` visible y Mi cuenta al pie; **sin control de tema**.
  - **Selector por debajo de 1280 px** (también a 1024): arriba a la derecha del contenido, en los destinos principales y en Balance; no en `/cuenta` móvil.
  - **Mi cuenta**: a la izquierda del encabezado de Inicio, Actividad, Metas y Plan en móvil y tablet; al pie del rail y del sidebar; `AppIcon` `user-circle` con nombre accesible «Mi cuenta», un toque, sin menú, sin avatar, sin nombre de persona ni estado de pareja (decisión 8; la anatomía de `AccountButton` es propuesta §15.9 sin aprobar).
  - **`/cuenta`**: en móvil, pantalla apilada sin barra inferior y con control «Volver» (`caret-left`); en escritorio, dentro del shell con Mi cuenta marcado como actual.
  - **Destino actual**: ícono `fill` sobre ficha y `aria-current="page"`; inactivos con ícono `regular`.
  - **Accesibilidad**: «Ir al contenido» es el primer enfocable y apunta a `#contenido`; `<nav aria-label>` con texto del catálogo; foco visible de 2 px con offset de 2 px en los dos temas; objetivos táctiles ≥ 44×44.
  - **Composición propia por ancho**: a 1440 px el contenido es editorial y limitado, no la vista móvil ampliada (`RESPONSIVE_SPECIFICATIONS.md`, 2xl).
  - Anotar se renderiza como botón en cada composición; lo conecta al aviso T058.
  - Cumple: FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025 (ubicación), FR-033 (composición), FR-037, FR-038, FR-039, FR-041; US-1, escenarios 1–6; US-4, escenarios 3 y 4.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0; `npm run dev` muestra las tres composiciones al cambiar el ancho (la comprobación por ancho y tema es T065 y T068).

#### Grupo 7D (después de T047)

- [ ] T048 [US1] Crear `src/app/(app)/layout.tsx`: envuelve `children` en `<ContextProvider>` y `<AppShell>`, con `<main id="contenido">` como destino del enlace de salto
  - Claude Design: no necesita el comp: es el ensamblaje del layout.
  - Cumple: FR-018, FR-022, FR-025.
  - Terminado cuando: `npm run build` termina con exit 0 y en `npm run dev` las seis rutas de T045 se ven dentro del shell; el contexto elegido se conserva al navegar y al recargar.

**Checkpoint**: US1 y US4 navegables en `npm run dev`. Comienza el punto de control **C** (PR C, fases 7–9).

---

## Phase 8: User Stories 2 y 3 — Comportamiento provisional y aviso de Anotar (Priority: P1)

**Goal**: «lo que todavía no existe dice que no existe» (maestro §15.10): aviso de versión base, estados vacíos sin cifras, Balance no disponible, `/cuenta` mínima y el aviso de Anotar en su contenedor real.

**Independent Test**: recorrer todas las rutas de producto en los dos temas sin encontrar cifras y con el aviso visible (US2); activar Anotar con toque, clic, Enter y `N`, cerrarlo con Escape y con su control y ver el foco volver (US3).

### Tests for User Stories 2 y 3 — por capas (`docs/TESTING.md` §4) ⚠️

#### Grupo 8A

- [ ] T049 [P] [US3] Escribir `src/components/shell/annotate-notice.test.tsx` — **capa: componente (Vitest + RTL + user-event)**, con `window.matchMedia` simulado para los dos contenedores
  - Claude Design: no necesita el comp: se deriva de la spec y del contrato, no de la pantalla.
  - Afirma: al activar el disparador se abre un elemento con `role="dialog"` (no `alertdialog`) con el título y el cuerpo del catálogo; dentro **no** hay `textbox`, `spinbutton`, `combobox` ni botón de guardar; con el foco en el cuerpo del documento, `N` abre el mismo aviso; con el foco en un `<input>`, `N` escribe la letra y no lo abre; con el aviso abierto, `N` no abre otro (un solo `dialog`); Escape lo cierra y el foco vuelve al disparador; «Cerrar» lo cierra y el foco vuelve al disparador; Tab no saca el foco del aviso; abierto con `N`, al cerrarlo el foco vuelve al elemento enfocado antes; con `min-width: 768px` falso se usa la hoja y con verdadero el diálogo.
  - Cumple: FR-031, FR-031a; US-3, escenarios 1–4; caso límite «`N` mientras se escribe».
  - Terminado cuando: `npx vitest run src/components/shell/annotate-notice.test.tsx` **falla** porque el componente no existe (salida pegada en el PR).

- [ ] T050 [US2] Escribir `src/app/(app)/product-routes.test.tsx` — **capa: componente (Vitest + RTL)**, con `next/navigation` simulado (`usePathname`)
  - Claude Design: no necesita el comp: se deriva de la spec y del contrato, no de la pantalla.
  - Para cada ruta de producto (`/`, `/actividad`, `/metas`, `/plan`, `/balance`, `/cuenta`), renderiza su página dentro del layout de `(app)` y afirma que ni el texto visible (`textContent`) ni los nombres accesibles (`aria-label`, `aria-description`, `title`, `alt`) contienen dígitos, «$», «%», «Al día» ni «le debe» (sin distinguir mayúsculas).
  - En la misma pasada, afirma que cada ruta muestra el **aviso de versión base**: su texto del catálogo (`copy.shell…`) es visible y no hay ningún control para cerrarlo dentro del aviso.
  - No importa ningún módulo con `server-only`.
  - Cumple: FR-028, FR-029; SC-004; US-2, escenarios 1 y 3.
  - Terminado cuando: **míralo fallar**: con una cadena temporal «$0» añadida al texto del estado vacío de Inicio en `src/lib/copy/es.ts`, `npx vitest run "src/app/(app)/product-routes.test.tsx"` falla en `/`; se retira la cadena y la prueba pasa. La aserción del aviso falla mientras T057 no está hecha. Las salidas se pegan en el PR, y la prueba se vuelve a ejecutar tras T059.

### Implementation for User Stories 2 y 3

#### Grupo 8A (continúa)

- [ ] T051 [P] [US2] Crear `src/components/shell/base-version-notice.tsx`: aviso visible de que esta versión todavía no guarda datos, **sin control de cierre**, compuesto con primitivos aprobados (`AppIcon`, tokens); **no** usa `LimitNote` (propuesta §15.9 sin aprobar)
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, si dibuja un aviso equivalente; no verificado. Si no existe, se compone con primitivos aprobados y se aprueba en la revisión del PR.
  - Cumple: FR-028, FR-034.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

- [ ] T052 [P] [US2] Crear `src/components/shell/provisional-state.tsx` con `EmptyState` (ícono Duotone en ficha con la geometría de `CategoryIcon`, título y texto útil del catálogo, **sin botones** que aparenten funcionar) y `UnavailableState` (todavía no disponible y qué lo trae, sin cifras)
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, los estados vacíos de Inicio, Actividad, Metas y Plan si el comp los dibuja; no verificado. Si no existen, ídem.
  - Sin ilustraciones de stock (handoff §Auditoría anti-slop).
  - Cumple: FR-030, FR-032, FR-033.
  - Terminado cuando: `npx tsc --noEmit` y `npm run lint` terminan con exit 0.

#### Grupo 8B (después del grupo 8A)

- [ ] T053 [US2] Añadir el `EmptyState` de cada destino a `src/app/(app)/page.tsx`, `src/app/(app)/actividad/page.tsx`, `src/app/(app)/metas/page.tsx` y `src/app/(app)/plan/page.tsx`
  - Claude Design: el mismo bloque que T052.
  - Metas sin «Crear meta»; Plan sin «Crear presupuesto» y sin sugerir que el presupuesto sea obligatorio (DEC-R01; US-13). Ningún dato de ejemplo (decisión 9).
  - Cumple: FR-029, FR-030; US-2, escenario 2.
  - Terminado cuando: `npm run build` termina con exit 0 y las cuatro rutas siguen en `○`.

- [ ] T054 [US2] Añadir a `src/app/(app)/balance/page.tsx` el `UnavailableState` que explica que el balance aparece cuando exista la pareja; nunca «Al día» ni una cifra; no usa `SharedBalance`
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, Balance de escritorio, solo como referencia de composición (no se usa `SharedBalance`).
  - Abierto por URL en móvil muestra el mismo estado y la barra no gana un sexto destino (caso límite).
  - Cumple: FR-029, FR-032; US-2, escenario 4.
  - Terminado cuando: `npm run build` termina con exit 0.

- [ ] T055 [US2] Añadir a `src/app/(app)/cuenta/page.tsx` el mensaje de que la cuenta llega con el inicio de sesión; no implementa ningún componente de la sección Cuenta (propuesta §15.9)
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, la pantalla de Mi cuenta en móvil y escritorio, solo para el encabezado apilado y «Volver»; no se implementa su anatomía (propuesta §15.9).
  - Cumple: FR-029, FR-033; US-2, escenario 5.
  - Terminado cuando: `npm run build` termina con exit 0.

- [ ] T056 [P] [US3] Crear `src/components/shell/annotate-notice.tsx`, que exporta `AnnotateProvider` y `AnnotateNotice`: estado `open` y `returnFocusTo` ([data-model.md](data-model.md), «AnnotateNoticeState»); contenedor `BottomSheet` por debajo de 768 px y `Modal` desde 768 px según `matchMedia('(min-width: 768px)')`, que cambia de contenedor **sin cerrarse** y conserva el foco dentro si el ancho cruza 768; listener de `N` en `document` que ignora `input`, `textarea`, `select`, `contenteditable` y el caso de aviso ya abierto; contenido del catálogo, sin campos
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, la hoja de Anotar a 390 y el diálogo de 520 px, solo contenedor y título: el aviso no tiene campos.
  - Cumple: FR-031, FR-031a; caso límite «Cambio de ancho con el aviso abierto».
  - Terminado cuando: `npx vitest run src/components/shell/annotate-notice.test.tsx` pasa.

#### Grupo 8C (después del grupo 8B)

- [ ] T057 [US2] Incluir `<BaseVersionNotice />` en `src/components/shell/app-shell.tsx`, visible en todas las rutas que usan el shell
  - Claude Design: el mismo bloque que T051.
  - Cumple: FR-028; US-2, escenario 1.
  - Terminado cuando: en `npm run dev` el aviso aparece en las seis rutas de producto, a 390 y a 1440 px.

- [ ] T058 [US3] Conectar los disparadores de Anotar de `src/components/shell/app-shell.tsx` (centro de la barra, final del rail, bloque del sidebar con la pista `N`) al `AnnotateProvider`, y montar `<AnnotateProvider>` en `src/app/(app)/layout.tsx`
  - Claude Design: `Juntia DS v1 - 04 Pantallas.dc.html`, 04·1, 04·7 y 04·9: la posición de Anotar en la barra, el rail y el sidebar.
  - Cumple: FR-020, FR-031; US-3, escenarios 1, 2 y 5.
  - Terminado cuando: `npx vitest run --project components` pasa y en `npm run dev` Anotar abre la hoja a 390 px y el diálogo a 1440 px.

#### Grupo 8D (después de T057 y T058)

- [ ] T059 [US2] Crear `src/app/not-found.tsx` y `src/app/(app)/error.tsx`: estados de «no encontrado» y de error **dentro del AppShell**, con el aviso de versión base y salida hacia Inicio; sin mensaje técnico crudo
  - Claude Design: no necesita el comp: estado nuevo de la 001; se compone con `EmptyState` y se aprueba en la revisión del PR.
  - `not-found.tsx` está fuera del grupo `(app)`, así que monta él mismo `ContextProvider`, `AnnotateProvider` y `AppShell` (research R6). Es también lo que ve una visita a `/interno/primitivos` cerrada.
  - Cumple: FR-028; casos límite «Ruta inexistente o error de render» y «Rutas de Mi cuenta que todavía no existen».
  - Terminado cuando: `npm run build` termina con exit 0; con `npm run start`, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/cuenta/perfil` imprime `404`; `npx vitest run "src/app/(app)/product-routes.test.tsx"` pasa.

**Checkpoint**: `npx vitest run --project components` en verde; US2 y US3 demostrables.

---

## Phase 9: User Story 7 — axe de las rutas de producto (Priority: P3)

**Goal**: las rutas de producto entran en la comprobación con el PR que las crea (`docs/TESTING.md` §3), con las aserciones de movimiento reducido de los componentes del shell (ADR-011 §2, fila 17). El job 5 ya existe desde A y no cambia.

**Independent Test**: `npm run build && npm run test:a11y` en verde con las 8 URL.

#### Grupo 9A

- [ ] T060 [US7] Añadir a la lista de `tests/a11y/routes.a11y.ts` las rutas de producto que crea C —`/actividad`, `/metas`, `/plan`, `/balance` y `/cuenta`— y una URL inexistente, para la que afirma **404** y el estado de «no encontrado» diseñado (T059) en lugar de 200
  - Claude Design: no necesita el comp: es una prueba de accesibilidad y movimiento sobre las rutas ya construidas.
  - **Movimiento reducido de los componentes del shell** (ADR-011 §2, fila 17), con la emulación del proyecto, en cada ruta de producto donde está el selector y en los dos anchos, después de axe y con el registro de 10 cuadros de T021:
    - **Perilla del Segmented**: dentro de un único `page.evaluate`, activa «Nosotros» y registra la posición horizontal de la perilla (`getBoundingClientRect().x`) en cada `requestAnimationFrame`; afirma que **el primer cuadro registrado ya es la posición final**. Se vuelve a «Yo» al terminar, para no contaminar la ruta siguiente.
    - **Aviso de Anotar**: abre el aviso con su disparador visible y afirma que el rectángulo del diálogo o de la hoja (`top`, `left`, `width`, `height`) **no cambia entre cuadros**: no hay desplazamiento ni escala; la opacidad puede cambiar. Lo cierra con Escape.
  - La transición de tema de T021 ya se comprueba en cada ruta de la lista. No es una spec E2E: no recorre nada, mide la ruta que ya visita (ADR-011 §2, filas 16 y 17).
  - Cumple: FR-040, FR-043; SC-002, SC-010; ADR-011 §2, filas 16 y 17.
  - Terminado cuando: `npm run build && npm run test:a11y` termina con exit 0 con las 4 combinaciones de tema y ancho para las 8 URL; **míralo fallar**: con `reducedMotion: 'no-preference'` puesto temporalmente en `playwright.config.ts`, las aserciones de la perilla y del aviso fallan; se pega esa salida y se restaura la configuración.

**Checkpoint**: `npm run verify`, `npm run test:a11y`, `npm run check:theme-script` y `npm run check:internal-surface` en verde en local y en el PR. Fin del punto de control **C**.

---

## Phase 10: Verificación, `[V]` y evidencia — PR D

**Purpose**: el PR D es el de **verificación y cierre de la 001**: ejecuta lo que comprueba lo construido, mide, pasa la revisión humana y corrige lo que salga de ahí. **Ninguna de estas tareas se cierra con una afirmación** (`AGENTS.md` 12; maestro §15.9, `[V]`). Las que necesitan una persona, un dispositivo o una cuenta lo dicen: Codex prepara la comprobación, la persona la ejecuta y la salida se pega igual.

**Dónde va la evidencia.** En esta fase, «pegar en el PR» significa pegar en la sección de la tarea en `specs/001-frontend-foundation/evidence.md` (T061), que el PR D enlaza. Cada PR anterior llevó ya su propia evidencia (ver «Cuatro PR de implementación»).

Todas empiezan cuando termina la fase 9.

### Grupo 10A — sobre el checkout, en serie

Construyen, sirven, prueban o modifican archivos del checkout: se ejecutan una detrás de otra, en este orden.

- [ ] T061 Crear `specs/001-frontend-foundation/evidence.md`: una sección por cada tarea de esta fase (ID y título), con la fecha, el commit sobre el que se ejecutó, el comando o el procedimiento, y la salida real o «pendiente: motivo»
  - Ninguna sección dice «verificado» sin salida (`AGENTS.md` 12). Las capturas se guardan junto al archivo, en `specs/001-frontend-foundation/evidence/`, nombradas por ruta, ancho y tema.
  - Cumple: SC-001, SC-002, SC-003, SC-005, SC-006, SC-009.
  - Terminado cuando: el archivo existe con una sección por tarea de la fase 10, cada una vacía o «pendiente», y el PR D lo enlaza.

- [ ] T062 Instalación limpia y `verify` sobre `package.json`, `package-lock.json` y `scripts/verify.mjs`: borrar `node_modules`, ejecutar `npm ci` y `npm run verify`, y pegar las dos salidas completas en el PR
  - Es la **primera medición real de los presupuestos** (`[V]` 1 de ADR-011): se reporta y no bloquea; si un tiempo supera su techo, se dice y el techo no se toca (cláusula anticliquet).
  - Cumple: FR-001, FR-042, FR-046; SC-009.
  - Terminado cuando: las dos salidas están en el PR y la tabla de `verify` muestra `domain` como «0 pruebas…» y `SQL/RLS` como «NO APLICABLE…».

- [ ] T063 Build, axe, superficie interna y script de tema sobre `src/app/`: ejecutar `npm run build`, `npm run test:a11y`, `npm run check:internal-surface` y `npm run check:theme-script`, y pegar las cuatro salidas
  - La tabla de rutas del build debe mostrar `○` para las seis rutas de producto y `ƒ /interno/primitivos`, y ninguna de las cinco rutas de `/cuenta/*` que no existen.
  - Cumple: FR-005, FR-040, FR-051, FR-052, FR-053; SC-002, SC-006.
  - Terminado cuando: las cuatro salidas están en el PR, con cero violaciones serias o críticas, las aserciones de movimiento reducido en verde, los seis casos de `check:internal-surface` correctos y todas las comprobaciones de `check:theme-script` correctas.

- [ ] T064 `[V]` `vitest --changed` en el bucle local (`[V]` 6 de ADR-011): modificar `src/components/ui/amount-input.tsx` sin hacer commit, ejecutar `npx vitest run --changed` y pegar qué pruebas ejecutó; revertir el cambio
  - Cumple: FR-042 (bucle local de `docs/TESTING.md` §2).
  - Terminado cuando: la salida está en el PR, o «no funciona» con la salida que lo muestra.

- [ ] T065 `[V]` Umbrales del maestro §15.7 que aplican a la 001, sobre `npm run build` servido con `npm run start` y `JUNTIA_INTERNAL_SURFACE=1`
  - **Primer cuadro y CLS** (SC-006): reutilizar el arnés de research R2 (CPU 6×, red de 400 kbit/s y 400 ms, `Page.startScreencast`, píxel del lienzo) en las seis rutas de producto en claro y oscuro: ningún cuadro con el tema contrario; CLS = 0 en la carga de cada ruta (PerformanceObserver `layout-shift`).
  - **INP al abrir Anotar** (SC-005): medido en laboratorio a 390 y 1440 px y **reportado como laboratorio, no como p75 real**; < 200 ms.
  - **Scroll horizontal** (FR-039, SC-001): en cada ruta de producto y en `/interno/primitivos`, a 360, 390, 430, 1024 y 1440 px y en los dos temas, `document.documentElement.scrollWidth <= clientWidth`.
  - **Objetivos táctiles** (FR-037, SC-003): a 390 y 1440 px, ningún elemento interactivo visible mide menos de 44×44 px (y las piezas de la barra, 46–56).
  - Los scripts de medición van **fuera de la suite** (plan, «Pruebas por capa»: medición del PR): en un archivo fuera del repositorio o pegados en el PR; no se añaden a `tests/`.
  - Cumple: FR-037, FR-039; SC-001, SC-003, SC-005, SC-006.
  - Terminado cuando: el PR tiene la salida de cada medición por ruta, tema y ancho, o el umbral que no se cumple con su número real.

- [ ] T066 `[V]` Ícono `scales` de Phosphor para Balance (`docs/design/README.md`, Log de cambios): captura del rail a 1024 px y del sidebar a 1440 px, lado a lado con el comp de `docs/design/screenshots/`
  - Cumple: FR-019.
  - Terminado cuando: las capturas están en el PR con la observación «coincide» o la diferencia que se vea; la decisión es del revisor.

- [ ] T067 Recorrido manual de [quickstart.md](quickstart.md) §5 con `npm run dev`, pegando una línea de resultado por punto
  - Teclado completo («Ir al contenido» primero, destinos con `aria-current`, foco visible siempre); Anotar con toque, clic, Enter y `N`, hoja por debajo de 768 y diálogo de 520 desde 768, cruzar 768 con el aviso abierto; selector con recarga y navegación, perilla que se desliza y que salta con movimiento reducido; cambio del tema del sistema con la app abierta (180 ms; instantáneo con movimiento reducido); texto al 200 %; safe areas en un iPhone o su emulación; Balance abierto por URL en móvil; segmented en modo `tablist` con flechas en la superficie interna; Skeleton que aparece solo pasados 300 ms; Button en carga sin salto de ancho.
  - Todo con movimiento reducido emulado y sin él, con el mismo resultado final (SC-010).
  - También: Anotar a un toque en cada composición, destino actual con ícono Fill, acceso a Mi cuenta en cada ancho y aviso de versión base en cada ruta.
  - Cumple: FR-012, FR-015, FR-016, FR-020, FR-021, FR-022, FR-023, FR-028, FR-031, FR-038, FR-039, FR-040, FR-041; SC-010.
  - Terminado cuando: el PR lleva el resultado de cada punto; un punto que falla se arregla o se reporta, nunca se omite.

- [ ] T068 Capturas reales para el gate visual (ADR-011 §7) de las seis rutas de producto, el estado de «no encontrado» y `/interno/primitivos`, a 390 y 1440 px en claro y oscuro; más una pasada a 360, 430, 768, 1024 y 1280 px con captura de lo que se vea distinto (incluido el rail de 1024 en oscuro, que el comp no dibuja)
  - Las capturas permiten aprobar viendo la pantalla las **propuestas §15.9 de paleta** (Sara petróleo, Hogar azul tenue, superficie oscura `#191C1F`). La de «gasto, ingreso y liquidación en tinta» **no** se aprueba aquí: pasa a P0-1 (plan, comprobación de jerarquía).
  - Cumple: FR-009, FR-010, FR-011, FR-016, FR-018, FR-024, FR-030, FR-051; SC-001.
  - Terminado cuando: las capturas están adjuntas al PR, nombradas por ruta, ancho y tema.

### Grupo 10B — solo lectura, sin servidor ni puertos

- [ ] T069 [P] Lista de las pruebas añadidas, por nombre (`docs/TESTING.md` §7): pegar en el PR la salida de `npx vitest list` y de `npx playwright test --list --project a11y`, y comprobar que coinciden con la tabla de conservadas del [Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4-f7-4-punto-2): ninguna de más ni de menos
  - Si la implementación necesita una prueba que no está en el anexo, se detiene y se plantea; no se añade en silencio.
  - Cumple: FR-045, FR-047.
  - Terminado cuando: las dos listas están en el PR con la declaración «specs E2E añadidas: 0».

- [ ] T070 [P] Comprobaciones de alcance y de copy sobre `package.json`, `src/` y `tests/`, con la salida de cada comando pegada en el PR
  - `npm ls --depth=0` sin `@supabase/*`, `@tanstack/*`, `react-hook-form`, `zod`, `next-intl`, `react-i18next`, `next-themes`, `vaul`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@vitejs/plugin-react`, `@testing-library/jest-dom`, `eslint-plugin-playwright`, `stylelint`.
  - `ls supabase tests/e2e public/manifest.json` → no existen; `git ls-files "*.spec.ts"` → vacío.
  - `git grep -nE "P0-[0-9]" -- src` → vacío (FR-034).
  - `git grep -nE "person-?[3-6]" -- src` → vacío (FR-004).
  - `git grep -nE "412\.900|2\.840\.000|429\.900|3\.740\.000|229\.900|900\.000" -- src tests` → vacío (FR-017, FR-050).
  - `git grep -nE "localStorage" -- src` → solo `src/lib/context-preference.ts` y `src/lib/theme-script.ts` (FR-005: el tema no se guarda).
  - Revisión del catálogo contra `docs/GLOSSARY.md` §9 y `BRAND_FOUNDATION.md` §4 (FR-036): no es un grep, porque un sinónimo igual de malo lo pasaría (`docs/TESTING.md` §6); se lista en el PR para la revisión humana.
  - Cumple: FR-002, FR-004, FR-005, FR-017, FR-034, FR-036, FR-047, FR-048, FR-050; SC-004.
  - Terminado cuando: cada comando y su salida están en el PR.

- [ ] T071 [P] `[V]` Licencias de Instrument Serif, Geist y Geist Mono (maestro §6.1; spec, supuesto «Fuentes»), usadas en `src/app/layout.tsx`: pegar la licencia de cada familia con la URL oficial de donde sale
  - Cumple: FR-007.
  - Terminado cuando: las tres licencias y sus fuentes están en el PR.

- [ ] T072 [P] `[V]` **Requiere el proyecto de Vercel, que hoy no existe** (research R4, «Lo que esto no prueba»). Superficie interna en un preview real sobre `src/app/(internal)/interno/primitivos/page.tsx`: con un preview del PR, pedir `/interno/primitivos` por la URL de despliegue (200), por la URL de rama (200) y por un alias (404); comprobar si `VERCEL_URL` coincide con el host bajo Deployment Protection (con `vercel curl` o el bypass de la protección); y que en producción responde 404
  - Crear o enlazar el proyecto de Vercel, asignar un alias o desplegar en producción son acciones de los fundadores: Codex **no** las hace por su cuenta; si el proyecto no existe, la tarea queda «pendiente: no existe proyecto de Vercel» y se dice así en el PR. **Nunca** se asigna el dominio de producción con `vercel alias` a un preview (quickstart, «Restricción operativa»).
  - Cumple: FR-049, FR-053.
  - Terminado cuando: el PR tiene los códigos HTTP reales de cada caso y la observación sobre `VERCEL_URL`, o «pendiente» con el motivo.

### Grupo 10C — necesitan una persona con dispositivo

Las ejecuta una persona contra un servidor propio o un preview; no se lanzan en paralelo con el grupo 10A sobre el mismo checkout.

- [ ] T073 `[V]` **Requiere persona con dispositivo.** Contraste de los pares texto/fondo del shell en los dos temas en dispositivos reales (`DESIGN_SYSTEM.md` §4), sobre `src/styles/tokens.css`: Codex prepara la lista de pares y la ruta de cada uno; los fundadores miden y la salida (herramienta, dispositivo, valores) se pega
  - Cumple: FR-004, FR-038 (foco ≥ 3:1).
  - Terminado cuando: el PR tiene los valores medidos o «pendiente: no se ejecutó» con el motivo. Nunca «verificado» sin valores.

- [ ] T074 `[V]` **Requiere persona con dispositivo.** Rendimiento de las sombras táctiles de la barra inferior y de los botones en un móvil de gama media (`DESIGN_SYSTEM.md` §4), sobre `src/components/shell/app-shell.tsx` y `src/components/ui/button.tsx`
  - Cumple: FR-012, FR-018.
  - Terminado cuando: el PR tiene el dispositivo y la observación (o una traza de rendimiento), o «pendiente» con el motivo.

- [ ] T075 `[V]` **Requiere persona con dispositivo.** VoiceOver (iOS) y TalkBack (Android) sobre el shell (handoff §Accesibilidad): «Ir al contenido», navegación con nombre, `aria-current`, anuncio «Ahora ves: Nosotros», aviso de Anotar (apertura, cierre, retorno del foco) y error de AmountInput en la superficie interna
  - Cumple: FR-013, FR-022, FR-027, FR-031.
  - Terminado cuando: el PR tiene lo que anunció cada lector, por punto, o «pendiente» con el motivo.

### Grupo 10D — cierre

- [ ] T076 Ejecución real del CI en el PR D (`.github/workflows/ci.yml`): pegar el enlace del run y el resumen de cada job
  - Comprobar y pegar: los tres jobs corrieron en paralelo; el job 5 ejecutó `test:a11y`, `check:internal-surface` y `check:theme-script`; el resumen del job 1 nombra los jobs 3 y 4 como no aplicables y ya no tiene filas de la 001 no aplicables; cada job publica su duración y la de cada comando contra el presupuesto. La demostración de fallo del job 1 ya se hizo en el PR A (T023).
  - Cumple: FR-043, FR-046; SC-009; US-7, escenarios 1–4.
  - Terminado cuando: el PR D lleva el enlace del run y los resúmenes pegados.

- [ ] T077 Aplicar en el PR D las correcciones de código que salgan de la verificación de esta fase: cada corrección cita la tarea que detectó el fallo, se vuelve a ejecutar esa tarea y su sección de `evidence.md` se actualiza con la salida nueva
  - **Agente:** una corrección que toca composición visual o anatomía de un primitivo necesita el comp y la hace **Claude Code**, consultando la sección de Claude Design que nombra la tarea de B o C que construyó ese archivo; el resto, Codex o Claude Code.
  - Una corrección que cambiaría alcance, aprobaría una propuesta §15.9 o movería un presupuesto se detiene y se reporta: no se resuelve en este PR (`AGENTS.md` 17; cláusula anticliquet).
  - Si la verificación no encuentra nada que corregir, la tarea se cierra con «sin correcciones» en `evidence.md`.
  - Cumple: SC-001, SC-002, SC-003, SC-005, SC-006, SC-010.
  - Terminado cuando: cada fallo de la fase 10 está corregido y vuelto a verificar, o reportado con su motivo, y `npm run verify` sigue en verde.

- [ ] T078 Descripción del PR D según `AGENTS.md` 15 y `docs/TESTING.md` §7, en inglés (`docs/CONVENTIONS.md` B.4)
  - Enlace a `specs/001-frontend-foundation/evidence.md`; objetivo, archivos, decisiones, comandos con su salida (T062, T063, T070 y T076), capturas (T066 y T068), correcciones (T077), riesgos y pendientes. Pruebas añadidas por nombre (T069) y «E2E specs added: 0». Estado de cada `[V]` (T064, T065, T066, T071, T072, T073, T074 y T075): salida en `evidence.md` o «pending» con el motivo. Lista de lo que espera aprobación humana en la revisión: las tres propuestas de paleta; el copy de los estados provisionales; que una persona que abre la app por primera vez entiende que esta versión todavía no guarda datos (SC-008); las capturas de SC-001.
  - Cumple: FR-036 (el copy queda listado para la revisión), SC-001, SC-004, SC-008 (la aprobación es de los dos fundadores en la revisión, no de esta tarea).
  - Terminado cuando: la descripción existe con todas las secciones y ningún `[V]` figura como resuelto sin salida.

---

## Dependencies & Execution Order

### Phase Dependencies

| Fase | PR | Depende de | Bloquea |
| --- | --- | --- | --- |
| 1 · Setup (scaffold) | A | — | Todo |
| 2 · Fundacional | A | Fase 1 | Todas las historias |
| 3 · US5 tokens y tema | A | Fase 2 | Fases 4–10 (todo usa tokens) |
| 4 · US7 CI base: `verify`, jobs 1, 2 y 5, axe de `/` | A | Fases 1–3 (el workflow corre lo que ya existe) | Fases 6 y 9, que amplían la lista de rutas y el job 5 |
| 5 · US6 primitivos | B | Fase 3 | Fases 6, 7 y 8 |
| 6 · US6 superficie interna | B | Fases 4 y 5 | Fase 7 |
| 7 · US1 + US4 shell y selector | C | Fase 6 (PR B mergeado) | Fase 8 |
| 8 · US2 + US3 provisional y Anotar | C | Fase 7 | Fase 9 |
| 9 · US7 axe de las rutas de producto | C | Fases 4 y 8 | Fase 10 |
| 10 · Verificación y evidencia | D | Fase 9 (PR C mergeado) | El cierre de la 001 |

### User Story Dependencies

- **US5** (tokens y tema) no depende de otra historia; todas dependen de ella.
- **US7** se reparte en tres momentos: `verify`, los jobs 1, 2 y 5 y axe de `/` en A (fase 4); la superficie interna en axe y `check:internal-surface` en B (fase 6); las rutas de producto en axe en C (fase 9).
- **US6** (primitivos y superficie interna) depende de US5 y de la CI base.
- **US1** (navegación) depende de US5 y US6. **US4** (selector) depende de US6 (Segmented) y se integra en el shell de US1.
- **US2** y **US3** dependen de US1; US3 depende además de BottomSheet y Modal (US6).

### Dentro de cada fase

- Los grupos se ejecutan en orden (A, B, C…). Dentro de un grupo, las `[P]` son independientes entre sí: archivos distintos, sin dependencias y **sin competir por el mismo checkout, servidor o puertos** (ver «Format»).
- Los tests de una fase se escriben y **se ven fallar** antes que su implementación (T012 → T013, T014 → T016, T015 → T017, T024 → T033, T036 → T037, T042 → T046, T049 → T056, T050 → T059).
- Dos tareas tocan el mismo archivo solo en serie y sin `[P]` entre ellas: `src/app/layout.tsx` (T006 → T019), `src/app/(app)/page.tsx` (T006 → T045 → T053), `src/app/(app)/layout.tsx` (T048 → T058), `src/components/shell/app-shell.tsx` (T047 → T057 → T058), las páginas de destino (T045 → T053, T054, T055), `.github/workflows/ci.yml` (T023 → T041) y `tests/a11y/routes.a11y.ts` (T021 → T040 → T060).

### Parallel Opportunities

`[P]` por grupo. Una tarea cuyo criterio de terminado compila, sirve la app, ocupa un puerto, ejecuta `npm ci` o modifica un archivo de forma temporal **no** lleva `[P]`, aunque sus archivos sean distintos: el script de validación lo comprueba.

| Grupo | Tareas `[P]` |
| --- | --- |
| 1B | T002, T004, T005 |
| 2A | T007, T008, T009, T011 |
| 3A | T017 |
| 5A | T024, T025, T026, T027, T028 |
| 5B | T029, T030, T031, T032 |
| 5C | T033, T034, T035 |
| 7A | T042, T043, T044 |
| 8A | T049, T051, T052 |
| 8B | T056 |
| 10B | T069, T070, T071, T072 |

---

## Parallel Example: Phase 5 (primitivos)

```text
# Grupo 5A, a la vez:
Task: "T024 Escribir src/components/ui/amount-input.test.tsx (RTL)"
Task: "T025 Crear src/components/ui/app-icon.tsx"
Task: "T026 Crear src/components/ui/avatar.tsx"
Task: "T027 Crear src/components/ui/skeleton.tsx"
Task: "T028 Crear src/components/ui/segmented.tsx"

# Grupo 5B, cuando termina T025:
Task: "T029 Crear src/components/ui/category-icon.tsx"
Task: "T030 Crear src/components/ui/badge.tsx"
Task: "T031 Crear src/components/ui/button.tsx"
Task: "T032 Crear src/components/ui/input.tsx"
```

---

## Implementation Strategy

### Cuatro PR de implementación — decisión de los fundadores del 3 de noviembre de 2026

Los fundadores decidieron **cuatro PR de implementación, uno por punto de control (A, B, C, D), mergeados en orden**. Leen `AGENTS.md` 15 («un slice por PR») como «no mezclar slices», no como «todo el slice en un solo PR». Este archivo registra la decisión; no la toma. El reparto de los controles de CI y de la superficie interna entre los cuatro PR sale de la revisión del PR #14 (hallazgos F14-1 y F14-3), sin enmendar ADR-011.

Reglas de la partición:

1. **Cada PR parte de `main` actualizado** después del merge del anterior. Ningún PR depende de una rama sin mergear. Cada uno tiene su propia rama (`docs/CONVENTIONS.md` B.4).
2. **Ningún PR adelanta tareas de otro** ni deja a medias una tarea suya.
3. **Cada PR declara qué agente puede implementarlo** (regla de los fundadores): si necesita consultar el proyecto de Claude Design —comps o detalle visual que no está en `docs/design/` ni en `docs/design/screenshots/`—, lo implementa **Claude Code**, que tiene acceso; si basta con el repositorio, **Codex o Claude Code**. Las tareas de un PR de Claude Code dicen en una línea «Claude Design» qué archivo y qué sección consultar, o que no lo necesitan.
4. Cada PR lleva la evidencia de `AGENTS.md` 15: objetivo, archivos, decisiones, comandos con su salida real, capturas a 390 y 1440 en los dos temas cuando hay pantalla y la salida de axe cuando hay rutas, riesgos y pendientes.

| PR | Tareas | Agente | Qué demuestra | Evidencia |
| --- | --- | --- | --- | --- |
| **A** · scaffold, herramientas, tokens, tema y CI base | T001–T023 (fases 1–4) | **Codex o Claude Code.** Los tokens salen de `DESIGN_SYSTEM.md` §1, §2 y su CSS de referencia; las fuentes, de `BRAND_FOUNDATION.md` §6. Ninguna tarea necesita el comp | Instalación limpia; lint con sus reglas propias probadas; los dos proyectos de Vitest; tokens de los dos temas; el script de tema en `<head>`; `verify`; los jobs 1, 2 y 5 en CI, con axe sobre `/` | Salida de `npm ci`, `npm run verify`, `npm run test:a11y` y `npm run check:theme-script`; el `curl` de T019; las salidas «míralo fallar» de T012, T014, T015, T020, T021, T022 y T023; el run de CI verde y el rojo de T023. Capturas de `/` vacía a 390 y 1440 en los dos temas. Axe de `/` en los dos temas |
| **B** · primitivos y superficie interna | T024–T041 (fases 5–6) | **Claude Code.** Los primitivos necesitan `Juntia DS v1 - 02 Componentes.dc.html`; la superficie interna no necesita el comp | Los nueve primitivos y la base de BottomSheet y Modal; AmountInput probado; la superficie interna con su compuerta por destino (FR-049 a FR-053), dentro de axe (FR-052) y con `check:internal-surface` en el job 5; movimiento reducido de Skeleton y Button | Salida de `npm run verify`, `npm run test:a11y`, `npm run check:theme-script` y `npm run check:internal-surface`; los «míralo fallar» de sus pruebas; el run de CI. **Capturas de `/interno/primitivos` a 390 y 1440 en los dos temas**: aquí se hace la revisión visual de los primitivos. Axe de `/` y de la superficie |
| **C** · shell, selector, provisional, Anotar y axe de las rutas | T042–T060 (fases 7–9) | **Claude Code.** La composición a 360, 768, 1024, 1280 y 1440, el encabezado y el selector están en `Juntia DS v1 - 04 Pantallas.dc.html`; `docs/design/screenshots/` solo cubre 390, 1024 y 1440 | Las seis rutas de producto con el shell en sus tres composiciones; el selector que recuerda; el aviso de Anotar; los estados provisionales; «no encontrado» y error; axe y movimiento reducido en las rutas de producto | Salida de `npm run verify`, `npm run test:a11y`, `npm run check:theme-script` y `npm run check:internal-surface`; el fallo previo de sus pruebas de componentes y el «míralo fallar» de T060; el `curl` de `/cuenta/perfil`; el run de CI. Capturas de las seis rutas y del «no encontrado» a 390 y 1440 en los dos temas. Axe de las 8 URL |
| **D** · verificación y cierre de la 001 | T061–T078 (fase 10) | **Codex o Claude Code**, salvo lo que se marca en la fase: las correcciones que toquen composición o anatomía las hace **Claude Code** (T077), y cuatro tareas necesitan a una persona | Los `[V]` del PR de implementación, los umbrales de §15.7, la revisión humana completa y las correcciones que salgan de ahí | `specs/001-frontend-foundation/evidence.md` (T061), con la salida de cada tarea de la fase 10 y las capturas en `specs/001-frontend-foundation/evidence/` |

**Tareas que necesitan una persona** (en D): contraste en dispositivos, sombras en gama media, VoiceOver y TalkBack, y el preview real de Vercel, que necesita un proyecto que hoy no existe (grupo 10C y la tarea del preview en 10B).

**Por qué D tiene sentido aunque pueda no traer código.** D es el PR que cierra la 001: lleva `evidence.md`, que es un archivo del repositorio, la revisión humana conjunta de §10.3 y §10.4 sobre la app completa, y las correcciones que esa verificación encuentre (T077). Si no encuentra nada, el PR sigue siendo el registro de la aceptación. No se fusiona con C, porque los cuatro PR los decidieron los fundadores.

**Lo que no se pudo verificar del comp.** Los dos archivos se listaron en el proyecto de Claude Design. `02 Componentes` tiene dos secciones, **02·1 Galería · Claro** y **02·2 Galería · Oscuro**; las secciones de `04 Pantallas` que se citan son las que documenta `docs/design/screenshots/README.md` (04·1, 04·5, 04·7, 04·8, 04·9). Los bloques internos de cada galería y de cada pantalla los genera el runtime del comp y no se pudieron leer: la sesión que implemente localiza el bloque de cada componente dentro de la sección citada. **No se verificó** que el comp dibuje los estados provisionales de la 001 (aviso de versión base, estados vacíos, Balance no disponible, `/cuenta` mínima, «no encontrado»); si no los dibuja, se componen con primitivos aprobados y los aprueba la revisión del PR viendo la pantalla.

### Controles de CI por PR

ADR-011 §5 sin enmiendas: el workflow llega **junto al scaffold** (PR A), y **cada ruta entra en la comprobación con el PR que la crea** (`docs/TESTING.md` §3). Un control que todavía no corre se declara **no aplicable, con el PR que lo incorpora**; nunca aparece como pasado ni se omite (`docs/TESTING.md` §3, regla 1).

| Control | A | B | C | D |
| --- | --- | --- | --- | --- |
| `verify` (lint, typecheck, `domain`, `components`; SQL/RLS no aplicable, P0-1) | Corre | Corre | Corre | Corre |
| Job 1 · lint + typecheck + build | Corre | Corre | Corre | Corre |
| Job 2 · Vitest `domain` y `components` | Corre | Corre | Corre | Corre |
| Job 5 · axe en los dos temas, movimiento reducido y `check:theme-script` | Corre sobre `/` | Corre sobre `/` y la superficie | Corre sobre las 8 URL | Corre |
| Superficie interna en axe (FR-052) y `check:internal-surface` (FR-053) | **No aplicable, lo incorpora B** | Corre | Corre | Corre |
| Jobs 3 (Supabase y SQL/RLS) y 4 (E2E de humo) | No aplicables, P0-1 | Ídem | Ídem | Ídem |

### Orden de los PR: secuencial

**Los cuatro PR van en serie, A → B → C → D** (decisión de los fundadores del 3 de noviembre de 2026). Cada uno parte de `main` actualizado después del merge del anterior; ninguno se empieza antes de ese merge.

Lo que cada PR toma del anterior, ya en `main`:

- **B** usa los tokens, el catálogo de copy, los tokens de motion y las herramientas de A, y amplía su prueba de axe y su job 5.
- **C** usa los primitivos de B y amplía la misma prueba de axe con las rutas de producto. Su «no encontrado» diseñado sustituye al de Next que ve la superficie cerrada en B.
- **D** verifica, mide y revisa la app completa que dejan A, B y C.

### Qué no se hace en ningún punto

Adelantar infraestructura de P0-1 (Supabase, migraciones, siembra, `test:db`, `test:e2e`), crear specs E2E, añadir pruebas que no están en el Anexo A, o marcar un `[V]` como resuelto sin su salida.

---

## Notes

- `[P]` = archivos distintos y ninguna dependencia dentro de su grupo. Nunca significa «propuesta» en este archivo.
- Las tareas que implementan un elemento propuesto lo nombran en palabras: «propuesta §15.9». En la 001 solo hay tres, todas de valores de token (paleta), que se aprueban viendo la pantalla en la revisión del PR (T016, T068).
- Un `[V]` cerrado sin salida real es un defecto del PR, no una omisión menor.

---

## Anexo A — Auditoría de las tareas de test (ADR-012 §4, F7-4, punto 2)

**Por qué existe.** Es el primer `tasks.md` del proyecto. La skill `speckit-tasks` trae una heurística genérica: «If tests requested: Each interface contract → contract test task [P] before implementation». En la 001 se piden pruebas (FR-045) y hay tres contratos en `contracts/`, así que la heurística se activa. ADR-012 §4 dice que prevalecen ADR-011 y `docs/TESTING.md` §4: cada criterio en la capa más baja que detecta su fallo, y las tareas redundantes se retiran antes del merge.

**Cómo se hizo.** Primero se generó un borrador de tareas de test aplicando la skill **al pie de la letra**: las pruebas de la tabla «Pruebas por capa» del plan, un contract test por cada archivo de `contracts/`, la automatización de las «Independent Test» que el plan no asigna a ninguna prueba, y lo que sugiere el data-model. Después se auditó cada tarea del borrador: a qué requisito responde, en qué capa va y por qué esa es la más baja. **Del borrador quedan 9 tareas de test y se retiran 7.**

**Revisión del gestor en el gate de tasks.** Señaló cuatro huecos que la primera versión de este anexo dejaba a la revisión humana (A.3). Se cierran tres, en la capa que fija ADR-011, sin ampliar alcance: dos aserciones nuevas dentro de tareas conservadas (B6: aviso de versión base; B9: movimiento reducido, fila 17) y dos tareas nuevas para el script de tema (B17, B18). **Total conservado: 11 tareas de test.** En la revisión del PR #14 (F14-4), B9 incorporó además el movimiento reducido de Skeleton y Button en la superficie interna, sin RTL ni spec E2E. El cuarto pedía una prueba de componentes del retardo de Skeleton; chocaba con FR-045 y el gestor la retiró (B19, A.2). **Total retirado: 8** (7 del borrador y 1 de la revisión).

> **Se retiraron tareas de test.** Tres de las ocho retiradas (B10, B11, B12) son
> exactamente las que predice F7-4: contract tests generados por la heurística de
> la skill contra la matriz de capas. Según ADR-012 §4, punto 3, esto cuenta como
> **el primer `tasks.md` con retiradas**. Si el siguiente `tasks.md` también tiene
> que retirar tareas de test, se detiene la fase de tasks y se evalúa un preset.

### A.1 Tareas de test conservadas

| # | Tarea | Archivo | Capa | Requisito | Por qué esta capa es la más baja | Qué detecta que ninguna otra conservada detecta |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | T012 | `tests/lint-rules.test.ts` | Lint, probada con la API de ESLint (Vitest, `node`) | FR-003, FR-006, FR-044; US-7.3 | La regla es de lint; probarla es lintear un texto, sin DOM ni navegador | Que una regla deje de marcar en silencio. Sin ella, `npm run lint` sobre código limpio pasa igual con la regla rota, y la regla de `domain` no se ejerce nunca porque `src/domain/` está vacío |
| B2 | T014 | `src/styles/tokens.test.ts` | Unidad sin DOM sobre el texto de `tokens.css` | FR-005 (caso sin JS) | Es la igualdad de dos bloques de texto; no necesita navegador | Que el respaldo sin JavaScript y el bloque oscuro se desincronicen. axe en oscuro no lo ve: con el script funcionando, el respaldo no se aplica nunca |
| B3 | T024 | `src/components/ui/amount-input.test.tsx` | Componente (RTL) | FR-013, FR-014; US-6.1, 6.2 | Formato, tope, pegado y vacío ≠ 0 son comportamiento del componente; la máscara no tiene dominio en la 001 (FR-003) | Todo lo de AmountInput. Lo nombra FR-045 |
| B4 | T042 | `src/components/shell/context-selector.test.tsx` | Componente (RTL) | FR-015 (teclado), FR-025–FR-027; SC-007; US-4.1, 4.2, 4.5 | Cambio, recuerdo, almacenamiento bloqueado y anuncio se observan en el DOM y en `localStorage` simulado; no hace falta navegador | El recuerdo y el fallo de almacenamiento. Cubre también el teclado del Segmented en `radiogroup`. Lo nombra FR-045 |
| B5 | T049 | `src/components/shell/annotate-notice.test.tsx` | Componente (RTL) | FR-031, FR-031a; US-3.1–3.4 | Foco atrapado, Escape, `N` y retorno del foco son eventos de teclado sobre el DOM | El aviso sin campos y el foco. Cubre además la base de BottomSheet y Modal, que no tienen otro consumidor en la 001. Lo nombra FR-045 |
| B6 | T050 | `src/app/(app)/product-routes.test.tsx` | Componente (RTL) | FR-028, FR-029; SC-004; US-2.1, 2.3 | El criterio dice «visible y accesible»: es lo que se pinta, y RTL lo lee sin navegador (`docs/TESTING.md` §4, pregunta 3) | Una cifra o un «Al día» en el contenido o en un nombre accesible, y una ruta sin el aviso de versión base. axe no mira ninguna de las dos. Lo nombra FR-045 («la ausencia de cifras en las rutas»); el aviso es una aserción más en la misma pasada, no una prueba nueva |
| B7 | T036 | `src/lib/internal-surface.test.ts` | Unidad de funciones puras | FR-049, FR-053 | La decisión de la compuerta es una tabla de entradas y salidas; no necesita la página | Todas las combinaciones de entorno y host, incluidas las que el HTTP no reproduce (Vercel sin variables de sistema) |
| B8 | T039 | `scripts/check-internal-surface.mjs` | HTTP real contra el build | FR-053; SC-002 | Es la capa más baja que ve la **página servida**: el fallo que encontró research R4 (la ruta prerenderizada congelaba el 404 o el 200) no existe en las funciones puras | Que la página no llame a la compuerta, o que se prerenderice. B7 no lo ve |
| B9 | T021 (PR A), T040 (PR B) y T060 (PR C) | `tests/a11y/routes.a11y.ts` | E2E barato por ruta (visitar + axe + movimiento reducido); **no** es spec E2E. Nace en A con `/`; B le añade la superficie interna y el movimiento reducido de Skeleton y Button; C, las rutas de producto y el de la perilla y el aviso de Anotar | FR-012, FR-016, FR-040, FR-043, FR-051, FR-052; SC-002, SC-010; ADR-011 §2, filas 16 y 17 | axe necesita un árbol de accesibilidad real (fila 16). El movimiento reducido es una emulación de media feature del navegador y ADR-011 lo pone en esta capa (fila 17); jsdom no tiene layout ni cuadros que medir | Violaciones de axe por ruta y tema, y que la superficie interna se visitó de verdad (FR-052). Que cada ruta responde 200, para que axe sobre un 404 no cuente como verificada. Y que, con la emulación, no hay transición de color de tema, la perilla salta sin posiciones intermedias, el aviso aparece sin desplazarse ni escalar, el pulso de Skeleton es estático y la pulsación de Button no desplaza |---
| B17 | T015 | `src/lib/theme-script.test.ts` | Unidad sin DOM, ejecutando la cadena del script | FR-005, FR-026; SC-006 | La lógica del script es una función de su entorno (`matchMedia`, `localStorage`); se ejecuta con dobles mínimos, sin navegador | Que el script deje de fijar `data-theme` o `data-context`, o que lance sin almacenamiento. axe no lo ve: el respaldo CSS pinta el tema del sistema igual |
| B18 | T022 | `scripts/check-theme-script.mjs` | HTTP real contra el build | FR-005; SC-006 | Es la capa más baja que ve el HTML servido: el root layout importa `next/font` y no se renderiza fuera de Next | Que el script salga de `<head>`, pase a `async`/`defer` o a `next/script`, o que `<html>` traiga un tema fijado por el servidor. B17 no lo ve |

**Pares que podrían parecer duplicados y no lo son:**

- **B7 y B8.** B7 prueba la decisión; B8, que la página servida la aplica. El caso `JUNTIA_INTERNAL_SURFACE=1` → 200 **no** está en B8 porque ya lo cubre B9 (contracts/ci.md).
- **B4 y B5 frente a los primitivos.** Segmented, BottomSheet y Modal no tienen prueba propia: B4 y B5 los ejercen a través de su único consumidor de la 001.
- **B4 y B9 sobre la perilla.** B4 afirma que el selector cambia y se anuncia; B9, que con movimiento reducido la perilla no pasa por posiciones intermedias. jsdom no tiene layout, así que B4 no puede ver lo segundo.
- **B17 y B18 frente a B14 (retirada).** B14 metía en la suite el arnés del primer cuadro, con CPU y red emuladas. B17 y B18 son más bajas y baratas: detectan las dos causas del destello (lógica y posición del script) sin medir cuadros. La medición del primer cuadro sigue siendo del PR (T065).

### A.2 Tareas de test retiradas

| # | Tarea del borrador | Origen | Motivo de la retirada | Dónde queda cubierto lo que pedía |
| --- | --- | --- | --- | --- |
| B10 | Contract test de `contracts/routes.md`: `tests/contract/routes.test.ts`, código HTTP y pantalla de cada URL | Heurística de la skill (un contract test por contrato) | Duplica B9, que ya afirma 200 en las seis rutas y 404 en una inexistente, y B8 para la ruta interna. El 404 de `/cuenta/*` es el comportamiento del enrutador sin archivo de página: probarlo es probar Next. El contenido de cada pantalla ya es B6 | B6, B8, B9; la tabla de rutas del build y el `curl` de `/cuenta/perfil` (T059, T063) |
| B11 | Contract test de `contracts/primitives.md`: una prueba RTL por primitivo (11) | Heurística de la skill | **Contradice FR-045**, que limita RTL «solo» a los críticos de la 001. AmountInput ya es B3; Segmented, BottomSheet y Modal se ejercen en B4 y B5. Para AppIcon, Avatar, CategoryIcon, Badge, Button, Input y Skeleton, lo que una prueba de componente podría afirmar de ARIA lo ve axe en la superficie interna (B9: nombres de botón, `aria-hidden`, referencias de `aria-errormessage`), y lo demás es presentación (`docs/TESTING.md` §4): jsdom no tiene layout para el ancho fijo de Button ni para la geometría de Skeleton | B3, B4, B5, B9; revisión humana en la superficie interna (T067, T068) |
| B12 | Contract test de `contracts/ci.md`: prueba unitaria de la salida de `scripts/verify.mjs` y del YAML del workflow | Heurística de la skill | Afirmar el formato de impresión de un script es probar la implementación, no un criterio (`docs/TESTING.md` §1, corolario). El criterio («los no aplicables figuran como tales», SC-009) se demuestra ejecutando `verify` y el CI y pegando la salida | T020 (comprobación de su criterio de terminado), T023, T062, T076 |
| B13 | Prueba de Playwright de navegación por anchos (Independent Test de US1) | Automatización de una Independent Test | Sería una spec E2E o una prueba de navegador fuera de axe, y **FR-047 fija cero**. La composición por ancho es presentación visual: gate humano fuera de CI (ADR-011 §7). Lo objetivo, el scroll horizontal y los objetivos táctiles, es un `[V]` de medición del PR, no de la suite (plan; ADR-011 §5: el rendimiento y los snapshots son del nivel 2, que la 001 no crea) | T065, T067, T068 |
| B14 | Prueba de Playwright del primer cuadro en la suite (Independent Test de US5, SC-006) | Automatización de una Independent Test | El `[V]` que decidía la construcción ya se ejecutó (research R2). El plan asigna SC-006 a una **medición del PR**, no a la suite («Pruebas por capa»). Meterla en el job 5 añadiría al gate un arnés con CPU y red emuladas que el plan no aprobó | T065 (arnés de R2 reutilizado) |
| B15 | Prueba unitaria de `src/lib/context-preference.ts` (lectura, escritura, `try/catch`) | Data-model («ContextChoice») | **Misma comprobación en dos capas sin que la segunda detecte nada nuevo**: B4 ya afirma el recuerdo, el valor ilegible y el almacenamiento que lanza, a través del selector | B4 |
| B16 | Prueba que busca en `src/lib/copy/es.ts` las palabras prohibidas de `docs/GLOSSARY.md` §9 y «P0-1» | Data-model («CopyCatalog») y FR-034, FR-036 | `docs/TESTING.md` §6: «Un test que busca la cadena “Total gastado” se satisface con un sinónimo igual de malo». `docs/CONVENTIONS.md` §2 asigna esa comprobación a la revisión del PR. El grep de fases y palabras queda como **comprobación con salida**, no como prueba de la suite | T010 (grep en su criterio de terminado), T070 |
| B19 | Prueba de componentes (RTL con temporizadores falsos) del retardo de 300 ms de Skeleton, `src/components/ui/skeleton.test.tsx` | Revisión del gestor en el gate de tasks | **No está en FR-045**, que enumera los componentes críticos con RTL («solo» AmountInput, el selector, Anotar y la ausencia de cifras). Añadirla ampliaría la spec desde un `tasks.md`. Retirada por el gestor el 3 de noviembre de 2026 | Revisión humana en la superficie interna: capturas del PR B y recorrido manual de D (T067, T068) |

**Specs E2E:** el borrador no tenía ninguna salvo B13, que se retira. **Specs E2E que añade la 001: 0.**

### A.3 Lo que la auditoría deja sin prueba automatizada, a propósito

No son huecos del plan —el plan los asigna a la revisión humana o a un `[V]`—, pero el revisor debe saber que dependen de una persona. Los tres huecos que la primera versión listaba aquí (movimiento reducido, aviso de versión base y regresión del script de tema) **quedaron cerrados** en la revisión del gestor: B9, B6, B17 y B18.

| Requisito | Cubierto por | Observación |
| --- | --- | --- |
| FR-012 (Button en carga sin salto de ancho) | T067, T068 | jsdom no tiene layout; el gestor lo deja en revisión humana. La pulsación sin desplazamiento con movimiento reducido sí está en B9 (T040) |
| FR-015 en modo `tablist` | T067 | Sin consumidor en las rutas de la 001; las flechas del modo `radiogroup` ya están en B4. El gestor lo deja en revisión humana |
| FR-016 (Skeleton: aparece solo pasados 300 ms) | T067, T068 | Retirada su prueba de componentes (B19): no está en FR-045. Revisión humana en la superficie interna (capturas de B, recorrido de D). El pulso estático con movimiento reducido sí está en B9 (T040) |

---

## Anexo B — Cobertura de requisitos y criterios de éxito

Cada FR y cada SC tiene al menos una tarea que lo implementa (**I**) o lo verifica (**V**). Ninguna tarea queda sin requisito de origen: la tabla B.3 lo comprueba en sentido inverso.

### B.1 Requisitos funcionales

| Req. | Qué exige (resumen) | Implementan | Verifican |
| --- | --- | --- | --- |
| FR-001 | Scaffold con el stack de §7.1 y estructura de §7.2, con lockfile | T001, T002, T003, T004, T006 | T062 |
| FR-002 | Solo las dependencias que la 001 necesita | T001 | T070 |
| FR-003 | `domain` vacío y con la regla de dependencia | T005, T013 | T012 |
| FR-004 | Tokens primitivos y semánticos, dos temas, solo `person.1–2` | T016, T018 | T070, T073 |
| FR-005 | Tema del sistema con script bloqueante, sin persistencia | T016, T017, T019 | T014, T015, T022, T063, T070, T065 |
| FR-006 | Ningún hex fuera de `tokens.css`, con regla de lint | T009, T013 | T012, T076 |
| FR-007 | Instrument Serif, Geist, Geist Mono; `tabular-nums` | T018, T019 | T071 |
| FR-008 | `AppIcon` sobre Phosphor | T025 | T040 |
| FR-009 | `Avatar` sin patrón | T026 | T068 |
| FR-010 | `CategoryIcon` | T029 | T068 |
| FR-011 | `Badge` | T030 | T068 |
| FR-012 | `Button` | T031 | T040, T074, T067 |
| FR-013 | `Input` con error accesible | T032, T033 | T024, T040, T075 |
| FR-014 | `AmountInput` | T033 | T024 |
| FR-015 | `Segmented` con spring y movimiento reducido | T011, T028 | T042, T067 |
| FR-016 | `Skeleton` | T027 | T040, T067, T068 |
| FR-017 | Ningún dato financiero de ejemplo fuera de la superficie | T038 | T070 |
| FR-018 | Barra, rail y sidebar por ancho | T047, T048 | T074, T068 |
| FR-019 | Destinos e íconos; Balance solo en escritorio | T043, T045, T047 | T066 |
| FR-020 | Anotar siempre a un toque | T047, T058 | T067 |
| FR-021 | Destino actual con Fill y `aria-current` | T043, T047 | T067 |
| FR-022 | «Ir al contenido» y navegación con nombre | T047, T048 | T060, T075, T067 |
| FR-023 | Acceso mínimo a Mi cuenta | T047 | T067 |
| FR-024 | Composición propia por ancho | T047 | T068 |
| FR-025 | Selector Yo/Nosotros y su ubicación | T046, T047, T048 | T042 |
| FR-026 | Recuerdo por dispositivo | T017, T044, T046 | T042, T015 |
| FR-027 | Anuncio por región viva; sin Context Transition | T046 | T042, T075 |
| FR-028 | Aviso de versión base en todas las rutas | T051, T057, T059 | T050, T067 |
| FR-029 | Ninguna cifra en rutas de producto | T053, T054, T055 | T050 |
| FR-030 | Estados vacíos diseñados | T052, T053 | T050, T068 |
| FR-031 | Aviso de Anotar en su contenedor | T035, T056, T058 | T049, T075, T067 |
| FR-031a | BottomSheet y Modal solo en lo que pide el aviso | T034, T035, T056 | T049 |
| FR-032 | Balance «todavía no disponible» | T045, T052, T054 | T050 |
| FR-033 | `/cuenta` mínima | T045, T047, T052, T055 | T050 |
| FR-034 | Sin fases ni fechas en la interfaz | T010, T051 | T070 |
| FR-035 | Copy tipado y centralizado | T010 | T010 (tipo), T062 |
| FR-036 | Términos del glosario; ninguna palabra de §9 | T010 | T070, T078 |
| FR-037 | Objetivos táctiles ≥ 44 | T031, T047 | T065 |
| FR-038 | Teclado y foco visible | T047 | T073, T067 |
| FR-039 | Sin scroll horizontal; texto al 200 % | T047 | T065, T067 |
| FR-040 | Movimiento reducido | T011, T018, T027, T028, T034, T035 | T021, T040, T060, T063, T067 |
| FR-041 | Safe areas | T034, T047 | T067 |
| FR-042 | `verify` con SQL/RLS no aplicable | T007, T020 | T062, T064 |
| FR-043 | CI con jobs 1, 2 y 5 | T008, T023, T041 | T021, T040, T060, T076 |
| FR-044 | Contexto de axe: reduce, Chromium, retries, sin esperas fijas | T008, T009, T013 | T012 |
| FR-045 | Pruebas en la capa más baja; RTL solo en los críticos | T007 | T024, T042, T049, T050, T069 |
| FR-046 | Duraciones publicadas contra presupuesto; solo avisan | T020, T023 | T062, T076 |
| FR-047 | Cero specs E2E | — (no se crea nada) | T069, T070 |
| FR-048 | Fuera de alcance | — (no se crea nada) | T070 |
| FR-049 | Superficie interna por destino | T037, T038 | T036, T072 |
| FR-050 | Superficie con valores de prueba identificados | T038 | T070 |
| FR-051 | Superficie auditada por axe y usada en capturas | T040 | T063, T068 |
| FR-052 | El job 5 comprueba que visitó la superficie | T040 | T063 |
| FR-053 | El build de producción no expone la superficie | T037, T039, T041 | T036, T039, T063, T072 |

### B.2 Criterios de éxito

| SC | Qué mide | Tareas |
| --- | --- | --- |
| SC-001 | Sin scroll horizontal ni solapes de 360 a 1440, dos temas; capturas aprobadas por los fundadores | T061, T077, T065, T068, T078 |
| SC-002 | Cero violaciones serias de axe, superficie visitada; producción no la expone | T039, T021, T040, T060, T063, T061, T077 |
| SC-003 | 100 % de objetivos táctiles ≥ 44 px | T065, T061, T077 |
| SC-004 | Cero cifras en rutas de producto; la superficie solo con valores de prueba | T050, T070, T078 |
| SC-005 | INP del aviso de Anotar < 200 ms, en laboratorio | T065, T061, T077 |
| SC-006 | CLS = 0 y ningún cuadro con el tema contrario | T015, T022, T063, T065, T061, T077 |
| SC-007 | El contexto se conserva en recargas y navegaciones | T042 |
| SC-008 | Una persona entiende que la versión no guarda datos (fundadores en el PR) | T078 |
| SC-009 | Duraciones publicadas y no aplicables nombrados | T020, T023, T041, T062, T076, T061 |
| SC-010 | Todo con teclado y con movimiento reducido | T042, T049, T021, T040, T060, T067, T077 |

### B.3 Comprobación inversa: tarea → requisito

Generada a partir de la línea «Cumple» de cada tarea.

| Tarea | Requisitos | Tarea | Requisitos | Tarea | Requisitos |
| --- | --- | --- | --- | --- | --- |
| T001 | FR-001, FR-002 | T027 | FR-016, FR-040 | T053 | FR-029, FR-030 |
| T002 | FR-001 | T028 | FR-015, FR-040 | T054 | FR-029, FR-032 |
| T003 | FR-001 | T029 | FR-010 | T055 | FR-029, FR-033 |
| T004 | FR-001 | T030 | FR-011 | T056 | FR-031, FR-031a |
| T005 | FR-003 | T031 | FR-012, FR-037 | T057 | FR-028 |
| T006 | FR-001 | T032 | FR-013 | T058 | FR-020, FR-031 |
| T007 | FR-042, FR-045 | T033 | FR-014, FR-013 | T059 | FR-028 |
| T008 | FR-044, FR-043 | T034 | FR-031a, FR-041 | T060 | FR-040, FR-043, SC-002, SC-010 |
| T009 | FR-006, FR-044, FR-003 | T035 | FR-031, FR-031a | T061 | SC-001, SC-002, SC-003, SC-005, SC-006, SC-009 |
| T010 | FR-034, FR-035, FR-036 | T036 | FR-049, FR-053 | T062 | FR-001, FR-042, FR-046, SC-009 |
| T011 | FR-015, FR-040 | T037 | FR-049, FR-053 | T063 | FR-005, FR-040, FR-051, FR-052, FR-053, SC-002, SC-006 |
| T012 | FR-006, FR-044, FR-003 | T038 | FR-017, FR-049, FR-050 | T064 | FR-042 |
| T013 | FR-006, FR-044, FR-003 | T039 | FR-053, SC-002 | T065 | FR-037, FR-039, SC-001, SC-003, SC-005, SC-006 |
| T014 | FR-005 | T040 | FR-012, FR-016, FR-040, FR-051, FR-052, SC-002, SC-010 | T066 | FR-019 |
| T015 | FR-005, FR-026, SC-006 | T041 | FR-043, FR-053, SC-009 | T067 | FR-012, FR-015, FR-016, FR-020, FR-021, FR-022, FR-023, FR-028, FR-031, FR-038, FR-039, FR-040, FR-041, SC-010 |
| T016 | FR-004, FR-005, FR-006 | T042 | FR-025, FR-026, FR-027, SC-007 | T068 | FR-009, FR-010, FR-011, FR-016, FR-018, FR-024, FR-030, FR-051, SC-001 |
| T017 | FR-005, FR-026 | T043 | FR-019, FR-021 | T069 | FR-045, FR-047 |
| T018 | FR-004, FR-007, FR-040 | T044 | FR-026 | T070 | FR-002, FR-004, FR-005, FR-017, FR-034, FR-036, FR-047, FR-048, FR-050, SC-004 |
| T019 | FR-005, FR-007 | T045 | FR-019, FR-032, FR-033 | T071 | FR-007 |
| T020 | FR-042, FR-046, SC-009 | T046 | FR-025, FR-026, FR-027 | T072 | FR-049, FR-053 |
| T021 | FR-040, FR-043, SC-002, SC-010 | T047 | FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-033, FR-037, FR-038, FR-039, FR-041 | T073 | FR-004, FR-038 |
| T022 | FR-005, SC-006 | T048 | FR-018, FR-022, FR-025 | T074 | FR-012, FR-018 |
| T023 | FR-043, FR-046, SC-009 | T049 | FR-031, FR-031a | T075 | FR-013, FR-022, FR-027, FR-031 |
| T024 | FR-014, FR-013 | T050 | FR-028, FR-029, SC-004 | T076 | FR-043, FR-046, SC-009 |
| T025 | FR-008 | T051 | FR-028, FR-034 | T077 | SC-001, SC-002, SC-003, SC-005, SC-006, SC-010 |
| T026 | FR-009 | T052 | FR-030, FR-032, FR-033 | T078 | FR-036, SC-001, SC-004, SC-008 |
