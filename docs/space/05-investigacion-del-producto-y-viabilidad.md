# Investigación del producto y viabilidad

Fuente: https://chatgpt.com/space/page_09f9010897648191a5a68d4609bca8d5

Creación: 2026-10-09T22:20:48.547312Z  
Última modificación en Space: 2026-10-09T22:20:49.832682Z  
Exportación UTC: 2026-10-10T00:58:50.522215+00:00  
Página padre: page_6ac9681f593081919017833102c3d2c7  
Secuencia de origen: 0

---

Investigación y propuesta de desarrollo, 9 de octubre de 2026. Producto nuevo e independiente. No utiliza proyectos, código, datos, cuentas, diseños o activos existentes del usuario. No se ha construido, registrado, comprado ni pagado nada como parte de esta investigación.

## Recomendación ejecutiva

Construir una demo de una compra empresarial única: empleado solicita un artículo, el agente estructura la intención y encuentra una opción, un motor determinista verifica proveedor y presupuesto, una persona aprueba una cotización específica, Reap realiza un checkout sandbox y el producto deja una bitácora verificable.

La demostración importante es que la compra sólo avanza cuando coinciden intención, reglas, cotización y autorización. Un chatbot que simplemente abre un checkout sería poco diferenciador. La oportunidad propuesta es cerrar el ciclo de solicitud a evidencia de compra con controles visibles y recuperarse correctamente cuando el pago queda incierto.

Nombre de trabajo: “Agente de gastos para equipos”. No se ha elegido ni comprobado una marca comercial. Público inicial hipotético: equipos pequeños con compras puntuales de equipo o suministros; comprador económico hipotético: responsable de operaciones/finanzas. Validar ambos con entrevistas, no presentarlos como demanda demostrada.

## Hechos comprobados y límites de la evidencia

### Evento

