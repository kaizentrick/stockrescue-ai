# Agente operativo de StockRescue

Verificación real del 9 de octubre de 2026 (CDMX). La base de [PR #3](https://github.com/kaizentrick/stockrescue-ai/pull/3) está integrada en [PR #2](https://github.com/kaizentrick/stockrescue-ai/pull/2). Google AI Studio respondió con `gemini-3.8-flash`; WhatsApp recibió consultas y PDF, respondió y produjo eventos `sent`, `delivered` y `read`. La plataforma y el bot comparten inventario, documentos y operaciones. Reap conserva su checkout **PROCESSING**, sin otra compra.

## Ejecución y credenciales

El proceso unificado `src/mvp.ts` sirve en `127.0.0.1:4321`. El panel requiere autenticación; `/demo` es público y usa datos simulados independientes. `/webhooks/whatsapp` es público con challenge y firma HMAC. El supervisor `src/launch.ts` lee mediante **1Password CLI**, captura los secretos en memoria, inicia el servidor y Cloudflare y actualiza la suscripción de la app cuando cambia la URL.

```sh
npm run service -- status
npm run service -- stop
npm run service -- start
npm run service -- restart
# Diagnóstico, con el servicio detenido:
npm run mvp:public
```

`npm run service -- install` registra una sola vez el LaunchAgent `com.kaizentrick.stockrescue`; ya está instalado en este Mac. Se inicia con la sesión y se recupera tras fallos. Requiere que 1Password permita leer las credenciales y que el Mac esté despierto y conectado. No reiniciar ni detener Codex/Aside para administrarlo. No arrancar simultáneamente el gateway antiguo `agent:start` o el job antiguo `agent:alerts`.

Los elementos son `GOOGLE_AI_STUDIO_API_KEY`, `StockRescue Reap sandbox`, `StockRescue Owner` y `StockRescue WhatsApp`, campo `credential`. El último es JSON con `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_ALERT_TEMPLATE`, `WHATSAPP_TEMPLATE_LANGUAGE`. Nunca imprimir ni copiar sus valores a `.env`, Git, navegador o logs. Para renovar, editar el elemento con 1Password CLI mediante stdin y reiniciar el servicio; no pasar valores secretos como argumentos.

Configuración no secreta local: `.data/service.json` con `{"metaConfigured":true}`. La contraseña del propietario se entrega por **StockRescue Owner** en la bóveda. Las sesiones duran 12 horas y usan cookies HttpOnly y SameSite=Strict, Secure por HTTPS; hay límite de intentos de acceso. No hay cuentas de clientes ni aislamiento entre empresas.

## Configuración de Meta comprobada

| Recurso | Valor |
|---|---|
| App independiente | StockRescue · `1898550861524224` |
| Negocio | Kaizen Trick · `8539219712820315` |
| WABA de prueba | `967650119417397` |
| Número del bot | +1 555 653 4554 |
| Phone Number ID | `1087049364500197` |
| Único destinatario autorizado | +52 55 3373 4608 |
| Versión Graph | v26.0 |
| Suscripción | whatsapp_business_account / messages, activa |
| Plantilla | stockrescue_notification · es_MX · UTILITY |
| ID de plantilla | `2260490044523058` |

El negocio ofreció su WABA de prueba. Se comprobó que no estaba suscrita a Cenlo; se añadió únicamente la app StockRescue, conservando la aplicación interna de Meta ya suscrita. Las apps de Cenlo no se modificaron. El número descartado no se utilizó para ningún envío. Se normaliza `521` a `52` para el mismo número móvil mexicano, sin ampliar la lista de destinatarios.

La plantilla propia está **PENDING** de aprobación de Meta en la última consulta. Contiene cuatro parámetros para servicio, estado, detalle y acción pendiente. Mientras no esté aprobada, los avisos fuera de la ventana de 24 horas no se consideran entregados: quedan REVIEW si Meta rechaza el envío. Dentro de la ventana se envía texto; stock bajo y el resumen programado se comprueban por eventos, no por HTTP 200.

El token se intercambió por uno de larga duración: Meta devolvió `expires_in=5183999`, aproximadamente 60 días desde el 9 de octubre por la noche. La vigencia no es permanente y debe renovarse antes de caducar. La app y el número continúan siendo de prueba; no se afirma habilitación productiva ni capacidad de enviar a otros números.

## Conversación y confirmaciones

| Solicitud | Comportamiento |
|---|---|
| `/inventario`, `/pedidos`, `/reporte` | Consulta real del mismo servicio |
| «Vendí una bolsa de café» | Propone venta; no modifica stock |
| `/aceptar CODIGO` | Confirma solo la acción vigente del remitente; repetir no duplica |
| PDF, JPEG o PNG | Descarga oficial, extracción y documento pendiente de revisión |
| «Simula 30 % más café» | Escenario sintético separado con semilla, supuestos y error de evaluación |
| «¿Qué demanda prevés?» | Historial confirmado o supuesto explícito si faltan datos |
| «Recuérdame…», «Programa un resumen…» | Propuesta de tarea persistente, hora CDMX, canal y frecuencia |
| «Cancela el recordatorio…» | Propuesta de cancelación vinculada al remitente |
| `/cotizar CAFE-250` | Cotización vigente y confirmación específica, o referencia del intento existente |
| `/confirmar CODIGO` | Valida cotización, presupuesto y enrollment; solo Reap sandbox |
| `/consultar ID` | Reconcilia el mismo intento |

Se conservan las últimas 12 interacciones por identidad y tienda. El modelo ve cantidades, estado, análisis y contexto limitado; no recibe llaves, dirección de envío ni correo. Los documentos y resultados se tratan como datos. Las herramientas no permiten confirmar ni comprar: esas decisiones pasan por comandos explícitos y validaciones del backend. Una pregunta que combina varias modificaciones solicita aclaración.

Los documentos conservan bytes y huella en SQLite privado. La UI permite corregir proveedor, folio, fecha, tipo, SKU, cantidad, unidad y conversión. Si hay ambigüedad, no se confirma. Una factura PURCHASE solo se archiva; SALE resta y RECEIPT suma tras confirmación. Hash idéntico o identidad documental repetida no producen otro movimiento. Cambiar la revisión invalida el código anterior. Cada movimiento registra fecha, origen y documento.

## Avisos y recuperación

El worker efectivamente ejecuta recordatorios/resúmenes y detecta stock bajo, cotización próxima a vencer, cambios de pedido y mercancía por recibir. Los resúmenes se calculan con el inventario del momento; frecuencia una vez, diaria o semanal, zona America/Mexico_City. Cancelaciones y ocurrencias sobreviven a reinicios. Si el Mac estuvo apagado se atiende una ocurrencia vencida y se avanza la siguiente, sin enviar una ráfaga histórica.

La cola deduplica los IDs entrantes. Se persiste la respuesta antes de enviar y el ID saliente al confirmarlo Meta. Eventos de entrega/fallo se relacionan por ese ID. Un resultado incierto queda REVIEW; no se reenvía a ciegas. La pantalla Agente y avisos muestra estos casos. El lease SQLite evita dos workers del MVP. No borrar la base para desbloquear un envío ni liberar una reserva Reap manualmente.

El Quick Tunnel cambia de dirección al reiniciar su supervisor. `npm run service -- status` muestra la última URL; comprobar `/health`. El lanzador registra `/webhooks/whatsapp` en la misma app y vuelve a suscribir su WABA. Se verificó el cambio real de callback después del reinicio. Si falla, detener el servicio, ejecutar `npm run mvp:public` en primer plano, desbloquear 1Password y revisar la credencial/callback; los errores no imprimen secretos. Volver a iniciar el servicio después de detener la ejecución manual.

Pruebas y límites comprobados: [QA](QA.md). No se afirma precisión comercial del pronóstico, continuidad con el Mac dormido, compra COMPLETED ni aprobación de plantilla pendiente.

## Contratos de referencia

- [Google AI Studio: generateContent](https://ai.google.dev/api/generate-content)
- [Meta: API y plantillas](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Meta: verificación del webhook](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/)
