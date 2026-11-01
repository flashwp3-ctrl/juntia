# Investigación de oportunidades y seguimiento de precios — Ronda

**Origen:** investigación de producto Ronda v1.3 (1 nov 2026). Anexo, no especificación de lanzamiento.  
**Estado de evidencia:** las coberturas y características atribuidas a terceros reflejan publicaciones consultadas; requieren revalidación antes de depender de ellas. No se ha demostrado ninguna autorización para extraer precios ni una integración funcionando.  
**Autoridad:** si este anexo contradice `docs/RONDA_MASTER.md`, manda el maestro v1.1.1 congelado.

**Regla de alcance:** este documento **NO** define tareas del MVP-1 premium. Iniciar el spike de precios solo tras cuatro semanas consecutivas de uso estable de MVP-1 por ambos usuarios, mediante una investigación pequeña, legal y técnicamente verificable. La investigación documental puede continuar sin iniciar integraciones. La app de gastos debe funcionar aunque nunca se implemente este módulo.

## 6. De «Mercado COP 150.000» a «Ariel 1,8 L»: modelo por niveles

El nombre del comercio y la categoría no revelan necesariamente qué productos se compraron. **No se puede detectar la compra de Ariel a partir de un gasto genérico «mercado»**, aunque se use IA. La app debe ser honesta sobre el dato que tiene.

### Nivel A — Transacción

`COP 87.000 · Supermercado · Éxito · 31 oct · grupo Pareja`.

Disponible en MVP: valor, comercio opcional, fecha, categoría, contexto. No requiere recibo ni catálogo comercial.

### Nivel B — Artículo identificado (opt-in)

`Detergente Ariel líquido · presentación 1,8 L · cantidad 1 · precio pagado COP 34.900`.

Puede obtenerse mediante entrada manual opcional, plantilla de artículo frecuente, código de barras/GTIN o lectura de recibo con confirmación posterior. La lectura OCR es **asistida** y puede errar; siempre requiere validación antes de incorporar artículo a historial y crear seguimiento.

### Nivel C — Producto normalizado

Entidad canónica con marca, familia, variante, formato, contenido neto, unidad, GTIN si se conoce y nivel de confianza. Dos tamaños diferentes no son el mismo SKU; se pueden comparar en precio por litro/kilogramo, pero **no** atribuirles sin advertencias idéntico desempeño o formulación.

### Nivel D — Intención de seguimiento

La app pregunta «¿Quieres vigilar ofertas de este artículo?» cuando sea relevante. No se activa seguimiento comercial por defecto. Comprar una sola vez puede bastar si la persona lo marca; comprar diez veces no autoriza alertas automáticas sin consentimiento.

### Nivel E — Oferta externa verificable

Una observación reciente del mismo SKU o sustituto claramente rotulado, con URL, comercio, ubicación, fecha/hora de consulta, precio, condiciones, inventario (si se conoce) y validez. El estado puede ser `confirmada`, `condicional`, `caducada`, `no-verificada` o `sin-fuente`. Solamente las primeras dos permiten avisos; las condicionales deben mostrar elegibilidad.

## 7. Motor de oportunidades: productos de supermercado

### 7.1 Ejemplo Ariel (ficticio)

- Historial: la persona registró Ariel líquido 1,8 L a COP 37.900 una vez el mes pasado.
- Usuario: activa «Seguir Ariel líquido 1,8 L» y acepta avisos.
- Fuente comercial autorizada observa una oferta para exactamente el mismo producto a COP 29.900, en una tienda compatible con la ciudad o cobertura de entrega.
- La app comprueba precio unitario, presentación, vigencia, costo de envío, mínimos de compra, tarjeta o membresía requeridas y fecha de captura.
- Si las reglas pasan, Ronda muestra: «Ariel 1,8 L está a COP 29.900 en tienda X; COP 8.000 menos que tu última compra. Precio visto hace 25 min. Ver condiciones». Solo afirmaría «precio bajo frente a los últimos 90 días» si **dispone realmente** de suficientes observaciones históricas comparables.

**Diferencia crítica:** «más barato que tu última compra» no significa «mínimo del mercado» ni «descuento real de X%». Cada comparación necesita su propia base y fecha. Un artículo puede estar barato en términos relativos pero no ser necesario comprarlo hoy.

### 7.2 Ranking de ofertas: dos evaluaciones separadas

**A. ¿La oferta es real y comparable?**

- Coincidencia de SKU/presentación; precio actual y unidad de medida.
- Fuente, URL, tiempo desde la última verificación, stock conocido/no conocido.
- Precio total neto (envío, mínimos, cupones, membresías, impuestos aplicables).
- Referencia histórica válida: precio propio, precio observado por la fuente, precio similar en tiendas comparables; *no* inventar «precio normal».