Luma describe un evento presencial en Ciudad de México con unas cuatro horas de desarrollo, ingenieros de Reap y demos. Criterios: ejecución técnica, originalidad, potencial comercial, confianza/control y creatividad. La lectura pública no muestra hora ni dirección detallada. El correo de Reap/Luma recibido por el usuario, verificado por separado en esta conversación, confirma puertas a las 17:00 de Ciudad de México en SandboxHub; no es la hora de cierre. La página pública muestra evento lleno/lista de espera, lo que no determina la situación individual del usuario. No inferir admisión confirmada ni exclusión sólo por ese aviso. Fuente: [Evento oficial](https://luma.com/r7x9nu2h).

### Preparación Reap

Se necesitan credenciales del entorno correcto, Agentic Payments habilitado y return URL HTTPS. El enrollment debe llegar a ACTIVE, verificado mediante GET; volver del flujo alojado no basta. Hay fuentes REAP_CARD, BIN_SPONSOR y EXTERNAL. La captura de tarjeta ocurre en Reap; los datos completos no deben llegar al backend del producto. Las tarjetas compatibles requieren Cloud Token Framework y Visa Token Service. Setup publica tarjetas de prueba y OTP de sandbox; esas pruebas no mueven dinero. Usar los valores desde la documentación durante la implementación, sin incorporarlos a logs, prompts o materiales públicos. Fuente: [Setup](https://docs.reap.global/agentic-payments/setup).

### Compra única

El recorrido documentado es búsqueda, detalles, variante, quote, envío, checkout y consulta de resultado. El precio de variante no sustituye el total final. El mandato ONE_TIME limita a un cargo y su importe es un techo. externalCheckout requiere habilitación de dominios de comerciantes. La guía incluye un header sandbox X-Simulate-Checkout: COMPLETED; no funciona en producción. Fuente: [One-Time Purchases](https://docs.reap.global/agentic-payments/one-time-purchases).

### Advertencias de disponibilidad

La FAQ dice que los merchants disponibles se confirman con Reap; también describe custom checkout como futuro y habilitado por cuenta, mientras la guía ya documenta su uso. Tratar esto como inconsistencia documental pendiente de confirmación, no como disponibilidad universal. La FAQ exige aprobación de Visa y equipos internos para MCP/CLI en producción y dice que clientes MCP permanecen en sandbox. No basar la demo en MCP ni en URLs arbitrarias. Fuente: [FAQ](https://docs.reap.global/agentic-payments/faq).

### Fuera del alcance demostrable

No asumir subscriptions listas: la navegación oficial marca Recurring Purchases “Coming soon”, aunque lifecycle describe estados de mandatos. No prometer cobranza, cuentas por cobrar, reembolsos automáticos, CFDI, contabilidad, conciliación bancaria completa, cobertura universal de merchants, pagos MXN o ahorros medidos. Nada de ello quedó validado para este proyecto. Mostrar referencia de pedido y monto final no equivale a una factura fiscal ni acredita entrega física.

## Preguntas de desbloqueo a Reap antes de desarrollar

1. ¿Tenemos un proyecto sandbox nuevo e independiente con Agentic habilitado y permisos correctos?

2. ¿Cuál es el host sandbox/región y Reap-Version exigidos para estas credenciales? La guía usa sandbox.api.reap.global; la referencia muestra sg.sandbox.api.reap.global. La referencia de checkout lista 2025-02-14, mientras ejemplos generales de idempotencia usan otra fecha. Confirmar, parametrizar y fijar una combinación comprobada.

3. ¿Qué merchant, país, moneda y variante de prueba funcionan hoy? ¿Discovery ya está disponible para esta cuenta?

4. ¿Está externalCheckout habilitado para este proyecto y para qué dominios? Mantenerlo fuera del camino crítico salvo confirmación.

5. ¿Cómo se obtiene el mandato ONE_TIME para esta integración? La guía pide consultar uno; la referencia de creación de checkout sólo documenta quoteId, enrollmentId y presentation, sin mandateId. No inventar un endpoint de creación de mandatos.

6. ¿Cómo se prueba el approval alojado y qué datos sintéticos acepta el sandbox?

7. ¿Hay eventos Agentic webhook habilitados, firma y orden garantizados? Por ahora usar GET/polling.

8. ¿Cuáles son rate limits y conducta recomendada ante una respuesta perdida al crear checkout?

Fuentes de contratos: [Create checkout](https://docs.reap.global/api-reference/agentic/create-checkout), [Idempotency](https://docs.reap.global/api-reference/idempotency).

## Alcance mínimo y criterios de aceptación

Incluido:

- Una organización de demostración, un presupuesto, una moneda confirmada, un merchant permitido y un artículo disponible.

- Dos identidades de demostración: solicitante y aprobador. Un cambio visual de rol sólo puede presentarse como simulación; no como autenticación segura de producción.

- Solicitud en lenguaje natural convertida a campos verificables.

- Política determinista: monto total máximo, saldo disponible, proveedor permitido y aprobación obligatoria.

- Cotización final, autorización específica, checkout sandbox y bitácora.

- Tres caminos: éxito, bloqueo de política, estado incierto/timeout.

Excluido del sprint: integración Slack/email/ERP, multimoneda, cambio de divisas, OCR, conciliación bancaria, compras recurrentes, dashboard financiero amplio, aplicación móvil y pagos reales.

Hecho significa: existe una ejecución observada de extremo a extremo con IDs devueltos por sandbox; el rechazo hace cero llamadas de checkout; un doble clic no genera dos operaciones lógicas; ante timeout no se afirma éxito ni fracaso sin evidencia; los secretos no aparecen en navegador ni prompts; cada pantalla indica el entorno. Si sólo hay mocks, se etiqueta claramente “simulación local”, sin llamarla integración terminada.

## Arquitectura propuesta desde cero

Aplicación web monolítica sencilla en TypeScript, interfaz React y API backend. Base SQL transaccional. Para demo local persistente puede bastar SQLite; un despliegue efímero necesita almacenamiento duradero compatible. Elegir alojamiento sólo después de confirmar recursos independientes autorizados. Un proceso de reconciliación puede vivir en el backend para la demo; producción requerirá ejecución durable.

Módulos:

1. Request parser: LLM devuelve JSON validado: artículo, cantidad, necesidad, presupuesto solicitado y campos faltantes. No decide aprobaciones.

2. Policy engine: funciones puras que evalúan merchant, moneda, importe, rol y presupuesto. Falla cerrado cuando falta información.

3. Quote service: encapsula discovery y cotización Reap, guarda una instantánea y expiración.

4. Approval service: vincula aprobador autenticado a versión concreta de cotización y política.

5. Checkout orchestrator: único módulo autorizado a crear operaciones Reap; revalida todas las condiciones y controla idempotencia.

6. Reconciliation service: consulta estado remoto y actualiza reserva y gasto exactamente una vez a nivel lógico local.

7. Audit service: eventos append-only a nivel de aplicación. No afirmar inmutabilidad criptográfica ni cumplimiento certificado.

Flujo: interfaz → API autenticada → parser/policy → quote → approval → orquestador → Reap sandbox. El LLM no recibe API key, PAN, CVC, cookies ni URLs de aprobación completas. Recibe información mínima de productos y razón de rechazo; entrega sugerencias estructuradas. Datos de comerciantes y texto del usuario son contenido no confiable: nunca habilitan herramientas de pago ni cambian reglas.

## Modelo de datos propuesto

- Organization: id, nombre, moneda demo.

- Membership: organizationId, userId, role; identidad resuelta por servidor.

- Policy: id, version, límites, moneda, merchant allowlist, obligación de aprobación.

- Budget: id, period, currency, limitMinor, reservedMinor, spentMinor, version.

- PurchaseRequest: id, organizationId, requesterId, description, quantity, state, revision, policyVersion.

- QuoteSnapshot: id interno, reapQuoteId, purchaseRequestId, revision, merchant, variantes/cantidades, shippingOption, destinationRef, finalAmountMinor, currency, expiresAt, canonicalHash.

- Approval: requestId, quoteSnapshotId, quoteHash, approverId, decision, decidedAt, expiry, policyVersion.

- PaymentAttempt: id, requestId, approvalId, operationKey, payloadHash, reapCheckoutId, providerStatus, localReconciliationState, timestamps.

- BudgetReservation: requestId, attemptId, amountMinor, state HELD/COMMITTED/RELEASED.

- AuditEvent: id, requestId, actorId/type, eventType, timestampUTC, sanitizedPayload, correlationId.

Índices únicos: operación por Idempotency-Key y organización; una reserva activa por solicitud; una aprobación por snapshot y aprobador; un evento de contabilización por checkoutId. IDs externos se guardan como strings opacos. Dinero interno en unidades menores enteras con conversión decimal explícita al contrato Reap; nunca float binario ni inferir unidades a partir de ejemplos.

## Contratos internos propuestos

Estos endpoints son del producto, no endpoints inventados de Reap.

POST /api/requests
Entrada: descripción, cantidad, budgetId, clientRequestId. Identidad y organización vienen de sesión. Salida: requestId, revision, campos extraídos, missingFields y estado.

POST /api/requests/:id/quote
Entrada: revision esperada, selección de variante y envío. Backend valida pertenencia y política preliminar. Salida: snapshotId, total/moneda, merchant, expiración, hash y resultado de política. Cotizar no autoriza compra.

POST /api/requests/:id/decision
Entrada: snapshotId, quoteHash, decision APPROVE/REJECT, reason y requestRevision. Backend exige rol aprobado y ausencia de conflicto. Salida: approvalId y estado. El cliente no envía approverId confiable.

POST /api/requests/:id/checkout
Header Idempotency-Key; entrada approvalId y revision. Backend verifica snapshot actual, expiración, enrollment, política vigente, rol de ejecución y reserva presupuestaria. Retorna attemptId, estado, nextAction permitido o ubicación para consultar. No acepta monto, merchant ni enrollment arbitrarios del cliente.

GET /api/requests/:id
Devuelve cotización, política, aprobación, estado y evidencia sanitizada según permisos.

GET /api/payment-attempts/:id
Lee resultado local y provoca/consulta reconciliación de forma controlada. No repite automáticamente POST de checkout.

Formato común de error propio: code, mensaje comprensible, correlationId, retryable, nextStep. Códigos propios: POLICY_DENIED, BUDGET_EXCEEDED, APPROVER_REQUIRED, STALE_REVISION, QUOTE_CHANGED, QUOTE_EXPIRED, ENROLLMENT_NOT_ACTIVE, PAYMENT_OUTCOME_UNKNOWN. No confundir códigos propios con códigos Reap.

## Aprobación vinculada a la cotización

La pantalla de autorización debe mostrar artículo/variante/cantidad, merchant, total y moneda, impuestos/envío conocidos, destino, tarjeta enmascarada, modalidad única y restricciones visibles relevantes. La aprobación firma lógicamente el hash canónico de esa información, snapshotId, política y expiración.

Antes de checkout: consultar cotización actual y enrollment; comparar hash; validar política vigente y presupuesto; reservar atómicamente; insertar intento y clave persistida; enviar la solicitud. Si cambian importe, moneda, merchant, artículo, cantidad, envío, destino o términos, invalidar autorización y pedir otra. Un botón de “aprobar solicitud” anterior a conocer impuestos/envío no basta.

La aprobación organizacional y la aprobación de pago alojada por Reap son dos controles distintos. El aprobador empresarial no necesariamente es el titular de la tarjeta; esta relación necesita validación real fuera de la demo. No saltarse nextAction por haber obtenido aprobación interna.

## Estados y recuperación

Estados internos propuestos: DRAFT → QUOTING → AWAITING_APPROVAL → APPROVED → SUBMITTING → REQUIRES_ACTION/PROCESSING → COMPLETED. Ramas locales: POLICY_REJECTED, APPROVAL_REJECTED, REQUOTE_REQUIRED, FAILED, EXPIRED y RECONCILING. RECONCILING indica que no se conoce el desenlace; no es un estado oficial de Reap.

Reap documenta checkout REQUIRES_ACTION, PROCESSING, COMPLETED, FAILED y EXPIRED; los tres últimos son terminales. Un quote tiene expiresAt, no status. FAILED/EXPIRED necesitan nuevos quote y checkout. El retorno del navegador no acredita éxito; consultar estado. Fuente: [Lifecycle](https://docs.reap.global/agentic-payments/lifecycle).

Finalización propuesta: al observar COMPLETED, guardar orderId y finalAmount; convertir reserva a gasto sólo una vez. Si el monto final discrepa de lo autorizado, registrar excepción y detener nuevas compras de esa solicitud; no ocultarlo ni afirmar que no ocurrió el cargo. FAILED/EXPIRED confirmados liberan la reserva. Un timeout conserva la reserva y bloquea nuevos intentos hasta reconciliar.

Si existe checkoutId, consultar GET. Si la respuesta de creación se perdió sin ID, repetir exactamente la operación con la misma clave dentro de su ventana; nunca generar una clave nueva para “destrabar”. Pasadas 24 horas sin resultado verificable, revisión con Reap antes de reenviar: la clave remota ya no protege.

## Idempotencia y recuperación de errores

Reap guarda la primera respuesta 24 horas. Misma clave y cuerpo repiten respuesta; cuerpo cambiado produce IDEMPOTENT_PARAMETER_MISMATCH; operación simultánea produce IDEMPOTENCY_REQUEST_IN_PROGRESS. Respuestas 4xx/5xx también pueden quedar cacheadas; 401/422/429 están exceptuadas. Persistir una clave por operación lógica antes del envío. Fuente: [Idempotency](https://docs.reap.global/api-reference/idempotency).

Diseño propio: transacción SQL con control de versión para aprobación/reserva/intento; el botón deshabilitado sólo es UX. Dos servidores deben terminar usando el mismo intento. Conservar deduplicación local más de 24 horas. Reintentos de transporte con backoff/jitter y límite operativo; agotarlo conduce a RECONCILING, no a una nueva compra.

Errores documentados de checkout incluyen AGENTIC_PAYMENTS_NOT_ENABLED, AGENTIC_RESOURCE_NOT_FOUND, ENROLLMENT_NOT_ACTIVE, AGENTIC_REQUEST_REJECTED y AGENTIC_SERVICE_UNAVAILABLE. Fuente: [Create checkout](https://docs.reap.global/api-reference/agentic/create-checkout).

Para errores de quote como CHECKOUT_URL_INVALID, OFFER_CODE_INVALID/EXPIRED, QUOTE_UNFULFILLABLE o CARD_PAYMENT_UNAVAILABLE, corregir solicitud/checkout antes de otro intento. No repetir idéntico error de negocio indefinidamente. Fuente: [One-Time Purchases](https://docs.reap.global/agentic-payments/one-time-purchases).

Ante valor nuevo de estado/error, conservar respuesta sanitizada y bloquear ejecución automática hasta clasificarlo. Reap permite añadir valores a enums y campos sin nueva versión; tolerar campos extra. Fuente: [Versioning](https://docs.reap.global/api-reference/versioning).

## Seguridad y roles

- Solicitante: crea y lee sus solicitudes; no modifica presupuesto ni aprueba la propia.

- Aprobador: autoriza/rechaza dentro de organización y límites asignados.

- Administrador financiero: configura políticas y presupuesto; no recibe permiso implícito para firmar pagos de otro titular.

- Auditor: lectura de registros sanitizados.

- Servicio de ejecución: identidad técnica con la mínima capacidad disponible; acceso exclusivo a secretos del backend.

Controles: validación server-side de cada recurso/tenant, autorización contra IDs manipulados, CSRF para sesiones cookie, allowlist del returnUrl, protección de redirect, secretos fuera de repositorio y frontend, logs redactados, datos sintéticos en demo, timeout de sesión y validación de inputs. Evitar cargar una URL enviada por el usuario para impedir SSRF; si se añade externalCheckout después, validar esquema HTTPS, dominio habilitado, destino y redirecciones.

La bitácora contiene razón de política, quién aprobó, snapshot, intento, IDs remotos y resultado. No guardar PAN/CVC, bearer token, cabeceras completas, dirección personal innecesaria ni URL alojada con tokens. Una auditoría de demo prueba trazabilidad funcional, no certificación PCI, SOC 2 ni cumplimiento fiscal.

## Pruebas obligatorias

1. Feliz: solicitud sintética, merchant confirmado, quote vigente, aprobación exacta, sandbox COMPLETED, orderId/finalAmount y gasto registrado una sola vez.

2. Rechazo: total con envío supera límite; POLICY_REJECTED; cero llamadas POST checkout; explicar importe y regla.

3. Timeout: simular respuesta perdida después del envío; RECONCILING, reserva retenida y mismo idempotency key; recuperar estado sin duplicar.

4. Doble clic y dos solicitudes concurrentes: un PaymentAttempt, una reserva y un cargo lógico.

5. Cambiar envío después de aprobar: hash distinto, aprobación invalidada.

6. Quote expirado: no abrir checkout; nueva cotización y nueva aprobación.

7. Enrollment no ACTIVE: bloquear y mostrar siguiente paso alojado si aplica.

8. Regreso manipulado a success URL: ningún éxito hasta GET confirmado.

9. Empleado intenta aprobarse o acceder a otra organización: 403.

10. Prompt injection en descripción/producto: no cambia política ni accede a secretos.

11. Callback o polling repetido: gasto contabilizado una vez.

12. Respuesta con estado nuevo: pendiente de revisión, nunca “completado” por defecto.

La única simulación de checkout documentada en la referencia permite COMPLETED. Para timeout/rechazo no inventar X-Simulate-Checkout: FAILED; usar fallos controlados del adaptador local y etiquetarlos como pruebas internas. Mantener separado “sandbox real”, “simulación local” y “objetivo de producción”.

## Plan de desarrollo

El cronograma y los criterios de aceptación se mantienen en [Plan de demo y pruebas](https://chatgpt.com/space/page_a1690f3a7be081918522344fc6e64af3). Si hay dos desarrolladores, una persona puede encargarse de la integración y otra de la interfaz y las pruebas. Si trabaja una sola persona, conviene limitar el catálogo a una opción confirmada con Reap. La aprobación y la idempotencia son prioritarias.

## Guion de demo de tres minutos

0:00–0:20: “Un empleado necesita un artículo para trabajar. Hoy la solicitud, aprobación y compra quedan separadas. Este prototipo las conecta con una evidencia común.”

0:20–0:55: ingresar solicitud; mostrar extracción, regla, presupuesto y cotización real sandbox. Explicar total final.

0:55–1:30: aprobador revisa snapshot; avanzar por paso Reap si procede; consultar estado. Mostrar pedido, monto y bitácora.

1:30–2:05: segunda solicitud excede presupuesto; demostrar bloqueo antes de checkout y razón legible.

2:05–2:35: timeout controlado; mostrar “verificando resultado” y deduplicación, no un nuevo cargo.

2:35–3:00: “Nuestro foco es hacer confiable la compra delegada: el agente ayuda a encontrar y preparar; las reglas, las personas y el estado verificable controlan la ejecución. Esta demo utiliza sandbox. Lo siguiente es validar el flujo con equipos y ampliar merchants con Reap.”

No decir “el primero”, “cero fraude”, “cumplimiento garantizado”, “ahorra 80%” o “ya funciona en todos los proveedores”. El diferencial descrito es una hipótesis de producto y una elección de diseño; no se hizo un benchmark competitivo exhaustivo.

## Backlog posterior y validación comercial

P0 antes de cualquier piloto real: autenticación/roles reales, aislamiento multiempresa, gestión segura de secretos, observabilidad, reconciliación durable, validación de consentimiento/titular, límites operativos, merchant/currency confirmados, términos y responsabilidades revisados, manejo de fallos con Reap.

P1 tras validar problema: múltiples presupuestos y centros de costo, aprobaciones por umbral, comprobantes permitidos y exportación de bitácora; cada integración exige alcance y autorización propios.

Hipótesis a entrevistar: frecuencia de compras puntuales, tiempo administrativo por paso, excepciones de presupuesto, quién autoriza, necesidad de factura, merchants imprescindibles y disposición a probar/pagar. Métricas iniciales propuestas: tiempo solicitud→decisión, proporción de políticas explicables, compras duplicadas evitadas en tests, conciliación de intentos y tasa de excepciones. No atribuir ahorros hasta medir una línea base.

Propuesta de monetización sólo para validar: tarifa por equipo o por volumen de solicitudes; no fijar precio ni margen sin coste Reap, soporte y entrevistas.

## Decisiones abiertas

Confirmar acceso independiente y merchant; elegir nombre; confirmar entorno de desarrollo autorizado; resolver contrato de mandato con Reap; elegir moneda y datos de prueba; revisar la situación de asistencia individual si hace falta; conservar puertas a las 17:00 CDMX verificadas en el correo de invitación. Ninguna de estas preguntas autoriza registrar cuentas, reutilizar activos actuales ni ejecutar pagos reales.

## Contraste competitivo acotado

Ramp ya ofrece intake, aprobaciones y agentes de procurement que hacen investigación de proveedores y revisiones dentro de workflows. Por tanto, “compras con IA y aprobaciones” no es un diferenciador defendible por sí solo. Fuente oficial: [Ramp Procurement](https://ramp.com/procurement) y [Procurement agents](https://support.ramp.com/getting-started-with-ramp-procurement-policies/).

Brex ya anuncia reglas de gasto por categorías/merchants, aprobaciones y asistencia de IA; su documentación también describe controles contra autoaprobación bajo condiciones de configuración. No presentar presupuesto y aprobaciones como funciones inéditas. Fuentes oficiales: [Brex Spend Management](https://www.brex.com/product/spend-management) y [Approval chains](https://www.brex.com/support/approval-chains).

Posicionamiento recomendado para este prototipo: una experiencia estrecha de compra puntual delegada, con cotización exacta, consentimiento trazable y manejo explícito de pagos inciertos, construida sobre Reap. Esto es una decisión de foco y una hipótesis de utilidad, no evidencia de que competidores carezcan de esas funciones. La demo puede destacar por claridad de controles, calidad de implementación y disciplina frente a fallos; no por afirmar exclusividad comercial.

Próxima validación: entrevistar equipos sobre compras que hoy quedan fuera de sus herramientas; pedir ejemplos reales de fricción, proveedores imprescindibles y quién mantiene presupuesto. Si una suite actual ya resuelve el caso, acotar a un segmento no atendido antes de expandir. No recomendar abandonar herramientas existentes ni prometer una ventaja de coste sin comparativa contractual.

