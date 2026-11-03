# CONVENTIONS.md — Nombres e idioma · Juntia

Este documento **hace explícita** una decisión que el maestro ya tomó; no abre
una nueva. Cada regla cita de dónde sale.

Autoridad: `docs/JUNTIA_MASTER.md` prevalece sobre este archivo. Donde el
maestro o el paquete de `docs/design/` ya den un identificador, **manda ese
identificador** y este documento no lo renombra.

---

## 1. La regla: artefactos de código en inglés, prosa en español

| Capa | Idioma |
| --- | --- |
| Identificadores, tipos, funciones | Inglés |
| Esquema de base de datos | Inglés |
| Nombres de archivo y carpetas | Inglés |
| Strings de interfaz | Español es-CO |
| Documentación | Español |
| Comentarios | Español |
| Commits y PRs | **Inglés** |

### De dónde sale

No es una preferencia nueva: es lo que los documentos aprobados ya hacen.

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
- **Strings de interfaz en español de Colombia** —
  `docs/design/BRAND_FOUNDATION.md` §4: «Tuteo, frases cortas, español de
  Colombia, COP sin decimales: `$186.500`».
- **Documentación en español** — lo son el maestro, los seis documentos de
  diseño, `AGENTS.md` y `CLAUDE.md`.

### Qué significa en la práctica

- Un identificador nuevo se escribe en inglés aunque el concepto se discuta en
  español. El puente entre ambos es `docs/GLOSSARY.md`, no la memoria de quien
  programa.
- **Ningún string visible se traduce en el identificador.** `ExpenseRow`
  renderiza «Gasto»; el componente no se llama `FilaDeGasto`.
- Convenciones por tipo de artefacto: `camelCase` para funciones y variables,
  `PascalCase` para componentes y tipos, `snake_case` para tablas y columnas
  (es lo que ya usa §7.3), `kebab-case` para archivos y carpetas de rutas.

---

## 2. La única excepción: las cinco métricas de DEC-G04

**Se quedan en español**, exactamente como las escribe el maestro §15.4 y
DEC-G04:

| Métrica | Qué es |
| --- | --- |
| `gasto_consumo` | Compras y servicios reales del periodo |
| `aporte_a_metas` | Asignaciones a metas del periodo |
| `retiro_de_metas` | Dinero desasignado en el periodo |
| `gasto_financiado_con_meta` | Parte de un gasto real pagada con fondos ya asignados |
| `total_destinado_neto` | `gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta` |

### Por qué

No son detalles de implementación. Son **los nombres de un contrato
financiero**: tienen una fórmula aprobada (maestro §15.4) y una tabla de
verificación de siete filas en `docs/design/HANDOFF_CLAUDE_CODE.md` que los
tests deben reproducir fila por fila. Los criterios de aceptación de P0 los
nombran literalmente.

Traducirlos mete una traducción mental en el punto más delicado del sistema:
justo donde no se puede confundir gasto con ahorro. Un `consumptionSpend` que a
veces es `gasto_consumo` y a veces no es exactamente el error que DEC-G04
existe para impedir.

Son **cinco nombres**, documentados, con la razón escrita. No son una puerta
abierta a nombrar en español lo demás.

**Alcance de la excepción:** cubre estas cinco métricas en el dominio, en los
tests y en los nombres de las funciones puras que las calculan. **No cubre** las
columnas de base de datos ni los componentes que las muestran: el componente que
presenta `total_destinado_neto` se llama `PlanningNote`
(`COMPONENT_SPECIFICATIONS.md`), en inglés.

---

## 3. Sin librería de i18n en MVP-1

### Lo caro ya está resuelto

El formato de moneda es lo costoso de internacionalizar, y el handoff ya lo fijó
sin dependencias:

```
Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
```

más `font-variant-numeric: tabular-nums` global (`DESIGN_SYSTEM.md` §tipografía
y `HANDOFF_CLAUDE_CODE.md` §Stack de UI). Eso es **API del navegador**, cero
bundle, cero configuración.

