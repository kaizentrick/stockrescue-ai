# Integración Reap de StockRescue

Verificado el 9 de octubre de 2026 (CDMX). **El nuevo enrollment está ACTIVE y el checkout simulado fue autorizado; Reap lo mantiene en PROCESSING, con orderId y $360 MXN, sin nextAction.** Todavía no se declara COMPLETED. No se ha cobrado ni movido dinero real. La secuencia actual está en «Reintento del procedimiento de Adrian»; los primeros apartados conservan la evidencia anterior.

## Primeras comprobaciones en vivo · histórico anterior al reintento

- Host fijo `https://sg.sandbox.api.reap.global`, versión `2025-02-14`; clave del correo del evento guardada en 1Password, nunca en Git ni frontend.
- Búsqueda y detalle: Blend Station, café Guerrero Atoyac, variante **250 gr / Grano**, precio unitario **$300 MXN**, `available=true`.
- Producto Reap `prd_77db2c922b12471b8f6588c3f2a9f135`; variante Reap `var_576f1eddfa4a4ad18d6529b0199d61fe`. La variante Shopify del directorio es una referencia distinta y no se envía como variante Reap.
- `POST /agentic/quotes` con `items` y cantidad **1**: quote `159384f4-9306-48da-ba7c-20b191c78865`, subtotal **$300**, envío **$60**, total **$360 MXN**; vencimiento `2026-10-10T02:41:16.545Z`. Es evidencia histórica, no una cotización reutilizable después de vencer.
- Escenario explícito de ejemplo: 2 bolsas disponibles, consumo 0.5/día, entrega 3 días, revisión 2 y seguridad 1. Punto de reposición 2, objetivo 3: comprar 1 bolsa. Los datos de consumo son sintéticos, no ventas reales del comercio.
- Enrollment EXTERNAL creado y consultado; estado **REQUIRES_ACTION**. Referencia del bloqueo: `7652d656-06e2-4717-83e3-8b6465fcbc15`.

La UI también aprobó la cotización posterior `4cd075b8-11dd-4c3c-a0c4-e13b0ad1e108` por el mismo total. El servidor rechazó checkout sin enrollment activo: cero operaciones de pago y cero pedidos; las existencias permanecieron en dos bolsas.

## Bloqueo observado en los primeros enrollments · histórico

La página alojada `sandbox.collect.prava.space` devolvió “Authentication Failed” antes de poder introducir la tarjeta de prueba. El navegador observó **403** en `https://sandbox.auth.visa.com/apn/vts-ber/oauth2/token` y el componente Visa reportó `AUTH_FAILED: Initialisation failed due to errors.` También se probó un autenticador virtual de navegador de pruebas; no resolvió la inicialización. Las sesiones alojadas son de un solo uso: la UI permite crear un enlace nuevo y consultar de nuevo el estado.

**En esos primeros intentos no había evidencia de enrollment ACTIVE, checkout COMPLETED ni orderId sandbox.** El reintento posterior sí alcanzó ACTIVE y generó una referencia de pedido, como se detalla abajo. No se introdujeron datos de una tarjeta real. StockRescue mantiene deshabilitada la compra mientras el enrollment no esté activo. El flujo completo con confirmación y recepción está verificado en el proveedor local simulado, claramente identificado en pantalla; el checkout remoto requiere su propio estado terminal.

La secuencia exigida es completar enrollment alojado, consultar ACTIVE, obtener quote vigente, aprobar snapshot, enviar checkout sandbox y verificar por GET el mismo checkout COMPLETED con orderId y finalAmount. La recepción física se registra aparte; un pago nunca aumenta existencias automáticamente.

## Discrepancias que el MVP bloquea

