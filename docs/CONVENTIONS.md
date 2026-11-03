# CONVENTIONS.md — Nombres e idioma · Juntia

Este documento tiene **dos bloques con autoridad distinta**, y la diferencia
importa:

- **Bloque A — convenciones derivadas de la documentación existente.** El
  maestro o el paquete de diseño ya las aplican; aquí solo se hacen explícitas
  y se cita de dónde salen. No decide nada nuevo.
- **Bloque B — convenciones nuevas, aprobadas en la revisión del PR #2.** Nadie
  las había aprobado antes. Son decisiones, no descripciones, y se marcan como
  tales.

**Por qué no hay ADR.** Las cuatro convenciones del Bloque B son reglas de
oficio: afectan a cómo se escribe el código, no a la arquitectura, los
contratos de dinero ni la privacidad. **Un documento de convenciones aprobado
por revisión basta mientras una convención no implique un cambio arquitectónico
mayor**; si alguna llegara a implicarlo —por ejemplo adoptar una librería de
i18n con su frontera server/client—, esa sí va a un ADR en `docs/adr/` antes de
implementarse (`AGENTS.md` punto 17).

Autoridad: `docs/JUNTIA_MASTER.md` prevalece sobre este archivo. Donde el
maestro o el paquete de `docs/design/` ya den un identificador, **manda ese
identificador** y este documento no lo renombra.

---

## 1. Resumen: la tabla de idioma

| Capa | Idioma | Bloque |
| --- | --- | --- |
| Identificadores, tipos, funciones | Inglés | **A** — derivada (§7.2, §7.3, handoff) |
| Esquema de base de datos | Inglés | **A** — derivada (§7.3) |
| Nombres de archivo y carpetas | Inglés | **A** — derivada (§7.2) |
| Strings de interfaz | Español es-CO | **A** — derivada (BRAND §4) |
| Documentación | Español | **A** — derivada (el corpus entero) |
| Comentarios | Español | **A** — derivada, por coherencia con la documentación |
| Commits y PRs | **Inglés** | **B** — **nueva**, aprobada en la revisión del PR #2 |

Las cinco métricas de DEC-G04 son la única excepción a «identificadores en
inglés», y es del **Bloque A**: el maestro §15.4 ya las escribe en español.

---

# Bloque A — Convenciones derivadas de la documentación existente

Nada de esta sección es una decisión nueva. Cada regla cita el documento
aprobado que ya la aplica.

## A.1 Identificadores, esquema, archivos y carpetas en inglés

- **Carpetas y archivos** — maestro **§7.2** fija la estructura en inglés:
  `features/expenses`, `features/goals`, `domain/money`, `domain/allocations`,
  `domain/balances`, `domain/budgets`, `lib/supabase`, `lib/security`,
  `styles/tokens.css`.
- **Esquema** — maestro **§7.3** nombra todas las tablas en inglés: `profiles`,
  `groups`, `group_members`, `group_invitations`, `categories`, `transactions`,
  `transaction_allocations`, `budgets`, `savings_goals`, `goal_ledger_entries`,
  `goal_usage_allocations`, `goal_usage_confirmations`, `audit_events`,
  `idempotency_records`, `member_history_snapshots`. Y las columnas:
  `payer_user_id`, `from_user_id`, `to_user_id`, `owner_user_id`, `group_id`,
  `transaction_id`, `transaction_date`, `funding_mode`, `idempotency_key`.
- **Métricas de dominio** — maestro **§5.1** nombra en inglés `group_total`,
  `personal_consumption`, `gross_paid`, `net_cash_outflow`, `net_owed`,
  `settlement`, `goal_contribution`, `goal_withdrawal`, `goal_usage`; y
  **DEC-G05** añade `goal_balance`, `progress`, `target`.
- **Funciones y componentes** — `docs/design/HANDOFF_CLAUDE_CODE.md` usa
  `computeBalance(expenses, settlements, members)`, `AppIcon`, `ThemeProvider`;
  `docs/design/COMPONENT_SPECIFICATIONS.md` usa `ExpenseRow`, `SharedBalance`,
  `GoalCard`, `GoalStack`, `BudgetIndicator`, `AppShell`, `BottomSheet`,
  `ChangePreview`, `FundingLedger`, `ConfirmationBadge`, `PlanningNote`,
  `AccountButton`, `ProfileHeader`, `AccountMenuItem`, `ThemeSelector`,
  `CoupleStatus`, `SensitiveActionConfirmation`, `LimitNote`.

**Convenciones por tipo de artefacto**, leídas de lo anterior: `camelCase` para
funciones y variables, `PascalCase` para componentes y tipos, `snake_case` para
tablas y columnas (es lo que ya usa §7.3), `kebab-case` para archivos y
carpetas de rutas.

Un identificador nuevo se escribe en inglés aunque el concepto se discuta en
español. El puente entre ambos es `docs/GLOSSARY.md`, no la memoria de quien
programa. **Ningún string visible se traduce en el identificador:**
`ExpenseRow` renderiza «Gasto»; el componente no se llama `FilaDeGasto`.

