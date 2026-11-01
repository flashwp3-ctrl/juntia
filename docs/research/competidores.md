# Benchmark competitivo y referentes de diseño — Ronda

**Origen:** investigación de producto Ronda v1.3 (1 nov 2026). Anexo, no especificación de lanzamiento.  
**Estado de evidencia:** las coberturas y características atribuidas a terceros reflejan publicaciones consultadas; requieren revalidación antes de depender de ellas. No se ha demostrado ninguna autorización para extraer precios ni una integración funcionando.  
**Autoridad:** si este anexo contradice `docs/RONDA_MASTER.md`, manda el maestro v1.1.1 congelado.

## 2. Método de investigación y límites de evidencia

Investigación de escritorio realizada y ampliada el 1 de noviembre de 2026, incluyendo comparación de comercios colombianos, plataformas Google y TypeSafe Jev sobre sitios oficiales, fichas de apps, centros de ayuda, documentación de desarrolladores y fuentes públicas de comercio colombiano. Se reutilizan las decisiones del documento maestro para el modelo financiero, diseño, stack y seguridad. **No se han instalado ni probado manualmente todas las apps** ni se dispone de datos comparables de retención, usuarios activos o conversiones. Las funciones descritas corresponden a lo que publican los proveedores, no a una auditoría de calidad real. Los precios y límites pueden variar.

Clasificación de afirmaciones:

- **Verificado en fuente:** característica o condición publicada por el proveedor o entidad identificada.
- **Oportunidad inferida:** conclusión estratégica de comparar varios productos; no prueba una demanda comercial.
- **Hipótesis por validar:** valor esperado con dos usuarios y más adelante usuarios externos.
- **Pendiente técnico/legal:** acceso lícito, sostenible y suficiente a precios, condiciones o datos de ubicación.

Las referencias **[S01]–[S40]** figuran al final con enlaces. El documento maestro es **[M01]**.

## 3. Benchmark: cuatro mercados que Ronda cruza

Ronda no compite solamente con apps de pareja; cruza cuatro categorías donde hay jugadores consolidados.

| Producto | Categoría | Funcionalidades relevantes verificadas | Implicación para Ronda |
| --- | --- | --- | --- |
| **Tricount** | Gastos compartidos | Grupos, repartos personalizados, liquidaciones, multidivisa, recibos, offline; funciones principales gratuitas sin anuncios ni tope diario [S01] | El reparto simple y gratuito no diferencia; sí fija la referencia de fricción baja. |
| **Roonda** | Personal + grupos | Ciclos de presupuesto, grupos, IA para recibos, voz, offline, reparto [S02] | Riesgo funcional y de nombre casi idéntico. |
| **SplitRound** | Personal + grupos + presupuesto | Gastos y presupuesto, recurrentes, garantías, divisiones, recibos, web/offline; funciones avanzadas Premium [S03] | No presentar «gastos + grupos + presupuesto» como novedad. |
| **Spendee** | Presupuestos | Billeteras compartidas; sus presupuestos son individuales incluso en wallet compartida [S04] | Presupuesto colaborativo consistente es una oportunidad concreta. |
| **YNAB Together** | Planificación colaborativa | Comparte planes y presupuestos en un grupo de hasta seis cuentas; la persona que administra el grupo puede ver todos los presupuestos [S20] | Analizar controles de visibilidad y la complejidad percibida por parejas. |
| **Wallet by BudgetBakers** | Presupuestos y cuentas compartidas | Compartir grupos requiere Premium para crear el grupo; no está disponible en web; los miembros usan sus carteras privadas por separado [S21] | Oportunidad para una PWA consistente en móvil y escritorio. |
| **Spliit** | Reparto web abierto | Alternativa enfocada en reparto colaborativo y grupos [S05] | Referencia de simplicidad, no copiar código/diseño sin revisar licencia. |
| **Pillelo** | Comparación de productos Colombia | Dice comparar 22 comercios, lista de compras y alertas de favoritos con límites gratis/Premium [S06] | **Competidor directo del futuro módulo de alertas**, especialmente en productos identificables. |
| **SuperPrecios** | Comparador supermercados | Declara comparar siete supermercados, refresco cada seis horas y cobertura actual Bogotá/Chía [S07] | Fuente de hipótesis de oportunidad geográfica; cobertura publicada no implica licencia API. |
| **Tiendeo** | Catálogos y promociones | Catálogos, tiendas, favoritos, listas y alertas de promociones [S08] | Catálogos no equivalen a datos fiables SKU a SKU; sí ofrecen descubrimiento. |
| **Keepa** | Historial de precios | Histórico de precios y alertas de caída en Amazon [S09] | La calidad de una oferta se valora mejor con historial real que con porcentaje promocional. |
| **Rappi** | Ofertas restaurantes/mercado | Portal público de promociones dependiente de dirección, ciudad y disponibilidad [S10] | No prometer promociones universales de restaurantes: el contexto de entrega importa. |

