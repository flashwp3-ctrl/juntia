# HANDOFF_CLAUDE_CODE.md — Juntia v1 · I2 Bosque & Arena
Lote 5 de 5. Paquete de diseño listo para revisión. **Todavía no se implementa nada:** esta especificación se usa después de la aprobación.

## Fuentes de verdad
- Producto: `../JUNTIA_MASTER.md` (prevalece sobre este paquete ante cualquier conflicto).
- Tokens: `DESIGN_SYSTEM.md` · Componentes: `COMPONENT_SPECIFICATIONS.md` · Motion: `MOTION_SYSTEM.md` · Responsive: `RESPONSIVE_SPECIFICATIONS.md` · Marca: `BRAND_FOUNDATION.md`.
- Visual: `Juntia DS v1 - 01…05` y `03b Prototipo Motion`. Pantallas de meta inmersiva: `Juntia I2 - Bosque Arena` (I2·4).

## Alcance
- Sí: tokens, componentes de UI, pantallas, temas, motion y accesibilidad sobre el repositorio Next.js/React existente.
- No (solo en la fase de diseño): este paquete no diseñó ni conectó backend, Supabase ni autenticación real. **La implementación completa del MVP-1 sí los incluye** según JUNTIA_MASTER.md v1.2 (Supabase Auth, RLS, migraciones, idempotencia, exportación).
- Fuera del MVP-1 en cualquier fase: scraping, agentes IA, integraciones bancarias, modo offline y funciones fuera del maestro.

## Decisiones de producto aprobadas (2 nov 2026)
| Tema | Decisión |
| --- | --- |
| Navegación móvil | Inicio · Actividad · + integrado (no elevado) · Metas · Plan |
| Cuenta | Avatar en encabezados + perfil en la sidebar; 1 toque |
| Grupos | Personal y pareja de 2; grupos N = P1 |
| Presupuestos | Opcionales, sin doble aceptación |
| DEC-G04 | Fórmula aprobada; métrica de planificación |
| Mover a Pareja | Atómico, idempotente, pagador fijo, deshacer condicionado |
| Gasto con meta | Gasto inmediato; solo el uso ajeno espera aprobación, sin vencimiento |
| Autenticación | Correo + contraseña, verificación, recuperación por enlace |
| Invitaciones | 7 días, un uso, una activa, correo asociado y verificado |
| Exportación | JSON + CSV autorizados |
| Eliminación de cuenta | Bloqueo legal de lanzamiento |

**Estado del handoff: READY WITH BLOCKERS.** Las decisiones funcionales de P0 están cerradas. Bloquean el lanzamiento, no la implementación: el procedimiento de eliminación de cuenta y la confirmación técnica de las capacidades de Supabase.

## Alcance MVP-1 (decidido el 2 nov 2026)
**P0 — entra en MVP-1**
- Espacios personales y parejas de exactamente dos integrantes. La creación de grupos de 3 o más no está habilitada. Datos, membresías, permisos y cálculos se modelan para N integrantes.
- Liquidaciones: saldo neto = pagado − corresponde ± liquidaciones registradas. Repartos 50/50, porcentaje personalizado e importe personalizado; liquidaciones parciales. Una sugerencia determinista deudor → acreedor por el saldo pendiente real. Nunca se crea una transferencia automática.
- Presupuestos compartidos opcionales: cualquiera de los dos crea, edita o desactiva manualmente, con permisos validados, autor, fecha e historial. Visibles para ambos, sin segunda aprobación. Ediciones concurrentes protegidas (sin sobrescrituras silenciosas). Estado vacío: «Crear presupuesto».
- Sin propuestas pendientes de aceptación, doble consentimiento ni activación automática.

**P1 — referencia futura, fuera de P0 y de sus criterios de aceptación**
- Grupos de 3 o más (diseño de referencia: Shared Balance «Apto Laureles» en 02). Algoritmo de liquidación para N por decisión de dominio específica.
- Presupuesto sugerido por historial, siempre con confirmación explícita; se evaluará entonces la aceptación de todos los participantes.