## A.2 Strings de interfaz en español de Colombia

`docs/design/BRAND_FOUNDATION.md` §4: «Tuteo, frases cortas, español de
Colombia, COP sin decimales: `$186.500`». La tabla «Así sí / Así no» de esa
sección prohíbe palabras concretas; están recogidas en `docs/GLOSSARY.md` §9.

## A.3 Documentación y comentarios en español

Lo son el maestro, los seis documentos de `docs/design/`, `AGENTS.md` y
`CLAUDE.md`. Los comentarios siguen a la documentación por coherencia: quien
lee un comentario está leyendo prosa, no un identificador.

## A.4 La excepción: las cinco métricas de DEC-G04

**Se quedan en español**, exactamente como las escribe el maestro §15.4 y
DEC-G04. Esto es derivado, no nuevo: el maestro ya las nombra así.

| Métrica | Qué es |
| --- | --- |
| `gasto_consumo` | Compras y servicios reales del periodo |
| `aporte_a_metas` | Asignaciones a metas del periodo |
| `retiro_de_metas` | Dinero desasignado en el periodo |
| `gasto_financiado_con_meta` | Parte de un gasto real pagada con fondos ya asignados |
| `total_destinado_neto` | `gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta` |

**Por qué el maestro las dejó en español.** No son detalles de implementación:
son **los nombres de un contrato financiero**, con una fórmula aprobada
(maestro §15.4) y una tabla de verificación de siete filas en
`docs/design/HANDOFF_CLAUDE_CODE.md` que los tests deben reproducir fila por
fila. Los criterios de aceptación de P0 los nombran literalmente. Traducirlos
mete una traducción mental en el punto más delicado del sistema: justo donde no
se puede confundir gasto con ahorro. Un `consumptionSpend` que a veces es
`gasto_consumo` y a veces no es exactamente el error que DEC-G04 existe para
impedir.

Son **cinco nombres**. No son una puerta abierta a nombrar en español lo demás.

**Alcance de la excepción:** cubre estas cinco métricas en el dominio, en los
tests y en los nombres de las funciones puras que las calculan. **No cubre** las
columnas de base de datos ni los componentes que las muestran: el componente que
presenta `total_destinado_neto` se llama `PlanningNote`
(`COMPONENT_SPECIFICATIONS.md`), en inglés.

---

# Bloque B — Convenciones nuevas, aprobadas en la revisión del PR #2

**Las cuatro reglas de este bloque son nuevas.** No estaban en el maestro ni en
el paquete de diseño, y **nadie las había aprobado antes**: se aprobaron en la
revisión independiente del PR #2, no en una decisión anterior. Se registran aquí
con su razón para que cualquiera pueda objetarlas sabiendo que son decisiones y
no descripciones.

Las cuatro son reglas de oficio y no cambian la arquitectura, por lo que no
requieren ADR (ver la nota del encabezado).

## B.1 Ninguna cadena visible se escribe inline en JSX

**Nueva.** El copy de producto vive en el módulo de copy (B.2), no repartido por
los componentes.

**Por qué.** El motivo inmediato no es el idioma: es que
`BRAND_FOUNDATION.md` §4 prohíbe palabras concretas —«Depositado»,
«Total gastado», «Pagado» sin transferencia verificada, «Invertir»— y esa
prohibición solo es auditable si las cadenas viven en un sitio. Repartidas por
cien componentes, nadie puede comprobarla.

### Qué se centraliza

El **copy estático y parametrizable de producto**:

- Etiquetas, títulos, textos de ayuda, estados vacío/carga/error.
- Mensajes con parámetros: «Faltan {monto} por asignar».
- **Nombres accesibles:** `aria-label`, `aria-description` y los nombres de
  elementos de solo ícono. Son copy de producto aunque no se vean, y
  `COMPONENT_SPECIFICATIONS.md` los especifica literalmente.

### Qué queda fuera

La regla **no** alcanza:

- **Valores derivados de datos.** Un importe formateado, una fecha, un
  porcentaje, el nombre de una categoría que viene de `categories`. El formato
  de dinero es una función de dominio sobre `Money` (§7.2 `domain/money`) que
  el copy interpola; no es una cadena del catálogo.
- **Contenido introducido por el usuario.** Nombres de meta, descripciones de
  gasto, nombres visibles de perfil. Se renderizan tal cual, nunca se traducen
  ni se normalizan contra el catálogo.
- **Mensajes de diagnóstico no visibles en la interfaz final.** Errores de
  desarrollo, `console`, mensajes de excepción internos, textos de test. Si un
  error llega a verse en pantalla, entonces **sí** necesita su copy de producto:
  lo que se muestra a la persona nunca es el mensaje técnico crudo.

El criterio es: **¿lo lee una persona usando Juntia, y lo escribimos nosotros?**
Si la respuesta a las dos es sí, va al catálogo.