**B. ¿Tiene sentido para la persona?**

- ¿La persona señaló que desea seguirlo o planea comprarlo?
- ¿Es recurrente o consumible? ¿Tiene sentido abastecerse o sería desperdicio?
- ¿Existe presupuesto activo y cuánto queda en la categoría correcta?
- **Sin presupuesto:** usar solo patrón de gasto histórico y una nota de incertidumbre, nunca afirmar que «te lo puedes permitir» o que hay saldo bancario.
- ¿El aviso aporta valor después de envíos, desvíos y restricciones de pago?

Resultado de la UI: `Oferta verificada` + `Precio vs referencia` + `Encaje presupuestal / sin presupuesto` + `Ver detalles`. El motor puede concluir «No recomendado ahora», «No hay datos suficientes» o «Oferta disponible, sin evaluación financiera», sin esconder el precio.

### 7.3 Datos técnicos propuestos

`catalog_products`, `product_identifiers`, `transaction_items` (opcionales), `merchant_locations`, `merchant_products`, `price_observations`, `promotion_conditions`, `followed_products`, `offer_matches`, `user_alert_preferences`, `offer_alerts`, `notification_delivery` y `product_match_review`.

Cada registro de precio debe distinguir `observed_at`, `valid_from`, `valid_to`, `source_url`, `source_type`, `region/store_id`, `currency`, `unit_price`, `total_price`, `eligibility`, `availability` y `confidence`. Las condiciones de una oferta son dato estructurado, no texto decorativo.

**Separación arquitectónica:** estas tablas viven en el módulo futuro `offers/commerce`; no alteran la contabilidad ni el motor de presupuestos. Pueden estar vacías sin romper la app. La capa de matching nunca accede a gastos privados de terceros; los intereses de grupo requieren autorización concreta.

### 7.4 Estrategia de captura de precios: APIs, feeds y scraping responsable

**Conclusión técnica:** sí se puede construir un **scraper** de fichas de producto publicadas para extraer precio, nombre, presentación y URL, **cuando las condiciones del sitio y la normativa lo permitan**. No hay que comprar automáticamente una API de comparación para hacer el primer experimento. Sin embargo, que algo sea visible en un navegador no concede por sí solo derecho a recolectarlo, republicarlo ni explotarlo comercialmente. El permiso de rastreo de `robots.txt`, los términos contractuales, las licencias, el derecho sobre compilaciones de datos y el uso posterior son preguntas separadas.

**Preferencia de fuentes, en orden:**

1. API oficial habilitada para nuestro caso de uso o feed/afiliación con permiso suficiente.
2. Publicaciones estructuradas y feeds comerciales oficiales con condiciones claras de reutilización.
3. **Extractor de páginas públicas permitido**, con alcance acotado, monitorización, cache, límites de frecuencia, identificación de agente y opción de desactivación por fuente.
4. Observaciones aportadas voluntariamente por usuarios (ticket o precio manual) etiquetadas como `reportado_por_usuario`; no presentarlas como verificación directa de la tienda.

**No realizar:** evadir CAPTCHA, camuflar identidades con proxies rotativos, reproducir endpoints internos no autorizados, acceder a cuentas personales de usuarios, ignorar prohibiciones contractuales, perseguir bloqueos 403/429 mediante evasión ni descargar imágenes/descripciones masivamente por defecto. Ante bloqueo, duda material de permisos o limitación de datos, suspender la fuente.

### 7.5 Revisión concreta — Éxito y Mercado Libre (1 nov 2026)

| Comercio | Observación verificada | Viabilidad propuesta / pendiente |
| --- | --- | --- |
| **Éxito (`exito.com`)** | Fichas públicas exhiben nombre, referencia **PLU**, presentación, precio y a veces precio por gramo [S24]. Su `robots.txt` permite rutas públicas generales pero declara `Disallow` para `/api/`, `/s?`, parámetros de facetas y categorías específicas; `robots` no otorga licencia de explotación [S25]. Los términos públicos definen la plataforma para uso personal de consumidores y permiten cambios de precios/condiciones [S26]. | **Candidato para spike controlado en fichas públicas individualizadas**, solo después de revisar términos aplicables y permiso/reutilización. No consultar APIs internas bloqueadas ni búsquedas excluidas. Guardar PLU y presentación; corroborar precio local antes de alertar. |
| **Mercado Libre Colombia** | Dispone de APIs oficiales de publicaciones, precios y promociones, con autenticación/autorización; `/items/{id}/prices` devuelve precios y condiciones contextuales con token apropiado. Su documentación del 14 oct 2026 avisa que `price`, `base_price` y `original_price` de `/items` serán retirados progresivamente [S27, S28]. La declaración de privacidad afirma que aplica medidas para evitar scraping [S29]. | **Prioridad a estudiar integración/API oficial**: validar acceso real a ítems de terceros, límites, permisos y derecho a usar datos en una app de recomendaciones; no darlo por autorizado solo porque el endpoint exista. Scraping web como alternativa solo si su uso concreto está permitido. |