**Otros referentes de experiencia de producto (investigación previa, pendiente de una prueba directa):** Monarch Money, Copilot Money, Honeydue, Splitwise, Settle Up y Goodbudget amplían el panorama de planificación, finanzas en pareja y reparto. La presente ronda priorizó verificar con fuentes las funcionalidades más próximas a los diferenciales nuevos. No debe inferirse que las funciones no mencionadas estén ausentes en esos productos, ni que Ronda deba copiar su dependencia de sincronización bancaria o sus modelos comerciales.

### 3.1 Conclusión competitiva

No existe evidencia suficiente para afirmar que «nadie hace esto». En realidad, **el seguimiento de productos favoritos, las alertas de precio, los gastos grupales y los presupuestos ya existen por separado** y en algunas combinaciones. La hipótesis diferenciadora es integrar de manera fiable:

`gasto registrado → artículo/comercio reconocido con permiso → oferta verificable → evaluación contra patrón de compra/presupuesto opcional → aviso controlado → decisión humana`.

Un usuario puede preferir simplemente el registro manual sin activar ninguna de estas capas.

### 3.2 Referentes y premios de diseño: hipótesis de benchmarking visual

**Objetivo explícito de calidad:** construir una web/PWA con acabados y experiencia suficientes para considerar una postulación a Awwwards o The Webby Awards. Es una **aspiración de ejecución**, no una promesa de premio o nominación. Los premios evalúan la experiencia completa, no el número de animaciones: The Webby Awards 2026–2027 valoran diseño visual, interactividad, funcionalidad, navegación, innovación y experiencia general [S22]. Los Apple Design Awards reconocen especialmente la calidad de interacción, inclusión y coherencia visual en aplicaciones de plataformas Apple [S23]. **Una PWA web no debe presentarse automáticamente como elegible a los Apple Design Awards**; para ello habría que evaluar y cumplir las condiciones de un producto nativo publicado en plataformas Apple.

**Qué observar en las referencias** (sin reproducir su dirección de arte):

- **Copilot Money / Monarch:** claridad en capas de información financiera y densidad cuidadosamente graduada; verificar con prototipos propios qué patrones facilitan lectura en 390 px.
- **Interfaces editoriales web premiadas:** composición, ritmo tipográfico, contrastes, transiciones y storytelling. No copiar efectos por lucimiento.
- **Apple Design Awards 2026, categorías Interaction y Visuals & Graphics:** continuidad de contexto, controles intuitivos y movimiento útil [S23].

**Cuaderno de benchmarking visual obligatorio en F0:** grabaciones de interacciones reales, capturas 360/390/1440 px, hipótesis de lo que funciona, antipatrones, pruebas con dos personas y un registro de decisiones de autoría. La evaluación oficial de un premio nunca sustituye la usabilidad de nuestro caso real.

### 3.3 Bench práctico pendiente (no sustituible con investigación web)

Recrear el mismo escenario en Tricount, Roonda, SplitRound y Ronda demo: diez gastos personales, cinco compartidos, un reparto desigual, una liquidación parcial, consulta por mes, un presupuesto opcional y eliminación del presupuesto. Documentar pasos, tiempo, dudas, estados vacíos, screenshots móviles y de escritorio, costo y fallos. Separadamente, comparar el seguimiento de un SKU en Pillelo y las condiciones de una oferta en Rappi/Tiendeo. No afirmar superioridad hasta ejecutar estas pruebas.


### 3.4 Comparadores colombianos adicionales: cobertura que ya existe

La comparación entre supermercados colombianos **no es un mercado vacío**. Además de Pillelo y SuperPrecios [S06, S07], aparecen otros servicios que publican cobertura nacional o regional:

| Referencia | Afirmación pública que sí se pudo verificar | Implicación / cautela |
| --- | --- | --- |
| **Priceo (`priceo.co`)** | Declara comparar precios de **28 supermercados** y ofrece selección por ciudad, listas y alertas de bajada; en su web aparecen referencias de La Vaquita, Makro, Mercaldas, Éxito, Jumbo y otros [S31]. | Competencia más amplia de la que pensábamos; verificar cobertura real de Medellín, condiciones, frescura y permisos antes de depender de sus datos. |
| **Price It (`priceit.com.co`)** | Declara comparación de Éxito, Carulla, D1, Jumbo, Ara y Olímpica, y optimización de lista de mercado [S32]. | No diferenciarse únicamente por «dónde está más barato», sino por historial de compras privadas + decisiones contextuales. |
| **Pillelo (`pillelo.com.co`)** | Publica cobertura de supermercados, tecnología, hogar y droguerías, incluido Mercado Libre, y alertas a productos seguidos [S06]. | Las alertas de precio sin contexto financiero ya están presentes en el mercado. |

**Límite de evidencia:** estas son funciones y cifras **declaradas por los sitios**, no auditorías de cobertura, frescura, afiliaciones o exactitud. Ninguno de estos sitios ha concedido a Ronda un derecho de consulta por API o de reutilización de sus datos.

**Conclusión competitiva revisada:** la ventaja buscada es relacionar *«lo que efectivamente compro» + «dónde se consigue» + «cuándo lo necesitaría» + «qué impacto tendría en mis gastos»*. La comparación de precios es infraestructura, no el producto final.

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