Una prueba con cuatro bolsas por `items` devolvió `409 VARIANT_UNAVAILABLE` aunque el detalle señalaba disponibilidad general. Un experimento externo con carrito de cuatro devolvió subtotal de una sola bolsa; **esa vía no se utiliza en el proveedor del MVP**. No inferimos stock de cuatro ni descuentos. El subtotal debe coincidir con precio unitario verificado × cantidad; cualquier diferencia bloquea aprobación y checkout. Cotizaciones anteriores sin esta evidencia requieren cotizar de nuevo.

Shipping y campos fiscales opcionales se aceptan como no desglosados cuando faltan. El total final siempre proviene de Reap. No se calcula un total alternativo ni se hace conversión estimada de moneda.

## Ejecución segura

```bash
npm ci
npm run sandbox
```

Requiere 1Password CLI (`op`) con la bóveda desbloqueada y un elemento **StockRescue Reap sandbox**, campo secreto **credential**. Un selector diferente puede indicarse mediante `REAP_VAULT_ITEM`. El lanzador captura la credencial por pipe y la pasa únicamente al entorno del proceso hijo. No imprime el valor ni crea archivos de secretos. La credencial del evento vence al comenzar el **11 de octubre de 2026, 00:00 CDMX**.

La app escucha solo en `127.0.0.1:4317`; SQLite separa práctica y sandbox. El retorno HTTPS de la demo apunta a la documentación oficial de Reap: el usuario vuelve a la pestaña original y consulta el estado. **Este es el lanzador local anterior.** El MVP unificado en 4321 agrega autenticación de propietario y HTTPS por Cloudflare; ver README. No ofrece aislamiento multitienda.

El transporte bloquea producción y destinos alternativos. Checkout sandbox utiliza la cabecera oficial `X-Simulate-Checkout: COMPLETED`; aun así, la aplicación exige enrollment ACTIVE y confirmación posterior por GET. Antes del POST persiste snapshot, reserva y clave de idempotencia. Ante timeout conserva el mismo intento; después de 24 horas requiere revisión manual. El retorno del navegador no acredita compra.

## Reintento del procedimiento de Adrian · 9 de octubre, desde 21:06 CDMX

Se revisó el mensaje de Adrian de las 20:53:27 en el export de Telegram proporcionado por el usuario y la documentación oficial de setup, lifecycle y revocación. Se identificaron los registros por los dos owners creados por StockRescue y se paginaron sus listas hasta `nextCursor=null`. Todos tenían `paymentMethod=null`.

Entre `2026-10-10T03:06:40.640Z` y `03:06:44.520Z` se solicitó `POST /agentic/enrollments/:id/revoke` una vez para cada registro. **Los cinco intentos devolvieron HTTP 409 ENROLLMENT_NOT_ACTIVE. Ninguno quedó REVOKED.** Cada resultado se comprobó con GET posterior:

| Enrollment de StockRescue | Estado antes y después |
| --- | --- |
| `59da6743-ee41-408d-ba01-35413b148adb` | EXPIRED |
| `257381d1-0324-4e26-86af-7816e01fae74` | FAILED |
| `a6a30830-7786-486b-80ec-433f3958961d` | EXPIRED |
| `f4a49c63-e9df-4d69-bcd4-bd3191c06b6d` | EXPIRED |
| `7652d656-06e2-4717-83e3-8b6465fcbc15` | EXPIRED |

Nuevo enrollment: **`8490ec29-45c7-4f28-846b-de149bc6041d`**, creado a `2026-10-10T03:07:07.065Z` (21:07:07 CDMX). Se abrió su enlace nuevo en Safari convencional, ventana privada, a las 21:07:20. Esta vez apareció **Card Details**, en lugar del error de inicialización observado anteriormente. Se llenaron los campos con la tarjeta de prueba oficial terminada en **7847**, distinta de la tarjeta asignada por correo terminada en **1688**. No se utilizó autenticador virtual ni se borraron passkeys del dispositivo.