**Hallazgo operativo:** el precio mostrado en una página no siempre es el precio que pagará una persona de Medellín. Puede variar con ciudad, inventario, vendedor marketplace, dirección, medio de pago, cupones, cantidad mínima, promociones de membresía y envío. Ronda guardará el contexto de cada observación y evitará afirmar `precio confirmado para ti` si no puede verificar elegibilidad.

### 7.6 Arquitectura propuesta del price intelligence pipeline

```text
Productos seguidos con consentimiento (10–20 SKU al inicio)
   → scheduler con frecuencia por fuente + presupuesto de consultas
   → adaptadores de fuente (API / feed / public-page scraper permitido)
   → extracción documentada (JSON-LD si existe, HTML público, atributos visibles)
   → validación (URL, SKU/PLU, variante, tamaño, moneda, formato, región)
   → normalización por unidad y comercio, sin inventar campos
   → price_observations inmutables + provenance y timestamp
   → matching estricto con los artículos seguidos
   → evaluación de precio histórico + restricciones + contexto personal
   → inbox de oportunidades (push posterior, solo opt-in)
```

**Contratos mínimos por fuente:** `source_id`, `policy_reviewed_at`, `allowed_paths`, `permissions_basis`, `retrieval_method`, `max_frequency`, `timeout`, `retry_policy`, `status`, `quality_score`, `last_success_at`, `paused_reason`. Un adaptador **no debe arrancar en producción** si su base de permiso está pendiente. Se puede probar parsing de capturas sintéticas o archivos previamente autorizados mientras se resuelve.

**Contrato de observación de precio** (se extiende la sección 7.3):

| Campo | Por qué existe |
| --- | --- |
| `merchant`, `seller_id`, `source_url`, `source_id` | Saber quién vende y desde dónde vino el precio. |
| `sku_gtin_or_plu`, `brand`, `variant`, `net_quantity`, `unit` | Evitar falsas coincidencias Ariel 1,8 L vs 2 L o líquido vs polvo. |
| `price_amount`, `currency`, `unit_price_amount` | Comparación monetaria y por volumen, con redondeo definido. |
| `regular_price_amount` y `discount_amount` solo cuando están documentados | No convertir «antes» inventado en descuento. |
| `shipping`, `thresholds`, `membership`, `payment_method`, `coupon` | Distinguir costo final confirmado, estimado o desconocido. |
| `region`, `store`, `seller_channel`, `availability` | No atribuir una oferta de otra ciudad o seller. |
| `observed_at`, `valid_until`, `confidence`, `evidence_hash` | Frescura, caducidad, auditoría y supresión de avisos incorrectos. |

**Ingeniería de extracción:** cachear y deduplicar URLs; respetar `robots.txt` y límites más estrictos de condiciones aplicables; usar `ETag`/`Last-Modified` cuando esté soportado; responder a 429/503 con pausa o backoff; establecer TTL por tipo de precio; monitorear cambios de estructura y activar **fail-closed**. Preferir selectores estables / JSON-LD verificable; guardar pruebas de extracción minimizadas cuando la fuente lo permita. No rastrear un catálogo completo cuando el usuario sigue 12 productos.

**Datos necesarios antes de notificar:** coincidencia suficiente de SKU o variante; precio comparable, no solo `-40%`; hora reciente de consulta; enlace original; condiciones de compra; lugar y canal aplicables. Alertas en `unverified` o `stale` se guardan como observaciones técnicas, **nunca se comunican como oferta vigente**.

### 7.7 Spike autorizado de dos fuentes y criterios de descarte

- **Semana experimental 1:** elegir 10–20 referencias concretas con la pareja y recopilar 1–2 enlaces oficiales por referencia. Revisar permiso/robots/términos en cada fuente; documentar el hallazgo. Si no hay permisos suficientes, utilizar feeds autorizados o datos de prueba y marcar la fuente como bloqueada.
- **Prueba técnica:** ejecutar adaptadores a frecuencia conservadora pactada; medir cobertura de productos, coincidencias correctas de presentación, fallas por estructura, 403/429, variación de precio por región y tiempo desde observación.
- **Prueba comercial:** cotejar manualmente una muestra de alertas contra la ficha visible de producto **en el mismo contexto de compra**, y calcular precisión y ratio de falsas ofertas; no alegar ahorro efectivo sin compra/confirmación.
- **Go / no-go:** integrar a Ronda solo fuentes con derecho de uso verificado, precisión aceptable, costos operativos conocidos y estado saludable. Si una fuente falla, la contabilidad y los presupuestos deben seguir funcionando exactamente igual.

