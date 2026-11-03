# Implementation Plan: 001 · Frontend Foundation

**Branch**: `claude/spec-001-plan-dbacbd` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5) | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-frontend-foundation/spec.md`, mergeada en `main` por el PR #11.

**Status**: Draft — fase Plan. No avanza a Tasks sin el merge de su PR documental (ADR-012 §3.1). Este archivo no contiene `tasks.md`.

> **Qué es este documento.** Dice **cómo** se construye lo que la spec ya fijó.
> No amplía alcance ni decide nada que no sea local y reversible: lo que es una
> **decisión del plan** se marca así para que el revisor la pueda objetar. En
> este archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**
> (maestro §15.9).

## Summary

La 001 crea el scaffold de Juntia con el stack congelado del maestro §7.1 y
entrega tres cosas que P0-1 consume: los **tokens** de I2 Bosque & Arena con los
dos temas, los **primitivos** del paso 2 del handoff (incluido AmountInput) y el
**AppShell** responsive con el selector Yo/Nosotros y el comportamiento
provisional de §15.10. No tiene servidor, datos ni dominio financiero.

Enfoque técnico, con lo verificado en [research.md](research.md):

- **Next.js 16.4.4 + React 19.3.1 + TypeScript 6.0.3**, Tailwind 4.3.4 mapeado a
  variables de `src/styles/tokens.css`, Motion 14.9.0, Phosphor 2.1.10 con
  `AppIcon` y Radix Dialog 1.3.1 como base accesible del aviso de Anotar (R1).
- **Script de tema inline bloqueante en `<head>`** con `suppressHydrationWarning`
  en `<html>` y respaldo CSS sin JavaScript: el primer cuadro sale en el tema del
  sistema, sin errores de hidratación (R2).
- **ESLint con `no-restricted-syntax`** para hex crudos en TS, TSX y CSS, y para
  esperas fijas en pruebas de navegador (R3).
- **Superficie interna en `/interno/primitivos`**, cerrada por defecto y abierta
  solo con una señal positiva de destino; en producción de Vercel, 404 (R4).
- **CI con los jobs 1, 2 y 5** de ADR-011, presupuestos que solo avisan y los jobs
  3 y 4 declarados no aplicables. **Cero specs E2E.**

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node 24 LTS. No TypeScript 7: `typescript-eslint` exige `<6.1.0` (R1.2).

**Primary Dependencies**: `next` 16.4.4 (App Router), `react`/`react-dom` 19.3.1, `motion` 14.9.0, `@phosphor-icons/react` 2.1.10, `@radix-ui/react-dialog` 1.3.1, `server-only` 0.0.1; en desarrollo `tailwindcss` y `@tailwindcss/postcss` 4.3.4, `eslint` 9.39.5 con `eslint-config-next` 16.4.4 y `@eslint/css` 1.4.0. Tabla completa y exclusiones en research R1 y R1.4.

**Storage**: ninguno en servidor. `localStorage` solo para el contexto recordado (`juntia:context`, R5). El tema no se guarda (FR-005).

**Testing**: Vitest 5.1.0 con los proyectos `domain` (node) y `components` (jsdom + RTL 16.3.3 + user-event 14.6.8); Playwright 1.64.1 + `@axe-core/playwright` 4.14.0, solo Chromium, para el job 5.

**Target Platform**: navegadores modernos, móvil (iOS Safari, Chrome Android) y escritorio; despliegue en Vercel Hobby (maestro §7.1).

**Project Type**: aplicación web, monolito modular Next.js (maestro §7.1). Sin monorepo.

**Performance Goals**: maestro §15.7 en lo que aplica a la 001 —CLS = 0 en la carga de cada ruta, INP < 200 ms al abrir el aviso de Anotar (laboratorio, SC-005)—; presupuestos de ADR-011 §4, que en la 001 solo avisan.

**Constraints**: 360–1440 px sin scroll horizontal; 390 y 1440 obligatorios; objetivos táctiles ≥ 44 px; `prefers-reduced-motion`; texto al 200 %; ningún hex fuera de `tokens.css`; ninguna cifra financiera en rutas de producto; sin servidor ni red para funcionar.

**Scale/Scope**: 6 rutas de producto (`/`, `/actividad`, `/metas`, `/plan`, `/balance`, `/cuenta`), 1 ruta interna, estados de «no encontrado» y de error; 9 primitivos más la base de BottomSheet/Modal; 2 usuarios.

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después del
diseño de la Fase 1.* La constitución es un puntero (ADR-012 §3.4): esta sección
comprueba la jerarquía de `AGENTS.md` §2.

**Fuentes leídas antes de rellenarla:** `AGENTS.md` (§2, §2b), `CLAUDE.md`,
`.specify/memory/constitution.md`, el maestro completo (con §7.1–7.2, §15.1–15.3,
§15.6, §15.7, §15.9 y §15.10, decisiones 1–11), ADR-011, ADR-012 con su enmienda
§3.4, `docs/TESTING.md`, `docs/CONVENTIONS.md`, `docs/GLOSSARY.md`, los seis
documentos de `docs/design/` y la spec.

### Propuestas `[P]` que toca el slice

Del inventario del maestro §15.9, con sus dos ejes. Se comprobó contra la tabla
de 17 elementos del maestro, no solo contra la de la spec.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| Sección Cuenta completa, `COMPONENT_SPECIFICATIONS.md` §Cuenta | Sí — P0-1 y P0-2 | Sí | **Resuelto por los fundadores, decisión 8 (§15.10), 3 nov 2026.** La 001 da solo el acceso mínimo a `/cuenta` con el icono `user-circle`, sin anatomía de `AccountButton` ni `LimitNote` (FR-023, FR-033) | No |
| Persistencia del tema `[P][V]`, `COMPONENT_SPECIFICATIONS.md` §ThemeSelector | Sí — P0-1 | Sí, más el `[V]` | **Resuelto por §15.10, «Tema».** El script de R2 no lee cookie ni perfil; el plan deja el punto de extensión (leer una preferencia antes de la del sistema) sin implementarlo | No |
| Anotar gasto E1–E5, `COMPONENT_SPECIFICATIONS.md` §Anotar gasto | Sí — F0-b y P0-1 | Sí | **Resuelto por las decisiones 7 y «Anotar» de §15.10.** Solo el aviso, sin campos (FR-031) | No |
| Teclado nativo para el monto, `COMPONENT_SPECIFICATIONS.md` §Anotar · handoff | Sí — P0-1 | Sí | **Aprobado por los fundadores, decisión 11, 3 nov 2026.** `inputmode="numeric"` en AmountInput (FR-014) | No |
| Teclado propio descartado, handoff §Accesibilidad | Sí — P0-1 | Sí | **Aprobado con la fila anterior, decisión 11** | No |
| Personas configurables, escalables a N (+ patrón), `DESIGN_SYSTEM.md` §1.2 | No | Sí — `person.3–6` y el patrón de tramo | `tokens.css` define **solo** `person.1` y `person.2`; Avatar sin patrón (FR-004, FR-009). Nada que aprobar en la 001 | No |
| Sara lila → petróleo; Hogar lavanda → azul tenue; superficie oscura #1C1F20 → #191C1F, `DESIGN_SYSTEM.md` §4 | No | Sí — viendo la pantalla | **Pendiente de la revisión del PR de implementación.** Se ven en el shell (superficie oscura) y en `/interno/primitivos` (Avatar `person.1`, ficha Hogar), con capturas a 390 y 1440 en los dos temas | No |
| Gasto, ingreso y liquidación en tinta, `DESIGN_SYSTEM.md` §4 | No | Sí — viendo la pantalla | Los tokens `finance.*` entran en `tokens.css`, pero ninguna pantalla de la 001 muestra movimientos. **La aprobación pasa a P0-1**, primer slice que los muestra. La superficie interna no los usa (no es un primitivo del paso 2) | No |
| Cuenta reutiliza los fondos de categoría, `DESIGN_SYSTEM.md` §4 | No | Sí | No se toca: la 001 no construye pantallas de Cuenta | No |
| Stack de UI sugerido, handoff §Stack de UI | No | **No** — cerrado por §15.2 y §7.1 | Phosphor + `AppIcon`, `motion` y `next/font` se usan tal cual (R1) | No |
| Texto ampliado hasta 200 %, handoff §Accesibilidad | No | **No** — requisito obligatorio | Se aplica y se prueba en el PR (FR-039) | No |

No tocados: SharedBalance, GoalStack, ChangePreview, FundingLedger,
ConfirmationBadge y PlanningNote. **Ningún `[P]` con alcance «Sí» está sin
aprobar.**

### Verificaciones `[V]` que toca el slice

Separadas según ADR-012 §2.

**Deciden cómo se construye — ejecutados antes de cerrar el plan:**

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Script de tema bloqueante con App Router, `DESIGN_SYSTEM.md` convención | Decide cómo se construye | **Pegada en research R2.** Next 16.4.4: atributo puesto antes de `<body>`; primer cuadro `[18,20,22]` en oscuro y `[247,243,235]` en claro con CPU 6× y red lenta; el control con `useEffect` sí destella; respaldo sin JS correcto; cero errores de hidratación con `suppressHydrationWarning` y error de React sin él | No — **verificado** |
| Versiones estables y compatibles del stack, maestro §7.1 | Decide cómo se construye | **Pegada en research R1.** Instalación, `next build`, `tsc --noEmit`, `eslint`, Vitest y Playwright con las versiones fijadas. Dos incompatibilidades encontradas y evitadas: TypeScript 7 y ESLint 10 frente a los peers de `eslint-config-next` | No — **verificado**, con la advertencia de ESLint 9 sin soporte (R1.3) |
| Herramienta y configuración de la regla de hex crudos y esperas fijas, ADR-011 `[V]` 5 y pregunta abierta 2 | Decide cómo se construye | **Pegada en research R3.** `no-restricted-syntax` en TS/TSX y en CSS con `@eslint/css` (`Hash` + `Raw`); falla en los seis casos de los fixtures y pasa en código limpio | No — **verificado** |
| Demostración de `speckit-plan`, ADR-012 `[V]` 1 y enmienda §3.4 | Decide si la adopción se revisa | **Esta sección**, ejecutada antes y después del diseño. La revisa el revisor del PR del plan | No, si el revisor la acepta |

**Comprueban lo construido — se ejecutan en la implementación y su salida va al PR:**

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Icono `scales` de Phosphor para Balance, `docs/design/README.md` Log de cambios | Comprueba lo construido | Pendiente. *Indicio del ensayo, no verificación:* `Scales` se importa y compila en 2.1.10 (R1). Falta compararlo con el comp en el rail y el sidebar | No |
| Contraste en dispositivos reales, `DESIGN_SYSTEM.md` §4 | Comprueba lo construido | Pendiente | No |
| Sombras táctiles en gama media, `DESIGN_SYSTEM.md` §4 | Comprueba lo construido | Pendiente | No |
| VoiceOver, TalkBack y axe, handoff §Accesibilidad | Comprueba lo construido | Pendiente. axe en el job 5; lectores a mano en el PR | No |
| Umbrales aplicables de §15.7 | Comprueba lo construido | Pendiente: CLS en carga, INP al abrir Anotar, scroll horizontal, objetivos táctiles | No |
| Presupuestos de tiempo, ADR-011 `[V]` 1 | Comprueba lo construido | Pendiente: primera medición real; avisa, no bloquea | No |
| `vitest --changed` para el bucle local, ADR-011 `[V]` 6 | Comprueba lo construido | Pendiente | No |
| Licencias de Instrument Serif, Geist y Geist Mono, maestro §6.1 y supuesto «Fuentes» | Comprueba lo construido | Pendiente: se verifica al instalarlas | No |
| Superficie interna en un preview real de Vercel, FR-049 | Comprueba lo construido | Pendiente: no existe proyecto de Vercel (R4, «Lo que esto no prueba») | No |

No los toca la 001: altura del teclado nativo y teclados de terceros en Android
(P0-1, decisión 11), workers con parejas aisladas y forma del claim de RLS
(P0-1), View Transitions, scrim de fotos y abanico de metas (P0-3).

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-011 | Capas de prueba, tope de E2E, jobs 1, 2 y 5, reglas duras, presupuestos | Aceptado (3 nov 2026) | No |
| ADR-012 | Formato y gates de esta spec; demostración de `speckit-plan` | Aceptado (3 nov 2026), con enmienda §3.4 | No |
| Acceso a datos (ORM o `supabase-js`) | Nada: la 001 no tiene base de datos | Por escribir antes de P0-1 (§15.10) | No |

**La 001 no necesita un ADR nuevo.** Las decisiones de este plan son locales y
reversibles: nombres de ruta, ubicación de archivos, la compuerta de la ruta
interna, la versión de ESLint. Ninguna toca dinero, privacidad, arquitectura ni
contratos. Ver «Puntos para el revisor».

### Erratas que afectan al slice

| Errata | Qué afecta | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Ninguna pendiente | — | `docs/design/README.md`, «Erratas conocidas»: «No hay erratas pendientes». Las cinco anteriores (navegación de escritorio y `Settings`) están en el Log de cambios y la 001 las aplica | No |

### Conflictos entre documentos superiores

| Conflicto | Documentos | Qué dice la jerarquía (`AGENTS.md` §2) | PR de reconciliación | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| Personas: «color + patrón + inicial» [A] frente a «el patrón no está aprobado y en P0 no se usa» | Handoff §Accesibilidad / maestro §15.9 | Manda el maestro: Avatar sin patrón (FR-009). Registrado ya en la spec | No hace falta: el maestro ya lo resuelve | No |
| «Cambiar el contexto dispara la Context Transition» frente a «sin animación» | `COMPONENT_SPECIFICATIONS.md` §Tabs / decisión 10 | Manda el maestro; los fundadores precisaron en Clarify Q2 que la perilla se desliza y el contenido no. Registrado ya en la spec | No hace falta | No |
| **Nuevo.** `docs/TESTING.md` §10 dice que la herramienta de la regla de hex y el mecanismo de RLS «siguen abiertas a propósito y deciden los fundadores»; ADR-011 dice que RLS está cerrada (decisión 1) y que la herramienta «la resuelve la especificación 001» | `docs/TESTING.md` / ADR-011 | Manda ADR-011, y `docs/TESTING.md` lo dice de sí mismo («ante un conflicto manda la decisión de la que derivan»). El plan propone la herramienta (R3) y **la aprueba quien mergee este PR**, así que se cumplen las dos lecturas | **Por abrir**: un PR documental que actualice `docs/TESTING.md` §10. No se toca aquí: este PR es del plan | No: el texto es obsoleto, no contradice una decisión vigente |
| **Nuevo, lectura.** `docs/CONVENTIONS.md` A.1 pide carpetas en inglés; el maestro §15.3 da rutas en español (`/cuenta/*`) | `docs/CONVENTIONS.md` / maestro | `docs/CONVENTIONS.md` se subordina a sí mismo: «donde el maestro … ya den un identificador, manda ese identificador». Las rutas que el maestro no nombra siguen su precedente (R6) | No hace falta | No |

**Resultado del gate (antes de la Fase 0)**: **PASA.** Ningún `[P]` con alcance
sin aprobar, los tres `[V]` que deciden la construcción ejecutados con salida, los
ADR necesarios aceptados, cero erratas pendientes y ningún conflicto que contradiga
una decisión vigente.

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-foundation/
├── spec.md              # Specify + Clarify (PR #11)
├── plan.md              # Este archivo
├── research.md          # Fase 0: los tres [V] ejecutados y las decisiones del plan
├── data-model.md        # Fase 1: estado de interfaz, destinos, catálogo de copy
├── quickstart.md        # Fase 1: cómo validar la 001 de punta a punta
├── contracts/
│   ├── routes.md        # Rutas, estados y disponibilidad por destino
│   ├── primitives.md    # Contrato de los primitivos que consume P0-1
│   └── ci.md            # verify, jobs, resumen y presupuestos
├── checklists/
│   └── requirements.md  # De Specify
└── tasks.md             # Fase 2: NO lo crea este plan
```

### Source Code (repository root)

Sigue el maestro §7.2. Solo se crea lo que la 001 llena; las carpetas de §7.2 que
son de otros slices (`features/*`, `lib/db`, `lib/supabase`, `supabase/`…) **no se
crean vacías**. `src/domain/` sí existe, porque FR-003 lo pide y la regla de
dependencia necesita dónde aplicarse.

```text
.github/workflows/ci.yml              # Jobs 1, 2 y 5; resumen; presupuestos (contracts/ci.md)
eslint.config.mjs                     # next + reglas propias: hex, esperas fijas, dependencia de domain
next.config.ts
postcss.config.mjs
playwright.config.ts                  # proyecto a11y; reducedMotion: 'reduce'; Chromium; retries 0/1
vitest.config.mts                     # proyectos domain y components
vitest.setup.ts                       # cleanup de RTL
tsconfig.json
package.json · package-lock.json      # versiones exactas, packageManager, engines
scripts/
└── verify.mjs                        # lint + typecheck + domain + components; SQL/RLS «no aplicable»; tiempos
src/
├── app/
│   ├── layout.tsx                    # <html lang="es-CO" suppressHydrationWarning>, fuentes, script de tema
│   ├── globals.css                   # @import tailwindcss + tokens; @theme inline → var(--…)
│   ├── not-found.tsx                 # Estado «no encontrado» dentro del AppShell
│   ├── (app)/
│   │   ├── layout.tsx                # AppShell + aviso de versión base
│   │   ├── error.tsx                 # Estado de error dentro del shell
│   │   ├── page.tsx                  # Inicio
│   │   ├── actividad/page.tsx
│   │   ├── metas/page.tsx
│   │   ├── plan/page.tsx
│   │   ├── balance/page.tsx          # «todavía no disponible»
│   │   └── cuenta/page.tsx           # «la cuenta llega con el inicio de sesión»
│   └── (internal)/
│       └── interno/primitivos/page.tsx   # server-only; notFound() según la compuerta
├── components/
│   ├── ui/                           # Primitivos del paso 2 + base de diálogo
│   │   ├── app-icon.tsx
│   │   ├── avatar.tsx
│   │   ├── category-icon.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── amount-input.tsx
│   │   ├── segmented.tsx
│   │   ├── skeleton.tsx
│   │   ├── bottom-sheet.tsx          # Solo lo de FR-031a, sobre Radix Dialog
│   │   └── modal.tsx                 # Ídem, diálogo de 520 px
│   └── shell/                        # AppShell, navegación, selector, aviso de Anotar, estados provisionales
├── domain/                           # Vacío de reglas (FR-003); README con la regla de dependencia
├── lib/
│   ├── copy/es.ts                    # Catálogo de copy tipado (CONVENTIONS B.2)
│   ├── motion/tokens.ts              # Springs y duraciones de MOTION_SYSTEM (handoff paso 6)
│   ├── theme-script.ts               # Script bloqueante (R2)
│   ├── context-preference.ts         # Lectura y escritura de juntia:context (R5)
│   └── internal-surface.ts           # Compuerta de FR-049 (R4)
└── styles/
    └── tokens.css                    # ÚNICO archivo con hex
tests/
├── a11y/routes.a11y.ts               # Job 5: rutas × temas + no encontrado + superficie interna
└── lint-fixtures/                    # Un caso que debe fallar por regla propia
```

Las pruebas de Vitest van junto a lo que prueban (`*.test.ts`, `*.test.tsx`).

**Structure Decision**: un único proyecto Next.js en la raíz con `src/`, según
§7.1 («sin monorepo») y §7.2. Los nombres de archivo y carpeta van en inglés
(`docs/CONVENTIONS.md` A.1), salvo los segmentos de URL, que siguen al maestro
§15.3 (R6).

## Cómo se construye cada parte

Esto no es `tasks.md`: dice qué decisión técnica aplica a cada requisito y dónde
se comprueba. El orden y la granularidad de las tareas son de la fase siguiente.

### Tokens y temas (FR-004 a FR-007)

- `tokens.css` según el handoff paso 1: primitivos de `DESIGN_SYSTEM.md` §1 y
  semánticos de §2, en `:root, [data-theme="light"]` y `[data-theme="dark"]`, más
  el bloque de respaldo `@media (prefers-color-scheme: dark) :root:not([data-theme])`
  (R2). Personas solo `person.1–2`. Categorías, elevación, radios, espacio,
  breakpoints y capas como variables. `color-scheme` por tema.
- Los tokens van en **selectores de atributo**, no solo en `:root`, para que la
  superficie interna anide `data-theme` y muestre los dos temas a la vez.
- `globals.css` mapea a Tailwind con `@theme inline`. `tabular-nums` global.
  Transición de color de 180 ms solo con `prefers-reduced-motion: no-preference`.
- Fuentes con `next/font/google`: Instrument Serif 400 normal e itálica, Geist
  400–600, Geist Mono 500, como variables CSS. El build descarga las fuentes: CI
  necesita red (lo tiene).
- Sin `<meta name="theme-color">` (R2, punto 6).

### Primitivos (FR-008 a FR-017)

Contrato público en [contracts/primitives.md](contracts/primitives.md). Notas de
construcción:

- **AppIcon**: mapa tipado `nombre → componente` con imports individuales desde
  `@phosphor-icons/react/dist/ssr/*` (funcionan en servidor y cliente, R1);
  `aria-hidden` salvo que reciba `label`.
- **Segmented**: `role="radiogroup"` o `"tablist"` por prop; foco itinerante y
  flechas ←/→ escritos a mano; perilla con `motion` `layoutId` y spring `snappy`;
  con `useReducedMotion()`, `duration: 0`.
- **AmountInput**: `<input inputmode="numeric">` controlado sobre una cadena de
  dígitos; formatea con `Intl.NumberFormat('es-CO')` sin decimales; tope de 9
  dígitos; al pegar conserva solo dígitos y, sin dígitos, no cambia; devuelve
  `number | null` en **pesos enteros** (vacío = `null`, no 0). Reduce el tamaño con
  `clamp` hasta 28 px. Error con `aria-invalid`, `aria-errormessage` y región
  `aria-live="polite"`. No crea tipos de dinero (FR-003, FR-014).
- **Button**: estado `loading` con ancho fijado al del contenido inicial, para que
  no salte.
- **Skeleton**: retardo de 300 ms antes de aparecer; pulso de opacidad en CSS;
  estático con movimiento reducido.
- **BottomSheet y Modal**: los dos sobre `@radix-ui/react-dialog` (foco atrapado,
  Escape, retorno del foco, `role="dialog"`); aparición con Motion (`sheet` y
  escala .98 → 1) y solo opacidad con movimiento reducido; hoja con
  `env(safe-area-inset-bottom)`. Sin paradas, arrastre ni confirmación de descarte
  (FR-031a).

### AppShell y navegación (FR-018 a FR-024)

- Un componente `AppShell` con tres composiciones por CSS (`md`, `lg`, `xl`),
  no tres árboles: barra inferior por debajo de 1024 (centrada, máx. 560, desde
  768), rail de 76 de 1024 a 1279 y sidebar de 248 desde 1280.
- Destinos en un único arreglo tipado (data-model.md); Balance marcado
  `desktopOnly`. Activo por `usePathname()`, con `aria-current="page"` e icono Fill.
- Anotar: un solo disparador lógico por composición; el aviso lo abre el
  disparador visible, y el atajo `N` un listener en `document` que ignora
  `input`, `textarea`, `select`, `contenteditable` y el caso de aviso ya abierto.
- El aviso elige hoja o diálogo con `matchMedia('(min-width: 768px)')`; si el
  ancho cruza 768 con el aviso abierto, cambia de contenedor sin cerrarse y
  conserva el foco dentro (caso límite).
- «Ir al contenido» como primer enfocable; `<nav aria-label>`.

### Selector Yo/Nosotros (FR-025 a FR-027)

- Segmented en modo `radiogroup`. Arriba a la derecha del contenido por debajo de
  1280 y dentro del sidebar desde 1280; un solo estado compartido.
- Recuerdo según R5. Anuncio por una región `aria-live="polite"` montada una vez
  en el shell. Sin Context Transition: el contenido no cambia.

### Comportamiento provisional (FR-028 a FR-034)

- Aviso de versión base en el layout de `(app)`, siempre visible y sin control de
  cierre, compuesto con primitivos (no `LimitNote`).
- Estados vacíos con un ícono Duotone en ficha (la misma geometría de
  `CategoryIcon`) y texto del catálogo; sin controles que aparenten funcionar.
- Todo el texto sale de `src/lib/copy/es.ts`; ninguna cadena nombra «P0-1» ni
  promete fechas (FR-034). La redacción final se revisa en el PR (supuesto «El copy
  final se revisa en el PR»).

### Superficie interna (FR-049 a FR-053)

Según R4: `/interno/primitivos`, compuerta `isInternalSurfaceEnabled`, `notFound()`
si está cerrada, `server-only`, `robots` sin indexar. Contenido según FR-050:
cada primitivo en sus estados, los dos temas lado a lado, valores sacados de
`COMPONENT_SPECIFICATIONS.md` (por ejemplo 999.999.999 en AmountInput) y un
encabezado y una nota visibles que los identifican como valores de prueba. Nunca
el caso de octubre ni la tabla de DEC-G04.

### Pruebas por capa (FR-045, FR-047)

Cada criterio en la capa más baja que detecta su fallo (`docs/TESTING.md` §4).

| Qué se comprueba | Capa | Dónde | Requisitos |
| --- | --- | --- | --- |
| Hex crudo fuera de `tokens.css`; esperas fijas en pruebas de navegador | Lint | `eslint.config.mjs` + `tests/lint-fixtures/` | FR-006, FR-044, US-7.3 |
| `domain` no importa interfaz ni SDK | Lint (`no-restricted-imports`) | `eslint.config.mjs` | FR-003 |
| Los fixtures de lint siguen fallando (que nadie desactive una regla sin que se note) | Vitest `components`, sin DOM, con la API de ESLint | `tests/lint-fixtures/lint-rules.test.ts` | FR-006, FR-044 |
| Respaldo sin JS idéntico al bloque oscuro | Vitest `components`, sin DOM | `src/styles/tokens.test.ts` | FR-005, caso límite sin JS |
| Compuerta por destino; la página interna llama `notFound()` con `VERCEL_ENV=production` | Vitest `components` | `src/lib/internal-surface.test.ts`, `src/app/(internal)/…/page.test.tsx` | FR-049, **FR-053** |
| AmountInput: formato, tope, pegado, vacío ≠ 0, error accesible | RTL | `amount-input.test.tsx` | FR-014, US-6.1–6.3 |
| Selector: cambio con clic y flechas, recuerdo, almacenamiento bloqueado, anuncio | RTL | `context-selector.test.tsx` | FR-025–FR-027, US-4 |
| Anotar: aviso sin campos, `N` (y no en un campo ni con el aviso abierto), Escape, cierre, foco atrapado y devuelto | RTL | `annotate-notice.test.tsx` | FR-031, US-3 |
| Ninguna cifra, «$», «%», «Al día» ni «le debe» en el contenido visible y accesible de cada ruta de producto | RTL | `product-routes.test.tsx` | FR-029, SC-004 |
| Cero violaciones serias o críticas en cada ruta, los dos temas; superficie interna encontrada | E2E barato por ruta (axe) | `tests/a11y/routes.a11y.ts` | FR-043, FR-051, FR-052, SC-002 |
| Primer cuadro en el tema del sistema, sin destello, CLS = 0 | Medición del PR (no suite) | El arnés de R2 se reutiliza a mano en el PR | SC-006 |
| Composición a 360–1440, motion, contraste, legibilidad del aviso, copy | Revisión humana del PR | Capturas 390 y 1440 × 2 temas | SC-001, SC-008, ADR-011 §7 |

No se escribe un test por primitivo: Badge, Avatar, CategoryIcon, Skeleton y
Button se comprueban con axe en la superficie interna y en la revisión humana; RTL
solo en los flujos críticos que nombra FR-045. **Specs E2E que añade la 001: 0.**

### CI y `verify` (FR-042 a FR-046)

Detalle en [contracts/ci.md](contracts/ci.md). En corto: `npm run verify` ejecuta
`scripts/verify.mjs`, que corre lint, typecheck, Vitest `domain` y Vitest
`components`, imprime la duración de cada uno contra su presupuesto y declara
«SQL/RLS: no aplicable — lo incorpora P0-1». El workflow tiene tres jobs en
paralelo, mide y publica sus duraciones y avisa sin fallar.

## Constitution Check — repetición después del diseño

Repasada contra research.md, data-model.md y contracts/.

| Comprobación | Resultado |
| --- | --- |
| ¿El diseño introduce algún `[P]` nuevo o amplía uno? | No. `/cuenta` sigue sin anatomía de AccountButton; el aviso de Anotar no tiene campos; el script de tema no persiste nada; solo `person.1–2` |
| ¿Implementa algo de un `[P]` con alcance sin aprobar? | No |
| ¿Algún `[V]` que decide la construcción quedó sin salida? | No: los tres tienen salida en research R1–R3; la demostración de `speckit-plan` es este documento |
| ¿Se marcó como resuelto un `[V]` que comprueba lo construido? | No: todos siguen «pendiente» para el PR; `scales` solo tiene un indicio |
| ¿Aparece una decisión significativa o difícil de revertir? | No. Las decisiones del plan (rutas, compuerta, ESLint 9, sin shadcn CLI ni Vaul, Segmented a mano, `localStorage`) se revierten cambiando código de la 001 y no tocan dinero, privacidad ni contratos |
| ¿El diseño crea tipos de dinero, contexto de datos o `scope`? | No: AmountInput devuelve `number \| null` en pesos; el contexto es `"me" \| "us"` de interfaz (data-model.md) |
| ¿Usa el caso de octubre o la tabla de DEC-G04? | No, ni en pruebas ni en la superficie interna |
| ¿Añade dependencias fuera de §7.1 o que la 001 no usa? | No: `server-only` es del propio ecosistema de Next; `@eslint/css` es el lenguaje CSS oficial de ESLint, herramienta de desarrollo que sustituye a Stylelint |
| ¿Añade specs E2E? | No, cero |
| ¿Adelanta infraestructura de P0-1 (Supabase, migraciones, siembra)? | No; los jobs 3 y 4 se declaran no aplicables |
| Conflictos nuevos | El de `docs/TESTING.md` §10, no bloqueante, con PR documental por abrir |

**Resultado del gate (después del diseño)**: **PASA.**

## Puntos para el revisor

No bloquean el plan, pero son elecciones que el revisor puede querer hacer
distinto. Ninguna necesita ADR, por las razones de la tabla anterior.

**Revisión del gestor, 3 de noviembre de 2026:** el punto 1 se queda en ESLint
9.39.5 (la subida a 10 es un PR propio cuando los tres plugins la declaren); el
punto 2 y el nombre de la ruta interna, de acuerdo, con carpetas en kebab-case;
el punto 5 lo corrige el gestor en un PR documental aparte. La verificación en
un preview real de Vercel queda como `[V]` del PR de implementación.

1. **ESLint 9.39.5 está marcado sin soporte** por npm, y ESLint 10 funciona igual
   pero con tres plugins que no lo declaran (R1.3). El plan elige 9 por la
   compatibilidad declarada.
2. **Rutas en español** (`/actividad`, `/metas`, `/plan`, `/balance`) por el
   precedente de `/cuenta` (R6).
3. **Nombre `/interno/primitivos`** y la bandera `JUNTIA_INTERNAL_SURFACE` (R4).
4. **Sin CLI de shadcn/ui ni Vaul**; Segmented escrito a mano (R1.4).
5. **`docs/TESTING.md` §10 está desactualizado** respecto a ADR-011 y a la
   decisión 1: necesita un PR documental aparte.

## Complexity Tracking

Sin entradas: el plan no añade proyectos, capas ni patrones que haya que
justificar.
