# Entorno del agente de WhatsApp

Base de integración de **Google AI Studio / Gemini API** y **Meta WhatsApp Cloud API** para complementar StockRescue. Implementada en [PR #3](https://github.com/kaizentrick/stockrescue-ai/pull/3), sobre `cx/stockrescue-mvp` ([PR #2](https://github.com/kaizentrick/stockrescue-ai/pull/2)).

**Estado:** configuración, clientes HTTP, webhook, cola persistente y puente al SaaS implementados y probados con transportes simulados. No se han usado llaves reales de Google/Meta ni enviado WhatsApps en esta implementación. Las cuentas, número, plantilla aprobada y callback HTTPS los configura el operador. El estado del sandbox de pagos se documenta por separado en [REAP-INTEGRATION.md](REAP-INTEGRATION.md).

## Arquitectura

```text
WhatsApp → gateway :4318 → verificación de firma y destinatario → cola SQLite
  → worker → consultas Gemini / comandos → servicio de StockRescue
  → respuesta por Meta Cloud API

Alertas → cálculo min/max del SaaS → preview → plantilla Meta aprobada
Confirmación explícita → snapshot vigente → aprobación/checkouts del SaaS
```

El gateway publica únicamente `/health` y `/webhooks/whatsapp`. La UI/API local del SaaS sigue en el puerto 4317. Ambos procesos usan `createRuntimeService()` y la misma base de la tienda; cantidades, presupuesto, cotización, idempotencia y recepción pertenecen al SaaS. No se duplicó el motor de inventario.

## Preparar y ejecutar

Requiere Node.js 24+; se usan HTTP/fetch/SQLite nativos, sin SDK adicional ni dependencia de Python. El archivo `.env.agent.example` es una plantilla sin credenciales. Puedes inyectar variables desde el gestor de secretos o preparar una copia local ignorada por Git:

```powershell
npm ci
Copy-Item .env.agent.example .env.agent
# Completar .env.agent localmente; no subirlo ni pegar sus valores en chats.
npm run agent:check
npm start
# En otra terminal, dentro del mismo repositorio:
npm run agent:start
```

`agent:check` valida campos y nombres de configuración; no verifica credenciales remotamente ni imprime secretos. `agent:dev` reinicia el gateway al editar. Cada consulta natural a Gemini usa la llave solo en `x-goog-api-key`, un host fijo y timeout; las compras no dependen de una respuesta del modelo.

| Variable                                                 | Configurar con                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                         | Llave creada en Google AI Studio                                                    |
| `GEMINI_MODEL`                                           | Modelo habilitado en la cuenta; defecto `gemini-3.8-flash`, configurable            |
| `WHATSAPP_ACCESS_TOKEN`                                  | Token Meta con permiso `whatsapp_business_messaging` para el número                 |
| `WHATSAPP_PHONE_NUMBER_ID`                               | ID del número de API Setup; no el ID de WABA ni el número visible                   |
| `WHATSAPP_APP_SECRET`                                    | App Secret de la misma app que envía los webhooks                                   |
| `WHATSAPP_VERIFY_TOKEN`                                  | Secreto propio de al menos 16 caracteres; mismo valor en Meta y gateway             |
| `WHATSAPP_ALLOWED_SENDERS`                               | Números autorizados/con consentimiento, separados por coma, internacionales sin `+` |
| `WHATSAPP_API_VERSION`                                   | Versión Graph configurada en Meta; defecto `v25.0`, configurable                    |
| `WHATSAPP_ALERT_TEMPLATE` / `WHATSAPP_TEMPLATE_LANGUAGE` | Nombre e idioma exactos de una plantilla aprobada                                   |
| `AGENT_PORT` / `AGENT_DB`                                | Puerto 4318 y cola `.data/stockrescue-agent.sqlite` por defecto                     |
| `AGENT_ALLOW_CHECKOUT`                                   | `false` por defecto; `true` habilita el comando explícito de confirmación           |
| `PAYMENTS_MODE` / `STOCKRESCUE_DB`                       | `mock` o `sandbox`, y la misma base que utiliza la tienda del SaaS                  |

Sin `STOCKRESCUE_DB`, el modo selecciona `.data/stockrescue-mock.sqlite` o `.data/stockrescue-sandbox.sqlite`. Para usar el sandbox y la bóveda ya configurada: `npm run agent:sandbox`; este lanzador inyecta la credencial Reap por 1Password sin crear otro archivo de secretos. Si elegiste una ruta de datos personalizada, debe corresponder al mismo modo y a la misma tienda que la UI. No se habilita producción de pagos.

## Conectar Meta

1. En Meta Developers, configurar WhatsApp Cloud API, un número de prueba o autorizado y los destinatarios permitidos. Registrar esos mismos remitentes en `WHATSAPP_ALLOWED_SENDERS`.
2. Exponer **solo el gateway 4318** mediante un callback HTTPS que llegue a `http://127.0.0.1:4318/webhooks/whatsapp`. Configurar en Meta la URL pública completa y el verify token. No exponer el servidor local 4317.
3. Verificar el challenge y suscribir el campo `messages` para la WABA asociada a la app. Si se gestiona esa suscripción por API, usar los permisos de administración que Meta requiera para esa cuenta.
4. Enviar `/inventario` desde un destinatario permitido. Luego preguntar «¿cuánto café queda?» para comprobar la llamada a Gemini. El texto de respuesta usa la ventana de atención de 24 horas del mensaje recibido.
5. Crear y aprobar la plantilla de alertas antes del envío proactivo. Tener token y número no implica tener una plantilla aprobada ni un webhook suscrito.

La firma `X-Hub-Signature-256` se comprueba contra los bytes originales con el App Secret. Eventos de otro Phone Number ID o de remitentes no autorizados no se procesan. Se devuelve 200 después de persistir el mensaje; Gemini y el envío a Meta ocurren en un worker separado. Los IDs de mensaje repetidos no ejecutan otra acción.

## Consultas, preview y confirmación

| Mensaje             | Resultado                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| `/ayuda`            | Comandos disponibles                                                         |
| `/inventario`       | Disponibilidad, cobertura y cantidades de reposición                         |
| `/pedidos`          | Estado de compras y cantidad recibida                                        |
| `/reporte`          | Inventario, pedidos y presupuesto                                            |
| `/cotizar CAFE-250` | Cotización del SaaS, cantidad, destino, total y código de confirmación       |
| `/confirmar CODIGO` | Con opt-in y enrollment ACTIVE, aprueba ese snapshot y envía el mismo pedido |
| `/consultar ID`     | Consulta/reconcilia el mismo intento, sin crear una compra nueva             |
| Pregunta natural    | Gemini interpreta un contexto del SaaS de solo lectura                       |

El código de confirmación está ligado al remitente, al hash completo de la cotización y a su vencimiento. Recotizar, cambiar inventario/destino o vencer invalida el código. Un «sí» aislado o una instrucción al LLM no ejecuta compras. Confirmar de nuevo un intento existente devuelve su estado. La tarjeta de prueba se vincula en la UI del SaaS; el agente no recibe datos de tarjeta. Recibir mercancía sigue siendo una operación del SaaS y no se infiere de un pago.

Gemini recibe la pregunta y un contexto limitado (hasta 100 productos y 30 propuestas/entradas): nombres/SKU, cantidades, análisis, totales vigentes, estado de pedidos y presupuesto. No se le envían el teléfono del remitente, dirección de envío, correo ni llaves. Este entorno hace consultas independientes: no incluye memoria conversacional prolongada ni interpretación de audio/documentos.

## Alertas

Preparar previews sin mensajes externos ni llamadas a Gemini:

```powershell
npm run agent:alerts
```

Cuando Meta, la plantilla y los destinatarios estén configurados, el operador puede ejecutar:

```powershell
npm run agent:alerts -- --send
```

Texto sugerido para la plantilla `stockrescue_low_stock` (`es_MX`), con **cuatro parámetros de texto en el cuerpo**:

```text
StockRescue: {{1}} necesita reposición.
Preview: {{2}}. Total: {{3}}.
Responde {{4}} para revisar la propuesta.
```

Los parámetros son nombre, paquetes/piezas calculados, total de una cotización vigente con modo identificado y comando `/cotizar SKU`. Para un SKU sin proveedor habilitado se ofrece `/inventario`; no se promete una cotización disponible. Si falta una cotización vigente, se indica «sin cotización vigente»; no se inventa el coste. La alerta no cotiza, aprueba ni compra automáticamente. El comando de preview obtiene el total concreto antes de confirmar.

El script puede conectarse al programador de tareas del operador; no instala un cron ni crea automatizaciones al ejecutar el setup. El registro separado `AGENT_DB.alerts` evita repetir la misma evidencia para el mismo remitente y día CDMX. Un timeout o respuesta perdida de Meta queda para revisión, sin reenvío automático que pueda duplicar mensajes. Usar un solo proceso del gateway por `AGENT_DB` y un solo job de alertas por registro.

## Operación y pruebas

```powershell
npm run check
npm run build
```

La suite incluye configuración sin filtración de llaves, contratos HTTP Gemini/Meta, firma y challenge, filtros de número/remitente, deduplicación del webhook, aislamiento de datos enviados al modelo, preview, opt-in, confirmation por remitente/vencimiento/snapshot, idempotencia, recuperación de cola, entrega incierta y ventana de 24 horas. Todos usan proveedores falsos; no acreditan habilitación de cuentas ni entrega real por Meta.

Si una respuesta estaba lista al reiniciar, el worker reutiliza ese texto. Si Meta pudo haber aceptado el envío pero se perdió la respuesta, el job queda `REVIEW`; comprobar delivery en Meta y el estado del pedido en el SaaS antes de una intervención manual. No se borran reservas para forzar otra compra. La cola guarda mensajes y remitentes localmente: tratarla como datos privados. `.env.agent`, bases y registros están excluidos de Git.

Este PR entrega un entorno de integración para una sola tienda. Despliegue público, aislamiento entre empresas, identidad corporativa, memoria conversacional y operación gestionada quedan para el agente/SaaS posterior.

## Contratos consultados

- [Google: llave de AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
- [Google: generateContent](https://ai.google.dev/api/generate-content) y [modelos](https://ai.google.dev/gemini-api/docs/models)
- [Meta: Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Meta: webhook y firma](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/)
- [Meta: plantillas](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