**No se afirma en este documento que Éxito o Mercado Libre hayan autorizado scraping para Ronda.** Las verificaciones actuales demuestran datos publicados y opciones técnicas, no licencias comerciales.


### 7.8 Cobertura multimarca y multiestablecimiento: no limitarse a dos tiendas

**Decisión:** Éxito y Mercado Libre eran ejemplos de investigación, **no una restricción de producto**. La arquitectura debe ser capaz de incorporar, sujeto a acceso y condiciones, **Olímpica, Ara, Jumbo, D1, Carulla, Éxito, Mercado Libre, La Vaquita, Makro, Euro, Alkosto, Farmatodo, tiendas barriales y comercios futuros**. No afirmamos que existan APIs públicas adecuadas en cada caso.

**Matriz de evaluación por fuente** (cada comercio recibe su propia ficha y veredicto `viable / pendiente / bloqueado`):

| Campo | Pregunta operativa |
| --- | --- |
| Acceso | ¿API/feed/afiliación autorizados o ficha pública utilizable en los términos aplicables? |
| Producto | ¿GTIN/EAN, referencia, marca, cantidad, variante y unidad de medida identificables? |
| Contexto local | ¿Precio por ciudad, tienda, dirección, canal, vendedor, disponibilidad y medio de pago? |
| Condiciones | ¿Cupones, membresías, tarjeta, compras mínimas, envío e impuestos están documentados? |
| Calidad | ¿Podemos contrastar manualmente datos, fechas, coincidencias y tasa de alertas erróneas? |
| Operación | ¿Límites, costos, frecuencia permitida, estabilidad, cambios de estructura y botón de desconexión? |

La prioridad inicial no es abarcar todas las cadenas, sino **conseguir 2–3 fuentes confiables con productos comparables para Medellín**, y luego ampliar usando los mismos contratos. Los productos de marca propia de D1 o Ara pueden carecer de equivalencia exacta con Ariel: deben figurar como *alternativas*, no como el mismo SKU.

**Regla de ahorro neto:** compare el precio unitario del mismo artículo o de sustitutos explícitos; incorpore envío/costos de traslado cuando se conozcan, cantidades mínimas y restricciones de pago; reduzca el supuesto ahorro cuando comprar en un comercio adicional exige desplazamiento o volumen excesivo. Una diferencia nominal entre tiendas no necesariamente produce ahorro económico total.

### 7.9 Qué ofrece Google y qué NO resuelve para Ronda (revisión oficial, nov 2026)

| Servicio o vía | Capacidad verificada | Decisión para Ronda |
| --- | --- | --- |
| **Google Merchant API** | Permite a comercios gestionar en Merchant Center sus productos, inventario, promociones y fuentes de datos [S33]. | **No** es un buscador público general de los precios de todos los supermercados. Evaluar solo ante acuerdo o permiso pertinente. |
| **Gemini + Grounding with Google Search** | El modelo puede buscar información web actual y aportar citas/fuentes [S34]. El precio oficial documenta un cupo de **5.000 consultas de búsqueda mensuales incluidas en el esquema de facturación** de modelos Gemini 3+, y luego US$14/1.000; el uso real depende del nivel y del modelo y puede originar múltiples búsquedas por solicitud [S35]. | Útil como **descubridor de URLs/promociones y corroboración complementaria**; nunca como único origen de un precio estructurado, stock, SKU o descuento confirmado. No confundir con «5.000 llamadas gratuitas del tier Free»: hay condiciones de facturación. |
| **Google Vertex AI Search / site search** | Permite buscar datos web indexados de sitios seleccionados, a costos por búsqueda e indexación [S36]. | Posible POC acotado, pero costoso y no garantiza ofertas en tiempo real, permisos de reutilización ni precios locales. |
| **Google Custom Search JSON API** | Google declara que está **cerrada a nuevos clientes** y pide migración de clientes actuales antes del 1 ene 2027 [S37]. | Descartar como arquitectura nueva. |
| **Google Maps Places API** | Datos de establecimientos como ubicación, horarios, tipos de servicio, nivel y rango de precio [S38]. | Valiosa para identidad/localización de restaurantes, **no** para conocer sus promociones vigentes ni el precio exacto de un plato. |
| **Proveedores externos de resultados Shopping** | Algunos servicios comerciales extraen resultados de Google Shopping y permiten filtros por país/ubicación. | Evaluar contratos, licencias, cobertura real en Colombia, precio por consulta y contexto; **no son APIs oficiales de Google**. |

