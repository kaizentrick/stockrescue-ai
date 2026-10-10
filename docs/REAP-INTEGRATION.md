# Integración Reap de StockRescue

Verificado el 9 de octubre de 2026 (CDMX). La aplicación conecta con la API sandbox; **la compra completa aún está bloqueada por la autenticación alojada del proveedor**. No se ha cobrado ni movido dinero real.

## Qué se verificó en vivo

- Host fijo `https://sg.sandbox.api.reap.global`, versión `2025-02-14`; clave del correo del evento guardada en 1Password, nunca en Git ni frontend.
- Búsqueda y detalle: Blend Station, café Guerrero Atoyac, variante **250 gr / Grano**, precio unitario **$300 MXN**, `available=true`.
- Producto Reap `prd_77db2c922b12471b8f6588c3f2a9f135`; variante Reap `var_576f1eddfa4a4ad18d6529b0199d61fe`. La variante Shopify del directorio es una referencia distinta y no se envía como variante Reap.
- `POST /agentic/quotes` con `items` y cantidad **1**: quote `159384f4-9306-48da-ba7c-20b191c78865`, subtotal **$300**, envío **$60**, total **$360 MXN**; vencimiento `2026-10-10T02:41:16.545Z`. Es evidencia histórica, no una cotización reutilizable después de vencer.
- Escenario explícito de ejemplo: 2 bolsas disponibles, consumo 0.5/día, entrega 3 días, revisión 2 y seguridad 1. Punto de reposición 2, objetivo 3: comprar 1 bolsa. Los datos de consumo son sintéticos, no ventas reales del comercio.
- Enrollment EXTERNAL creado y consultado; estado **REQUIRES_ACTION**. Referencia del bloqueo: `7652d656-06e2-4717-83e3-8b6465fcbc15`.

La UI también aprobó la cotización posterior `4cd075b8-11dd-4c3c-a0c4-e13b0ad1e108` por el mismo total. El servidor rechazó checkout sin enrollment activo: cero operaciones de pago y cero pedidos; las existencias permanecieron en dos bolsas.

## Bloqueo observado y límite de la validación

La página alojada `sandbox.collect.prava.space` devuelve “Authentication Failed” antes de poder introducir la tarjeta de prueba. El navegador observó **403** en `https://sandbox.auth.visa.com/apn/vts-ber/oauth2/token` y el componente Visa reportó `AUTH_FAILED: Initialisation failed due to errors.` También se probó un autenticador virtual de navegador de pruebas; no resolvió la inicialización. Las sesiones alojadas son de un solo uso: la UI permite crear un enlace nuevo y consultar de nuevo el estado.

**No hay evidencia de enrollment ACTIVE, checkout COMPLETED ni orderId sandbox.** No se introdujeron datos de una tarjeta real. StockRescue mantiene deshabilitada la compra mientras el enrollment no esté activo. El flujo completo con confirmación y recepción está verificado únicamente en el proveedor local simulado, claramente identificado en pantalla.

Para continuar con Reap se necesita que su sandbox complete la inicialización de Visa. Después: obtener quote vigente, aprobar snapshot, completar enrollment alojado, consultar ACTIVE, enviar checkout sandbox y verificar por GET el mismo checkout COMPLETED con orderId y finalAmount. La recepción física se registra aparte; un pago nunca aumenta existencias automáticamente.

## Discrepancias que el MVP bloquea

Una prueba con cuatro bolsas por `items` devolvió `409 VARIANT_UNAVAILABLE` aunque el detalle señalaba disponibilidad general. Un experimento externo con carrito de cuatro devolvió subtotal de una sola bolsa; **esa vía no se utiliza en el proveedor del MVP**. No inferimos stock de cuatro ni descuentos. El subtotal debe coincidir con precio unitario verificado × cantidad; cualquier diferencia bloquea aprobación y checkout. Cotizaciones anteriores sin esta evidencia requieren cotizar de nuevo.

Shipping y campos fiscales opcionales se aceptan como no desglosados cuando faltan. El total final siempre proviene de Reap. No se calcula un total alternativo ni se hace conversión estimada de moneda.

## Ejecución segura

```bash
npm ci
npm run sandbox
```

Requiere 1Password CLI (`op`) con la bóveda desbloqueada y un elemento **StockRescue Reap sandbox**, campo secreto **credential**. Un selector diferente puede indicarse mediante `REAP_VAULT_ITEM`. El lanzador captura la credencial por pipe y la pasa únicamente al entorno del proceso hijo. No imprime el valor ni crea archivos de secretos. La credencial del evento vence al comenzar el **11 de octubre de 2026, 00:00 CDMX**.

La app escucha solo en `127.0.0.1:4317`; SQLite separa práctica y sandbox. El retorno HTTPS de la demo apunta a la documentación oficial de Reap: el usuario vuelve a la pestaña original y consulta el estado. **No hay callback HTTPS público ni autenticación multiusuario**. No publicar este servidor local; una entrega pública exige autenticación y aislamiento por tienda, HTTPS propio y revisión de despliegue.

El transporte bloquea producción y destinos alternativos. Checkout sandbox utiliza la cabecera oficial `X-Simulate-Checkout: COMPLETED`; aun así, la aplicación exige enrollment ACTIVE y confirmación posterior por GET. Antes del POST persiste snapshot, reserva y clave de idempotencia. Ante timeout conserva el mismo intento; después de 24 horas requiere revisión manual. El retorno del navegador no acredita compra.

## Fuentes

- [Setup y tarjetas de prueba](https://docs.reap.global/agentic-payments/setup)
- [OpenAPI](https://docs.reap.global/api-reference/openapi.json)
- [Create checkout](https://docs.reap.global/api-reference/agentic/create-checkout)
- [Idempotencia](https://docs.reap.global/api-reference/idempotency)
- [Evento](https://aibuilders.mx/reap#apis)