El usuario aceptó los términos y envió **Enroll Card**; confirmó que apareció **Additional Verification Required**. Se seleccionó el canal de correo y se verificó el OTP fijo publicado en la documentación oficial. A las 21:11 CDMX el flujo mostró **Set Up Passkey**, tarjeta terminada en 7847 y **Create another payment passkey for this card on this device?**, con botón **Continue**. El usuario completó personalmente la passkey. GET a `2026-10-10T03:13:31.667Z` confirmó **ACTIVE**, `paymentMethod.last4=7847` y `nextAction=null`; después se sincronizó ese mismo enrollment en StockRescue.

### Cotización, aprobación y checkout

Desde la UI de StockRescue en Safari se volvió a cotizar y se aprobó una bolsa de café: $300 + $60 de envío + $0 de impuestos = **$360 MXN**. Quote **`6cace446-b284-4dc5-a4d6-011c10829347`**, con vencimiento `2026-10-10T03:18:48.428Z`; aprobación guardada a `03:14:04.162Z` y operación creada a `03:14:13.105Z`, antes del vencimiento. El transporte conserva `X-Simulate-Checkout: COMPLETED` y el host SG sandbox.

Único checkout: **`cc6753a9-1f2a-4eb8-8ed0-69b8b3fa4db6`**. Primero devolvió REQUIRES_ACTION y se abrió su aprobación alojada. Visa mostró **MX$360.00 to Blend Station** y la tarjeta terminada en 7847. A `2026-10-10T03:15:39.008Z` el primer clic en **Verify now** produjo **Something went wrong, please try again.** No se observó en este paso el 403 del enrollment anterior y no se atribuye una causa al mensaje genérico. El usuario completó personalmente un nuevo intento de verificación de la misma passkey y el mismo checkout, sin crear otra compra.

GET a `2026-10-10T03:17:00.611Z` devolvió **PROCESSING**, `orderId=ord_01M4HWVMJ5JJ415H791RMDWWDW`, `finalAmount={amount:360,currency:MXN}` y sin nextAction. Consultas posteriores hasta **`2026-10-10T03:24:47.374Z` (21:24:47 CDMX)** conservan ese estado; la última consulta directa devolvió HTTP 200, `createdAt=2026-10-10T03:14:13.826Z` y `updatedAt=2026-10-10T03:17:00.351Z`. La API documenta PROCESSING como una compra autorizada cuyo pedido todavía se está ejecutando: no equivale a COMPLETED ni a FAILED. StockRescue mantiene la reserva de $360 y no crea entradas por recibir ni aumenta existencias hasta confirmación terminal.

Pendiente: consultar ese mismo checkout hasta conocer su resultado final. No se envió ningún mensaje a José. La autorización alojada ya avanzó; el estado de ejecución del pedido debe describirse por separado.

## Fuentes

- [Setup y tarjetas de prueba](https://docs.reap.global/agentic-payments/setup)
- [OpenAPI](https://docs.reap.global/api-reference/openapi.json)
- [Create checkout](https://docs.reap.global/api-reference/agentic/create-checkout)
- [Idempotencia](https://docs.reap.global/api-reference/idempotency)
- [Evento](https://aibuilders.mx/reap#apis)

## Seguimiento desde el MVP integrado · 9 de octubre de 2026

Se conservó el checkout `cc6753a9-1f2a-4eb8-8ed0-69b8b3fa4db6`, propuesta `5215d68c-2f0e-44b1-834d-61c11b540211`, enrollment `8490ec29-45c7-4f28-846b-de149bc6041d` y reserva de $360 MXN. La consulta del mismo intento continúa devolviendo PROCESSING. El worker vuelve a consultar cada minuto; un fallo de credencial conserva la reserva y muestra LOOKUP_FAILED. No se creó ni aprobó una compra adicional para forzar un resultado terminal.

La recepción y venta del documento DEMO-WA-001 son movimientos de prueba del inventario sandbox, independientes del pedido Reap pendiente. No acreditan pago, entrega comercial ni compra completada.