**Arquitectura sugerida:** dos trabajos independientes. `offer_discovery` busca URLs o publicaciones que puedan ser oportunidades; `price_verification` obtiene y normaliza evidencia mediante adaptadores de fuentes con derechos de uso claros. Google Search puede aportar el primero y ocasionalmente pistas para el segundo, pero **no reemplaza la verificación y el historial de precios**.

**Política de costos:** buscar de manera programada productos seguidos, cachear resultados por producto y zona, deduplicar consultas entre usuarios con permisos correctos y limitar cuotas; no lanzar una búsqueda web por cada render de un dashboard. Instrumentar costo por oferta encontrada y por alerta útil.

## 8. Restaurantes frecuentes y promociones cercanas

### 8.1 Detección sin invadir privacidad

A partir del **nombre de comercio introducido voluntariamente** se puede mostrar «Has registrado este restaurante varias veces; ¿quieres seguir sus promociones?». No requerir ubicación continua ni usar geolocalización en segundo plano. Una preferencia de ciudad o zona elegida por el usuario suele bastar al comienzo.

### 8.2 Oferta de restaurante: más compleja que una etiqueta «20%»

Registrar restaurante o cadena, sucursal/ciudad, canal (domicilio / presencial / recoger), horario y días, porcentaje/tope, pedido mínimo, costo de envío, membresía, código, tarjeta/banco requerido, categorías excluidas, fecha de vencimiento, URL y momento de verificación. Una promoción de domicilios puede depender de la dirección o de iniciar sesión: el sitio de Rappi ilustra esta dependencia [S10].

**Ejemplo hipotético:** «Hay una promoción publicada para tu restaurante seguido. Aplica a domicilio y solo con tarjeta X; no podemos confirmar el precio final hasta abrir la oferta». Eso es útil y honesto; «tu restaurante favorito tiene 30% de descuento» sin condiciones no lo es.

### 8.3 Experimento recomendado

Comenzar con una lista voluntaria de tres restaurantes, fuentes propias/oficiales de promociones y revisión manual/semiautomática. En la primera etapa ofrecer **un inbox de oportunidades**, no push automático por toda oferta. Si no existe fuente vigente y verificable, no mostrar promociones inventadas ni inferidas por un LLM.

## 9. Eventos de descuentos (Hot Sale, Black Friday y similares)

La Cámara Colombiana de Comercio Electrónico publicó fechas para Hot Sale del **19 al 23 de octubre de 2026** [S14]. Son un ejemplo de eventos externos de fechas cambiantes, **no** evidencia de descuentos sobre un artículo particular. Para próximos eventos se verificará el calendario oficial antes de mostrar una cuenta regresiva o enviar una alerta.

El producto podría responder tres preguntas distintas:

1. **¿Existe una campaña?** Fecha y organizador confirmados.
2. **¿Hay una oferta relevante?** Producto o comercio seguido con precio, condiciones y fuente.
3. **¿Conviene comprar ahora?** Deseo previamente declarado, urgencia, comparabilidad histórica y encaje con presupuesto o patrón de gasto. Si falta información, responder «no se puede determinar».

**Ejemplo ficticio de UX:** «Hot Sale empieza esta semana; 2 artículos que sigues están en tiendas participantes. Todavía no se observan ofertas verificadas de esos artículos». Esto ayuda sin crear urgencia artificial.

**Principio ético:** una compra no planificada no es un ahorro porque tenga 40% de descuento. Evitar FOMO, cronómetros falsos, escasez no comprobada y notificaciones insistentes.

## 10. IA, recomendaciones y privacidad

### 10.1 Qué hará código determinista

- Contar gastos y calcular reparto, saldos y presupuestos.
- Calcular categorías y tendencia descriptiva de acuerdo con los datos disponibles.
- Proponer presupuestos a partir de metodología versionada y suficiente muestra.
- Coincidencia exacta o fuzzy de artículos con reglas y umbrales medibles.
- Comparar precios históricos en la misma presentación, región y moneda.
- Determinar elegibilidad conocida, historial, gastos programados y bloqueo por fuente caducada.
- Decidir si una alerta cruza los umbrales configurados por el usuario.

### 10.2 Dónde usar IA opcionalmente

- Extraer líneas de recibos o sugerir marca/presentación, **siempre con validación humana**.
- Desambiguar comercios y artículos con resultados estructurados y comprobables.
- Resumir insights, explicar qué cambió y sugerir opciones; no escribir saldos oficiales.
- Redactar una recomendación a partir de un contrato con hechos, fuentes e incertidumbre.