### Lo que añadiría una librería

`next-intl` o `react-i18next` traerían catálogos, namespaces, sintaxis de
interpolación propia, configuración de pluralización —trivial en español—,
complejidad en la frontera server/client de App Router, peso de bundle y un paso
de extracción en el build. A cambio de **un segundo idioma hipotético para dos
usuarios**.

Eso choca con `AGENTS.md` punto 13 («instalar únicamente herramientas necesarias
para el slice») y punto 19 («no crear capas o dependencias que el slice actual
no necesita»).

### En su lugar: un módulo de copy tipado

**Especificación, no implementación.** No existe scaffold todavía; este módulo
lo crea la primera especificación de ingeniería.

- **Ubicación propuesta:** `src/lib/copy/es.ts`.
- **Acceso por helper tipado**, no por claves con puntos en una cadena: se
  quiere que un string inexistente o un parámetro faltante sean **errores de
  tipo**, no fallos en tiempo de ejecución. Una clave `'home.hero.title'` como
  string no da esa garantía; un objeto anidado tipado sí.
- **Regla dura: ninguna cadena visible se escribe inline en JSX.** Incluye
  etiquetas de botón, `aria-label`, textos de estado vacío, mensajes de error y
  nombres accesibles. El motivo inmediato no es el idioma: es que
  `BRAND_FOUNDATION.md` §4 prohíbe palabras concretas («Depositado»,
  «Total gastado», «Pagado» sin transferencia verificada) y esa prohibición solo
  es auditable si las cadenas viven en un sitio.
- **El formato de dinero no vive en el copy.** Es una función de dominio sobre
  `Money` (maestro §7.2 `domain/money`), que el copy interpola.

### Camino de subida, documentado

Si algún día se quiere inglés: `es.ts` se convierte en un catálogo, el accesor
tipado se reimplementa sobre `useTranslations` (o equivalente) y **la estructura
de claves sobrevive intacta**. La migración toca el accesor, no las ~500
invocaciones. No se cierra la puerta; solo no se paga todavía.

---

## 4. Convenciones de git

### Commits

**Conventional commits, en inglés.** Prefijos admitidos: `feat:`, `fix:`,
`chore:`, `docs:`, `test:`.

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

En inglés, siguiendo `AGENTS.md` punto 15: objetivo, archivos, decisiones,
comandos ejecutados con sus resultados, capturas móvil y escritorio, riesgos y
pendientes.

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

## 5. Cómo se verifica esto

Este documento describe convenciones; **no define reglas de lint ni de CI**, que
son trabajo de otra especificación. Mientras no existan, se verifica en la
revisión del PR:

- ¿Hay algún identificador nuevo en español que no sea una de las cinco métricas
  de DEC-G04?
- ¿Hay alguna cadena visible escrita inline en JSX?
- ¿Algún término de negocio nuevo entró al código sin su fila en
  `docs/GLOSSARY.md`?
- ¿Alguna cadena usa una palabra que `BRAND_FOUNDATION.md` §4 prohíbe?

---

## 6. Referencias

- `docs/JUNTIA_MASTER.md` §5 (dominio y reglas de dinero), §7.1–7.3
  (arquitectura, estructura y modelo relacional), §15 (decisiones P0 cerradas).
- `docs/design/HANDOFF_CLAUDE_CODE.md`: DEC-G04 con su tabla de verificación,
  stack de UI, reglas de negocio de la UI.
- `docs/design/BRAND_FOUNDATION.md` §4: voz, microcopy y la tabla «Así sí / Así
  no».
- `docs/design/COMPONENT_SPECIFICATIONS.md`: nombres de componentes y estados.
- `docs/GLOSSARY.md`: el puente término de negocio ↔ identificador ↔ string.
- `AGENTS.md` puntos 13, 15 y 19.