## DEC-G04 · Métricas sin doble conteo (aprobado el 2 nov 2026, maestro v1.2)
- `gasto_consumo`: compras y servicios reales; privados + parte asignada según la vista. No incluye aportes.
- `aporte_a_metas`: asignaciones del periodo. Nosotros = total; Yo = solo aportes propios. No se suman entre vistas.
- `retiro_de_metas`: dinero liberado; reasignación, no ingreso.
- `gasto_financiado_con_meta`: parte de un gasto real pagada con dinero ya asignado; el gasto sigue en el consumo.
- `total_destinado_neto = gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta`. Métrica de planificación, no de consumo ni liquidez. Se conserva en dominio y cálculos (función pura con tests). Nunca «Total gastado» ni KPI principal; puede ser negativa y se explica el signo. En UI solo como nota secundaria explicada (Análisis, capítulo 4).

| Caso · vista | consumo | aportes | retiros | financiado | destinado neto |
| --- | ---: | ---: | ---: | ---: | ---: |
| Octubre · Nosotros | 2.840.000 | 900.000 | 0 | 0 | 3.740.000 |
| Octubre · Yo, Sara (412.900 privados + 1.500.000 parte) | 1.912.900 | 500.000 | 0 | 0 | 2.412.900 |
| Octubre · Yo, Tomás (conocido: parte 1.340.000) | No disponible | 400.000 | 0 | 0 | No disponible |
| Ej. retiro · Yo, Sara libera 200.000 de Bicicleta | 0 | 0 | 200.000 | 0 | −200.000 |
| Ej. tiquetes Japón 3.000.000 50/50 con meta · Nosotros | 3.000.000 | 0 | 0 | 3.000.000 | 0 |
| Ej. tiquetes · Yo, Sara (usa 1.620.000 propios) | 1.500.000 | 0 | 0 | 1.620.000 | −120.000 |
| Ej. tiquetes · Yo, Tomás (usa 1.380.000 propios, confirma) | 1.500.000 | 0 | 0 | 1.380.000 | +120.000 |

«No disponible»: el fixture no define los privados de Tomás y no se estiman (en la app, Sara nunca los vería). Los «Ej.» son hipotéticos de noviembre; no cambian el fixture de octubre. Sara −120.000 + Tomás +120.000 = Nosotros 0: el uso de la meta sigue a los aportantes (Japón 11.340.000 → 8.340.000; Sara 6.120.000 → 4.500.000; Tomás 5.220.000 → 3.840.000) y el gasto conserva su 50/50.

**Reclasificar privado → compartido:** una sola acción (Contexto Yo → Nosotros + reparto). Anula el privado y crea el compartido en una operación atómica y auditada (ADR-001); queda un único gasto activo. Ej.: Farmacia Pasteur 64.000 a 50/50 → Yo Sara: privados 412.900 → 348.900, parte +32.000; Nosotros +64.000; Tomás debe 32.000 más.

**Terminología:** «Porcentaje 55/45» = reparto porcentual configurable; no significa proporcional a ingresos.

## Flujos Mover a Pareja y Gasto con meta (diseño: 02·7–02·8, 04·10–04·13, 05·8)
**Mover a Pareja (P0).** Detalle personal → «Mover a Pareja» → importe, participantes y reparto (el pagador original se mantiene) → vista previa de balances → confirmar → resultado con «Deshacer». Una transacción anula el privado y crea el compartido, con `idempotency_key` y auditoría; nunca dos gastos activos. Si el gasto tiene financiación de una meta personal, se bloquea hasta que exista una reversión autorizada y auditada (no se borran vínculos). Deshacer solo inmediato y solo si el servidor confirma que no hay operaciones dependientes; sin perder auditoría. No hay «mover a Yo» general en P0.