### 10.3 Garantías de privacidad

- Consentimientos independientes para: análisis de compras, seguimiento de productos, seguimiento de restaurantes, IA externa y notificaciones.
- Sin IA, la app sigue siendo plenamente útil; el servicio de precios puede funcionar sin enviar movimientos personales a un proveedor LLM.
- **No compartir automáticamente historial completo ni notas/comercios con modelos externos gratuitos.** Google distingue su tier gratis, que puede usar contenido para mejorar productos, de tiers pagos con tratamiento diferente [S15]. Agregar/minimizar datos y explicar el consentimiento.
- Un gasto privado no se revela mediante recomendación grupal. Ejemplo prohibido: mostrar a la pareja «tu compañero compra X» derivado del historial privado.
- Suprimir cuentas, exportar datos propios, controlar retención, evitar secretos en cliente y no poner datos financieros identificables en analítica.
- Revisar aviso de tratamiento y autorizaciones según Ley 1581 de 2012 antes de expansión pública [S16].

### 10.4 Entrega de notificaciones

Progresión: inbox dentro de Ronda → resumen por correo opcional → Web Push. En iPhone el Web Push para PWA requiere añadirla a la pantalla de inicio y conceder permiso, según la documentación de Apple [S17]; por ello jamás depender de push para guardar una oferta o enterarse de una alerta. Preferencias: productos/comercios, umbral, frecuencia máxima, silenciamiento, resumen diario/semanal y desuscripción rápida.


### 10.5 Jev de TypeSafe AI: evaluador de decisiones acotadas (opcional)

**Hallazgo verificado:** **Jev sí existe**. Es un modelo de TypeSafe AI orientado a *decisiones tipadas*, no a redacción. Recibe un estado y preguntas independientes y devuelve respuestas como `choice`, `score` o `noul` (probabilidad de sí/no); `choice` y `score` incluyen distribuciones de probabilidad y un indicador de confianza [S39, S40]. TypeSafe lo presentó públicamente en septiembre de 2026, inicialmente como acceso temprano. El acceso real, cuotas y precio deben confirmarse antes de una integración.

**Encaje propuesto para Ronda:** Jev puede ser un *segundo juez* para cuestiones subjetivas de baja criticidad, siempre detrás de validaciones duras y sin autoridad sobre movimientos o dinero.

| Pregunta que responde el sistema | Responsable / método |
| --- | --- |
| «¿La oferta sigue vigente y tiene URL, condiciones y precio comprobables?» | **Código + datos del proveedor**, no Jev. |
| «¿Ariel líquido 1,8 L y Ariel polvo 1,8 kg son el mismo producto?» | Identificadores, tipo, presentación y reglas; **Jev solo puede proponer una etiqueta de similitud para revisión**. |
| «¿La diferencia neta es COP 8.000?» | **Código determinista**, precisión monetaria e historial comprobable. |
| «¿Esta promoción se parece a algo que la persona compra habitualmente?» | **Jev Choice/Score opcional**, con señales agregadas y consentimiento. |
| «¿Tiene sentido avisar ahora o agruparlo en un resumen semanal?» | **Jev Choice opcional** sobre relevancia, urgencia real y fatiga de avisos. |
| «¿Puedo pagar esto con tranquilidad?» | **No delegar en Jev**. Con presupuesto: reglas de saldo/planes; sin presupuesto: exposición honesta de incertidumbre, sin promesas de asequibilidad. |
| «Explica en español por qué podría convenirme.» | **LLM generativo opcional** (Gemini) sobre métricas verificadas, o plantilla determinista; Jev no genera texto. |

**No confundir confianza del modelo con probabilidad de ahorro real:** la documentación oficial explica que `confidence` de `Choice/Score` se deriva de la concentración de probabilidades; una salida con confianza alta **no demuestra** que la oferta sea verdadera, conveniente o aplicable a una tienda de Medellín [S40]. Calibrar el modelo con etiquetas humanas y métricas del dominio.

**Contrato propuesto, no SDK definitivo:**

```ts
type OfferDecision = {
  sourceStatus: 'verified' | 'stale' | 'blocked'; // reglas, no IA
  priceComparison: { basis: 'last_paid' | 'unit_market' | 'history'; savingsCOP: number }; // código
  budgetFit: 'within' | 'exceeds' | 'not_configured'; // código
  relevance: 'high' | 'medium' | 'low' | 'review'; // Jev opcional
  relevanceConfidence: number | null; // no es veracidad del precio
  action: 'notify' | 'inbox_only' | 'review' | 'suppress'; // reglas con Jev como una señal
};
```

