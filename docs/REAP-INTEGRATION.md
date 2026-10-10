# Contrato sandbox y límites de integración

Consultado el 10 de octubre de 2026. La aplicación servida es una **simulación local**; no se ha probado la credencial sandbox ni se ha realizado enrollment, quote o checkout real de Reap.

## Implementado

`src/reap.ts` es un transporte server-side independiente, con base fija `https://sg.sandbox.api.reap.global`, `Authorization: Bearer`, versión `2025-02-14`, timeout y redirecciones HTTP rechazadas. No se importa desde frontend. Expone las operaciones documentadas de enrollment EXTERNAL, lectura ACTIVE, search/details/variant, quote, selección de envío, lectura de quote, checkout y consulta de checkout. El único valor de simulación enviado es `X-Simulate-Checkout: COMPLETED`. Los errores no incluyen cuerpos, cabeceras o credenciales.

El transporte exige una clave de idempotencia al llamador para cada POST. El servicio mock persiste claves antes del envío y usa reserva atómica SQLite. El transporte Reap no activa automáticamente el servicio mock: conectar un adaptador externo requiere completar el mapeo y las comprobaciones siguientes. Tener métodos de transporte **no equivale a integración verificada**.

## Ejecutor acotado de catálogo

`createCatalogSandboxExecutor(apiKey)` crea una capacidad inmutable con únicamente `search`, `details` y `variant`. Construirla no lee archivos ni variables de entorno y no envía solicitudes. La entrada persistente y el uso de la credencial requieren autorización específica. El usuario autorizó ese alcance de catálogo; el valor debe introducirlo personalmente en el archivo local ignorado y confirmar que terminó antes de cargarlo. Esta restricción no activa la integración ni acredita una llamada real.

La prueba de catálogo solo admite:

| Método | Ruta literal |
|---|---|
| POST | `/agentic/products/search` |
| POST | `/agentic/products/details` |
| POST | `/agentic/products/variant` |

Destino fijo: `https://sg.sandbox.api.reap.global`, HTTPS y puerto estándar. No se acepta URL/base configurable. Se rechazan antes de construir cabeceras o llamar al transporte otros métodos, rutas de enrollment/quote/checkout, URLs absolutas, hosts alternativos, query/fragmento, rutas escapadas y segmentos de navegación. No se permite cabecera de simulación en catálogo. Cada operación exige la clave de idempotencia del llamador.

Fetch usa `redirect: error`. También se rechazan respuestas 3xx, marcadas como redirigidas o cuya URL no coincide con la solicitada, incluso ante un transporte de prueba que ignore esa opción. Los errores no imprimen la clave, headers, cuerpo ni destino suministrado.

El adaptador general también adopta alcance `catalog` por defecto y copia su configuración para impedir ampliación por mutación externa. Su scaffold de pagos exige `mode: payments` explícito y conserva una lista cerrada de rutas; este modo sigue desconectado de la aplicación, no está autorizado por el permiso de catálogo y no es integración comprobada. El ejecutor de catálogo no expone ese selector ni el método genérico de transporte.

Las pruebas utilizan exclusivamente credenciales ficticias y fetch falso. Esta restricción es del código cliente; no equivale a restringir permisos de la API key en Reap ni evita que otro programa con acceso al archivo use la credencial.

## Pendiente antes de activar tráfico Reap

1. El usuario debe autorizar específicamente configuración persistente y aportar `REAP_API_KEY` por entrada segura. No leerla del correo ni pegarla en chat, logs o commits. `.env.example` mantiene campos vacíos. No hay provisión automática ni creación de llaves.
2. La lista oficial fue aportada y verificada por el hilo padre; ver MERCHANTS.md. Confirmar aún identificadores API, país, moneda y disponibilidad para esta integración. No se presupone Shopify ni otra plataforma. `fixture-office` es inventado y no se debe enviar a Reap.
3. Configurar retorno HTTPS y hosts alojados verificados. El enrollment debe ser EXTERNAL; los datos de tarjeta se introducen únicamente en la página alojada por Reap. Esta tarea no prueba tarjetas ni crea cuentas.
4. Mapear respuestas reales de producto/variante a capacidad de vídeo respaldada por evidencia del fabricante; no deducir protocolo de un título de catálogo. Aplicar allowlist al merchant realmente asociado a esa variante, no al texto suministrado por el cliente.
5. Mapear cotización y `shippingOptions` seleccionada: mostrar `amountBreakdown.finalAmount`, moneda y `expiresAt`; registrar dirección y opción de envío dentro del snapshot. No sumar nuevamente impuestos ya incluidos. El mock usa centavos enteros; la API devuelve cantidades monetarias en unidades mayores, que requieren conversión decimal exacta.
6. Releer quote y enrollment ACTIVE antes de ejecutar. Comparar snapshot aprobado, reservar presupuesto en transacción, persistir cuerpo e Idempotency-Key. Si cambian precio, variante, merchant, cantidad, envío, destino, moneda o vencimiento, pedir nueva aprobación.
7. Manejar `nextAction` alojada y luego GET checkout. El retorno no acredita éxito. Solo COMPLETED con orderId y finalAmount válidos confirma pedido. Instalación/incidencia siguen pendientes. Reconciliar diferencias entre cotización y finalAmount para revisión humana.
8. Persistir respuestas verificadas y consultar PROCESSING/REQUIRES_ACTION. Ante timeout sin checkoutId, conservar estado incierto y reintentar **mismo cuerpo y clave**, solo dentro de las 24 h de retención documentadas. Pasadas 24 h, revisión manual; nunca una nueva compra a ciegas. 409 en curso requiere backoff; 429 puede reintentarse con misma clave. Los errores de negocio requieren corrección, nueva cotización y aprobación; no generar claves nuevas automáticamente.

## Discrepancias oficiales conservadas

- La guía one-time describe mandatos pero declara `MANDATES_AVAILABLE = false` y endpoints no disponibles. No hay código que los invoque ni una suposición de habilitación.
- `externalCheckout` aparece en guías con requisito de allowlist por integración y referencias con distinta disponibilidad. No implementamos esa vía: hay que confirmarla con Reap.
- La guía muestra sandbox genérico y la referencia create-checkout publica `sg.sandbox.api.reap.global` y `2025-02-14`. Se fija la referencia regional indicada por el contrato y se debe validar con Reap al habilitar la cuenta.
- Credencial entregada por la organización: vencimiento comunicado al comenzar el 11 de octubre de 2026, 00:00 CDMX (06:00 UTC). Valor y validez no inspeccionados.

## Fuentes oficiales

- https://aibuilders.mx/reap#apis
- https://docs.reap.global/agentic-payments/setup
- https://docs.reap.global/agentic-payments/one-time-purchases
- https://docs.reap.global/api-reference/agentic/create-checkout
- https://docs.reap.global/agentic-payments/lifecycle
- https://docs.reap.global/api-reference/idempotency