**Gasto con meta (P0).** El gasto real se registra de inmediato, junto con el uso de los fondos propios. Los fondos de la otra persona se piden por una cantidad exacta: mientras está pendiente no se descuentan ni cuentan como financiación, no vence y no es una transferencia. Quien pide puede cancelar; quien recibe aprueba o rechaza. Al aprobar: revalidar permisos, saldos y estado de la meta, y registrar de forma atómica e idempotente el uso vinculado al gasto existente (meta ≥ 0). Si se rechaza o cancela, el gasto permanece. Estas solicitudes no tienen las reglas de caducidad de las invitaciones.

**Criterios**: ver 05·8. Vista previa del ejemplo de mover: 348.900 / 1.532.000 / 2.904.000 / 461.900. Japón: 11.340.000 → 9.720.000 al registrar → 8.340.000 si Tomás aprueba.

## Mi cuenta (diseño: 02·9–02·10, 04·14–04·19, 05·9)
**Navegación.** AccountButton en el encabezado de Inicio, Actividad, Metas y Plan; perfil al pie de la sidebar. 1 toque, sin menú ni sexta pestaña. Rutas: `/cuenta`, `/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad`, `/cuenta/seguridad`.
**Estructura.** Mi perfil · Mi pareja · Apariencia · Privacidad y datos · Seguridad y sesión · Cerrar sesión · Acceso, registro y primera entrada.
**Autenticación.** Supabase Auth con correo y contraseña, verificación de correo y recuperación por enlace seguro; sesión persistente según el proveedor. Sin Google/Apple, magic link independiente, passkeys ni MFA propio. Estados: entrar, contraseña incorrecta, no verificada, error de red, crear cuenta, verificar, recuperar, enlace enviado, contraseña nueva, primera entrada. Sin enumeración de cuentas.
**Perfil.** Nombre visible editable; correo visible y no editable; cambio de contraseña por enlace seguro; avatar con inicial y color del sistema; sin foto. No altera autorías.
**Pareja e invitaciones.** Solo la propietaria; caducidad de 7 días; token de un solo uso guardado como hash; una invitación activa por pareja; asociada al correo; aceptación solo con una cuenta verificada con ese correo; enlace compartido a mano; sin correos ni notificaciones propias. Sin sesión: guardar la intención, autenticar, volver y revalidar token, correo, caducidad, membresía y disponibilidad. Una pareja activa por usuario, dos integrantes, validado en el servidor y sin carreras. Sin salir, expulsar ni transferir en P0 (ADR-003).
**Preferencias.** Solo Claro/Oscuro/Sistema, sin flash. Se retiraron reparto por defecto, color editable, moneda y notificaciones. COP fijo. El formulario de gasto conserva 50/50, porcentaje e importe.
**Datos.** Exportar JSON + CSV con solo lo autorizado (nunca privados del otro, tokens ni datos internos); no es restauración. Eliminar cuenta se comunica como no disponible: **bloqueo de lanzamiento** hasta tener un procedimiento real, verificable y revisado legalmente.

## Stack de UI sugerido [P]
- Íconos: `@phosphor-icons/react` con un wrapper `AppIcon` e imports individuales.
- Motion: `motion` (Motion for React). View Transitions solo en Goal Journey.
- Fuentes: `next/font` con Instrument Serif 400/italic, Geist 400–600 y Geist Mono 500; `font-variant-numeric: tabular-nums` global.
- Formato: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.