## B.2 Módulo de copy tipado

**Nueva.** **Especificación, no implementación** — no existe scaffold todavía;
este módulo lo crea la primera especificación de ingeniería.

- **Ubicación propuesta:** `src/lib/copy/es.ts`.
- **Acceso por helper tipado**, no por claves con puntos en una cadena: se
  quiere que un string inexistente o un parámetro faltante sean **errores de
  tipo**, no fallos en tiempo de ejecución. Una clave `'home.hero.title'` como
  string no da esa garantía; un objeto anidado tipado sí.
- El alcance de lo que entra en el catálogo es el de B.1.

## B.3 Sin librería de i18n en MVP-1

**Nueva.** Es una decisión de no adoptar una dependencia, no un hecho previo.

**Lo caro ya está resuelto.** El formato de moneda es lo costoso de
internacionalizar, y el handoff ya lo fijó sin dependencias:

```
Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
```

más `font-variant-numeric: tabular-nums` global (`DESIGN_SYSTEM.md` y
`HANDOFF_CLAUDE_CODE.md` §Stack de UI). Eso es **API del navegador**: cero
bundle, cero configuración.

**Lo que añadiría una librería.** `next-intl` o `react-i18next` traerían
catálogos, namespaces, sintaxis de interpolación propia, configuración de
pluralización —trivial en español—, complejidad en la frontera server/client de
App Router, peso de bundle y un paso de extracción en el build. A cambio de **un
segundo idioma hipotético para dos usuarios**. Choca con `AGENTS.md` punto 13
(«instalar únicamente herramientas necesarias para el slice») y punto 19 («no
crear capas o dependencias que el slice actual no necesita»).

**Camino de subida, documentado.** Si algún día se quiere inglés: `es.ts` se
convierte en un catálogo, el accesor tipado se reimplementa sobre
`useTranslations` (o equivalente) y **la estructura de claves sobrevive
intacta**. La migración toca el accesor, no las invocaciones. No se cierra la
puerta; solo no se paga todavía. Adoptar la librería sí sería un cambio
estructural y entonces sí tocaría ADR.

## B.4 Conventional Commits y PRs en inglés

**Nueva.** El maestro y `AGENTS.md` piden PRs pequeños y demostrables
(punto 15), pero **no fijaban idioma ni formato de commit**.

### Commits

Conventional commits, en inglés. Prefijos admitidos: `feat:`, `fix:`, `chore:`,
`docs:`, `test:`.

```
feat: add expense allocation editor to the expense sheet
fix: keep budget_remaining null when no active budget exists
docs: document naming conventions and the domain glossary
```

### Ramas

Por slice, en inglés y `kebab-case`, con el mismo prefijo que el tipo de
trabajo: `feat/expense-flow`, `docs/conventions-and-glossary`,
`chore/frontend-foundation`.

### Pull requests

En inglés, con el contenido que ya pide `AGENTS.md` punto 15: objetivo,
archivos, decisiones, comandos ejecutados con sus resultados, capturas móvil y
escritorio, riesgos y pendientes.

### Términos del dominio dentro de un PR en inglés

**Citar términos de negocio en español dentro de un PR en inglés es correcto y
esperado.** No es mezcla sucia: son el vocabulario del producto.

> Adds the pure function that computes `total_destinado_neto`. Note that
> `aporte_a_metas` is not consumption and must not be folded into the expense
> total — see DEC-G04.

Lo que no se hace es lo contrario: traducir un identificador al vuelo en la
prosa («the net allocated total») y dejar al lector adivinando a qué métrica se
refiere.

---

## 2. Cómo se verifica esto

Este documento describe convenciones; **no define reglas de lint ni de CI**, que
son trabajo de otra especificación. Mientras no existan, se verifica en la
revisión del PR:

- ¿Hay algún identificador nuevo en español que no sea una de las cinco métricas
  de DEC-G04? (A.1, A.4)
- ¿Hay alguna cadena de copy de producto escrita inline en JSX, según el alcance
  de B.1?
- ¿Algún término de negocio nuevo entró al código sin su fila en
  `docs/GLOSSARY.md`?
- ¿Alguna cadena usa una palabra que `BRAND_FOUNDATION.md` §4 prohíbe?

## 3. Referencias

- `docs/JUNTIA_MASTER.md` §5 (dominio y reglas de dinero), §7.1–7.3
  (arquitectura, estructura y modelo relacional), §15 (decisiones P0 cerradas).
- `docs/design/HANDOFF_CLAUDE_CODE.md`: DEC-G04 con su tabla de verificación,
  stack de UI, reglas de negocio de la UI.
- `docs/design/BRAND_FOUNDATION.md` §4: voz, microcopy y la tabla «Así sí / Así
  no».
- `docs/design/COMPONENT_SPECIFICATIONS.md`: nombres de componentes y estados.
- `docs/GLOSSARY.md`: el puente término de negocio ↔ identificador ↔ string.
- `AGENTS.md` puntos 13, 15, 17 y 19.