**Flujo obligatorio de seguridad:** `sourceStatus !== verified` → no notificar; `budgetFit === exceeds` → no presentar «te conviene»; `budgetFit === not_configured` → no inferir fondos disponibles; `relevanceConfidence` baja → inbox o revisión. El usuario puede optar por seguir producto sin activar Jev. No enviar compras privadas nominativas a servicios externos sin consentimiento y minimización.

**Plan de evaluación antes de integrar:** crear 100–200 escenarios ficticios y, con permiso, una muestra anonimizada de compras y ofertas reales etiquetada por humanos. Comparar **reglas puras vs Jev vs otro modelo**, midiendo precisión al decidir notificar, falsos positivos que incentivan compras innecesarias, casos difíciles de productos equivalentes, costos, latencia y estabilidad. Añadir *kill switch* y fallback determinista. Sin una mejora empírica, **no añadir dependencia de Jev al MVP**.

**Implementación:** TypeSafe mantiene documentación oficial y una skill para agentes (`npx skills add typesafe-ai/skills --skill typesafe-ai`) [S39]; solo instalarla cuando exista un experimento de Jev aprobado, no en F0. El precio anunciado por TypeSafe ($0,042 por millón de tokens de entrada) es promocional/informativo, no una estimación validada del costo operativo para Ronda [S39].

## 13. Investigación/experimentos que bloquean PROMOCIONES, no el MVP

| Hipótesis o pregunta | Experimento de validación | Criterio de decisión |
| --- | --- | --- |
| Reconocimiento de artículos | 30 recibos reales anonimizados + 20 entradas manuales, distintos comercios | Medir precisión de marca, tamaño, variante, precio y tasa de corrección; sin métricas no automatizar. |
| Fuentes de precio | Probar 1–2 tiendas con API/feed o scraper público permitido, revisión de `robots` + condiciones, 10–20 SKU | Permiso documentado, precio comparable en Medellín, frescura, estabilidad y 403/429 controlados. |
| Diferencia entre oferta y ahorro | Comparar 2–4 semanas de precios observados y compras históricas propias | Ninguna alerta sin base explícita y fecha visible. |
| Cobertura multi-retailer Medellín | Matriz por cadena con 20 SKU, GTIN, ciudad, permisos, costo final | Seleccionar 2–3 fuentes con cobertura comparable y derecho de uso probado. |
| Google como descubridor | Probar Search Grounding en 20 búsquedas de productos y promociones | URLs relevantes y frescas, costo/query y tasa de corroboración medidos; no usar como precio autoritativo. |
| Jev para priorizar alertas | 100–200 casos etiquetados; reglas puras vs Jev vs LLM alternativo | Reducir falsos positivos, justificar latencia/costo, y ningún bypass de validaciones duras. |
| Restaurante favorito | 3 restaurantes seguidos con promo oficial y condiciones registradas | Alerta solo cuando se pruebe vigencia/canal/ubicación. |
| Presupuesto sugerido | Correr en datos demo y, con consentimiento, datos propios de 2–3 meses | Recomendaciones comprensibles y no intrusivas; usuario puede descartarlas. |
| Valor de notificaciones | Inbox vs resumen semanal vs push voluntario | Medir alertas abiertas, descartadas, falsas, silenciadas y compras realmente planificadas. |
| Modelo de ingresos | Primero uso privado sostenido; después entrevistas y costos por consulta | No monetizar antes de validar que resuelve problemas repetidos. |

**No prometer todavía:** permiso de scraping de Éxito o Mercado Libre, scraping sostenible, cobertura de ofertas en Medellín, disponibilidad de API de Tiendeo/Pillelo/SuperPrecios, exactitud del OCR, inventario de tiendas, promociones bancarias aplicables, beneficio financiero garantizado o precisión con una sola compra.

## Referencias y trazabilidad

**[M01] Base interna:** *Ronda — Documento maestro del producto v1.0*, 31 oct 2026. Fuente de las reglas de dinero, grupos, RLS, lenguaje visual, fases originales y objetivo dual.