## Orden de implementación
1. Tokens — `styles/tokens.css` con primitivos y semánticos por `[data-theme]`; `tailwind.config` o el equivalente del repo mapea a variables. Script de tema bloqueante en el layout raíz.
2. Primitivos — AppIcon (wrapper de Phosphor), Avatar, CategoryIcon, Badge, Button, Input, AmountInput, Segmented, Skeleton.
3. Patrones — ExpenseRow, GoalRibbon, GoalCard, BudgetIndicator, Toast, Modal, BottomSheet (Vaul o Radix Dialog + Motion), Chart (SVG propio).
4. Compuestos — SharedBalance (con la función pura `computeBalance(expenses, settlements, members)` y tests; P0 valida exactamente 2 integrantes), GoalStack, AppShell responsive.
5. Pantallas — Inicio Yo/Nosotros → Actividad y detalle → Anotar → Balance y liquidación → Metas e inmersiva → Aporte e historial → Plan → Análisis → Mi cuenta (perfil, pareja, apariencia, privacidad, seguridad) y Acceso.
6. Motion — Motion for React: springs como constantes en `motion/tokens.ts`. View Transitions solo para Goal Journey, con fallback a layoutId. useReducedMotion global.
7. Verificación — axe + Playwright en las rutas clave, pruebas con VoiceOver y TalkBack, contraste real en el dispositivo, mediciones de rendimiento (ver «Rendimiento») y snapshots en los dos temas.

## Reglas de negocio de la UI (no negociables)
- Consumo y aportes a metas nunca se combinan como gasto ni en un total de consumo. Solo intervienen juntos en la métrica de planificación `total_destinado_neto` (DEC-G04), que nunca se presenta como «Total gastado».
- Las liquidaciones no son gastos, no suman al consumo ni a las categorías y se muestran como «Liquidado».
- Los aportes no son transferencias: «el dinero sigue donde lo tengan».
- Los repartos son reales (50/50, porcentaje o importe personalizado); nunca se asume 50/50.
- La sugerencia de liquidación nunca crea una transferencia; Juntia solo registra la liquidación declarada.
- Los presupuestos son opcionales y no requieren segunda aprobación en P0.
- Los movimientos privados nunca se renderizan en el contexto Nosotros, ni en los totales ni en las búsquedas.
- Las proyecciones (ritmo, próximo aporte) se marcan como estimación con el patrón punteado.
- Sin red no se guarda, y la interfaz lo dice: no hay cola offline.

## Accesibilidad
- **Contraste** [A]: Todos los pares texto/fondo de los tokens semánticos miden 4,5:1 o más (se calcularon con la fórmula WCAG). Íconos de categoría: 5:1 o más en claro y 7,5:1 o más en oscuro. Acción primaria: 8,7:1 y 5,3:1.
- **Más que color** [A]: Personas: color + patrón (sólido, rayado, punteado) + inicial. Estados: ícono + texto. Saldos: contorno o punteado + texto. Gasto, ingreso, aporte y liquidación se distinguen por forma de ficha, signo y etiqueta.
- **Foco** [A]: Anillo de 2 px `focus.ring` (#2E5866 / #8FB3C1) con offset de 2 px y 3:1 o más contra los dos fondos. Nunca `outline: none` sin reemplazo.
- **Touch targets** [A]: 44×44 como mínimo. Las teclas, los chips de categoría y la barra inferior miden 46–56.
- **Teclado** [A]: Todo se puede operar con teclado: segmentados con flechas, hojas con Escape, atajo N para Anotar y foco que vuelve al disparador.
- **Lectores de pantalla** [A]: Filas con nombre completo. Barras con `role="img"` y aria-label con cifras. Gráficos con tabla equivalente. aria-live para guardados, liquidaciones y cambio de contexto.
- **Reduced motion** [A]: Cada momento tiene su alternativa documentada en MOTION_SYSTEM, sin desplazamientos ni escalas y con counters que muestran el valor final.
- **Texto ampliado** [P]: Hasta 200% sin pérdida: las filas pasan a 2 líneas, los segmentados se apilan y los importes usan clamp.
- **Gestos** [A]: Todo gesto tiene una alternativa: cerrar la meta con ×, recorrer la pila con «Ver todas» y arrastrar la hoja con su botón.
- **Fotos** [V]: Scrim calculado por luminancia y texto con 4,5:1 o más sobre la zona del scrim. Las fotos son decorativas (alt vacío) y el nombre de la meta va en el texto.
- **Teclado propio** [P]: Descartado: se usa el teclado nativo para no reimplementar foco, dictado ni pegar.
- **Validación real** [V]: No se ejecutaron pruebas con VoiceOver, TalkBack ni axe en dispositivo: está pendiente para la fase de implementación.

## Auditoría anti-slop
- Gradientes agresivos, glow, glassmorphism por todas partes → **Aprobado**. Solo hay scrims fotográficos y blur en los botones sobre foto.
- Tarjetas con borde izquierdo de color → **Aprobado**. No se usan. El estado se expresa con ícono, texto y punteado.
- Emoji como iconografía → **Aprobado**. Solo Phosphor, en 4 pesos con reglas definidas.
- Dashboard de KPIs sin jerarquía → **Aprobado**. Un solo número héroe por pantalla. El ahorro se muestra aparte y nunca se suma.
- Data slop (porcentajes y deltas decorativos) → **Atención**. El «+4%» del análisis solo aparece con su explicación. Hay que vigilar que no se agreguen deltas en Inicio.
- Fuentes sobreusadas (Inter, Roboto) → **Aprobado**. Instrument Serif + Geist + Geist Mono para metadatos.
- Bento en todo → **Atención**. El bento se limita a Inicio. Actividad, Balance y Plan son listas editoriales.
- Copia genérica («¡Todo listo!») → **Aprobado**. La copia explica la consecuencia financiera: «no es un gasto», «no mueve dinero».
- Animación decorativa → **Aprobado**. Solo dos momentos L2 y cada animación explica un cambio de dato.
- Ilustraciones genéricas en vacíos → **Aprobado**. Los vacíos usan un ícono Duotone en una ficha y texto útil, sin ilustraciones de stock.

## Evaluación (criterios inspirados en Awwwards, autoevaluación)
- Diseño: 8,8 — La identidad es reconocible: fichas de categoría, cinta y foto inmersiva. El oscuro tiene composición propia.
- Usabilidad: 8,6 — Anotar en 2 toques más el monto, el balance es legible sin color y los estados están completos. Falta validar con usuarios.
- Creatividad: 8,4 — Goal Journey y Shared Balance son propios. La pila tipo Wallet es un patrón conocido, reinterpretado.
- Contenido: 9 — La copia es exacta, los datos coherentes y la privacidad se respeta.

## Trazabilidad
| Decisión | Tokens | Componentes | Estado |
| --- | --- | --- | --- |
| Bosque lleno = acción | `color.action.*` | Button, AppShell (Anotar), BottomSheet CTA | A |
| Verde texto = ahorro destinado | `color.finance.saving*` | ExpenseRow (aporte), GoalCard, Toast | A |
| Gasto, ingreso y liquidación en tinta | `color.finance.expense/income/settlement` | ExpenseRow, CategoryIcon (forma) | P |
| Personas configurables + patrón | `person.1–6 + patrón de tramo` | Avatar, SharedBalance, GoalRibbon | P |
| Sara lila → petróleo | `person.1 #6F98A8 / #8FB3C1` | Avatar, cinta, balance | P |
| Fichas de categoría a color | `category.{id}.bg/fg` | CategoryIcon, ExpenseRow, CategoryBlocks, Budget | A |
| Por saldar neutro y punteado | `color.status.pending, border.pending` | Badge, SharedBalance | A |
| Instrument Serif solo en titulares | `display.*, title.*` | Todas las pantallas; nunca en tablas ni formularios | A |
| Cifras tabulares | `money.*, tabular-nums` | Toda cifra; Counter | A |
| Oscuro cercano al negro | `surface.* (dark)` | ThemeProvider | A |
| Elevación táctil | `elevation.raised/float/overlay/sheet` | Card, Button, Tabbar | A |
| Cinta continua de ahorro | `goal.track/pace/projection` | GoalRibbon | A |
| Pila tipo Wallet | `radius.2xl, elevation.float, spring.card` | GoalStack | P |
| Meta inmersiva | `spring.card/sheet, duration.journey` | GoalImmersive, BottomSheet | A |
| Balance pagó vs. corresponde | `color.goal.pace (marca), person.*` | SharedBalance | P |
| Teclado nativo para el monto | `—` | AmountInput | P |
| Gasto y apartado separados (DEC-G04) | `—` | HomeHero, MonthSummary, Análisis | A |
| Tema Light/Dark/System | `[data-theme] + script en <head>` | ThemeProvider, ThemeSelector | A |
| Cuenta desde el avatar, sin sexta pestaña | `person.*, focus.ring` | AccountButton, Sidebar | A |
| Limitaciones explicadas con texto, sin controles | `surface.sunken` | LimitNote | A |
| + integrado y pestaña «Actividad» | `action.primary` | AppShell (tabbar) | A |
| P0 pareja de dos; grupos N = P1 | `person.1–2` en P0 | SharedBalance, CoupleStatus | A |
| Presupuesto sin doble aceptación | `—` | BudgetIndicator, Plan | A |

A = aprobado · P = propuesta de refinamiento · V = pendiente de validación técnica.

## Pendiente
- [V] Conversión privado → compartido: transacción única, concurrencia, idempotencia y RLS del registro anulado.
- [V] Flujo de confirmación: goal_usage_confirmations, bloqueo sin consentimiento, revalidación al confirmar.
- [V] Atomicidad de gasto + goal_usage + asignaciones, idempotencia, conversión auditada sin ventana con dos gastos activos, goal_usage_confirmations y RLS de metas.
- [V] Protección de ediciones concurrentes de presupuesto (versión u optimistic lock + aviso al otro integrante). Por probar en Claude Code.
- Detección de luminancia de la foto para el scrim (en cliente o en servidor).
- View Transitions con App Router y el back-swipe de iOS.
- Teclado nativo en Android con teclados de terceros.

## Rendimiento
- **Umbrales medibles (bloquean la aceptación):** CLS = 0 en las cargas con skeleton de las rutas clave · INP < 200 ms al abrir Anotar y al guardar · mediana < 10 s para registrar un gasto habitual tras el onboarding, en teléfono real (US-12) · sin scroll horizontal en 360, 390, 430, 1024 y 1440 · objetivos táctiles ≥ 44 px.
- **Objetivo aspiracional (no bloquea):** Lighthouse 95+, según el maestro; no reemplaza los umbrales anteriores.
- **Verificado hasta ahora:** nada. Ninguna medición de rendimiento se ejecutó en la fase de diseño.

## Criterios de aceptación (solo P0)
- Mi cuenta: los criterios de 05·9 (navegación, perfil, pareja, apariencia, privacidad, sesión y acceso).
- DEC-G04: `total_destinado_neto` reproduce cada fila de la tabla anterior y nunca se rotula «Total gastado» ni ocupa el número héroe.
- Un gasto compartido existe una vez (total en Nosotros, parte en Yo); ninguna pantalla, export ni agregado suma Yo + Nosotros.
- Los aportes no cambian `gasto_consumo` ni lo consumido de presupuestos; se atribuyen al aportante real.
- Una liquidación parcial Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900.
- Un gasto con meta crea un único gasto real; las asignaciones por aportante suman el uso y son independientes del reparto. La meta nunca queda negativa.
- Usar o retirar aportes ajenos sin confirmación del otro integrante queda bloqueado.
- Un retiro nunca se presenta como ingreso.
- Anotar registra privado o compartido desde un solo flujo; la reclasificación privado → compartido deja un único gasto activo y un registro de auditoría.
- No se puede crear un espacio compartido con más de 2 integrantes.
- El saldo de la pareja reproduce el caso de octubre incluyendo una liquidación parcial; la sugerencia es única y no crea transferencias.
- Ambos integrantes pueden crear, editar y desactivar un presupuesto; el historial guarda autor y fecha; una edición concurrente no se pierde en silencio [V].
- Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta.
- Todos los momentos de motion respetan `prefers-reduced-motion`.
- Los datos del caso de octubre (COMPONENT_SPECIFICATIONS) reproducen exactamente los totales mostrados en el diseño.