- **[S01]** Tricount, funcionalidades oficiales: https://www.tricount.com/es-es/features
- **[S02]** Roonda, ficha App Store Colombia: https://apps.apple.com/co/app/roonda/id6761076284
- **[S03]** SplitRound, ficha App Store Colombia: https://apps.apple.com/co/app/splitround-dividir-gastos/id6823677195
- **[S04]** Spendee, billeteras/presupuestos compartidos: https://help.spendee.com/article/224-shared-wallets
- **[S05]** Spliit, sitio oficial: https://spliit.app/
- **[S06]** Pillelo, comparador de precios Colombia: https://pillelo.com.co/
- **[S07]** SuperPrecios, cobertura declarada: https://superprecios.app/
- **[S08]** Tiendeo, ficha App Store Colombia: https://apps.apple.com/co/app/tiendeo-ofertas-y-cat%C3%A1logos/id489822377
- **[S09]** Keepa, sitio oficial: https://keepa.com/
- **[S10]** Rappi Colombia, página de promociones: https://www.rappi.com.co/promotions
- **[S11]** Mercado Libre, documentación de precios de productos: https://developers.mercadolibre.com.co/api-de-precios
- **[S12]** Kimbino, catálogos de supermercados en Medellín: https://www.kimbino.com.co/ciudad/medellin/categoria/supermercados/
- **[S13]** Google Search Central, datos estructurados de productos/ofertas: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- **[S14]** Cámara Colombiana de Comercio Electrónico, calendario 2026: https://ccce.org.co/eventos/
- **[S15]** Google, Gemini Developer API pricing y tratamiento del contenido: https://ai.google.dev/gemini-api/docs/pricing
- **[S16]** Colombia, Ley 1581 de 2012: https://normograma.dian.gov.co/dian/compilacion/docs/ley_1581_2012.htm
- **[S17]** Apple Developer, Web Push PWA: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- **[S18]** Supabase, pausa de proyectos Free: https://supabase.com/kb/faqs/platform/free-project-pausing
- **[S19]** Vercel, términos de Hobby: https://vercel.com/docs/plans/hobby
- **[S20]** YNAB, guía oficial YNAB Together (octubre de 2026): https://support.ynab.com/en_us/ynab-together-B1nS78Cki
- **[S21]** Wallet by BudgetBakers, Group Sharing (septiembre de 2026): https://support.budgetbakers.com/hc/en-us/articles/7149394922002-Everything-about-Group-Sharing


**[S22]** Webby Awards, criterios oficiales 2026–2027: https://www.webbyawards.com/judging-criteria/  
**[S23]** Apple Design Awards 2026, categorías de Interaction, Visuals & Graphics e Inclusivity: https://developer.apple.com/design/awards/  
**[S24]** Éxito, ficha pública de Ariel con PLU, presentación y precio (observación ilustrativa, no precio actual confirmado): https://www.exito.com/detergente-revitacolor-pwd-952783/p  
**[S25]** Éxito, robots.txt al 1 nov 2026: https://www.exito.com/robots.txt  
**[S26]** Éxito, términos oficiales de la plataforma: https://www.exito.com/terminos-condiciones  
**[S27]** Mercado Libre Developers, precios de productos, actualización 14 oct 2026: https://developers.mercadolibre.com.co/api-de-precios  
**[S28]** Mercado Libre Developers, autenticación y autorización: https://developers.mercadolibre.com.co/es_co/autenticacion-y-autorizacion  
**[S29]** Mercado Libre Colombia, declaración de privacidad y extracción automatizada: https://www.mercadolibre.com.co/privacidad/declaracion-privacidad/31256  
**[S30]** web.dev, Core Web Vitals (LCP, INP, CLS): https://web.dev/articles/vitals?hl=es-419  


- **[S31]** Priceo, comparador y cobertura declarada de 28 supermercados: https://priceo.co/
- **[S32]** Price It, cadenas declaradas y flujo de lista: https://priceit.com.co/
- **[S33]** Google Merchant API, descripción oficial: https://developers.google.com/merchant/api/overview
- **[S34]** Google Gemini Search Grounding, documentación oficial: https://ai.google.dev/gemini-api/docs/google-search/
- **[S35]** Google Gemini API pricing, Search Grounding por modelo y nivel: https://ai.google.dev/gemini-api/docs/pricing
- **[S36]** Google Cloud, Vertex AI Site Search: https://cloud.google.com/use-cases/site-search
- **[S37]** Google, cierre de Custom Search JSON API para nuevos clientes: https://developers.google.com/custom-search/v1/overview
- **[S38]** Google Maps, Places API data fields: https://developers.google.com/maps/documentation/places/web-service/data-fields
- **[S39]** TypeSafe AI, Jev y documentación de integración: https://typesafe.ai/blog/introducing-system-one-models-and-jev y https://docs.typesafe.ai/introduction/quickstart
- **[S40]** TypeSafe AI, tipos de preguntas y explicación de confianza: https://docs.typesafe.ai/introduction y https://docs.typesafe.ai/confidence

**Nota editorial:** Toda cifra de precio, porcentaje y ejemplo de alerta de usuario en este documento es ilustrativa, salvo que se identifique expresamente como información publicada por un proveedor en una fuente. No hay ninguna promoción concreta validada en este informe para ser enviada como alerta a un usuario. Las especificaciones sobre inteligencia de compras y presupuesto sugerido son decisiones y experimentos propuestos, no características implementadas.
