# Validación de StockRescue

Validación integrada del 9 de octubre de 2026 (CDMX), macOS, Node 26.8.2. Se distingue evidencia real de Google/Meta/Reap, datos operativos de ejemplo y proveedores simulados en tests. No acredita uso productivo ni compra completada.

## Recorrido real integrado

- Google AI Studio: `gemini-3.8-flash` respondió a una consulta, interpretó una venta como propuesta y extrajo un PDF real de prueba.
- Meta: app StockRescue separada; challenge público aceptado, campo messages suscrito y eventos del número de prueba recibidos. La sesión de WhatsApp en Aside se verificó como +52 55 3373 4608. No se envió al número descartado.
- `/inventario` respondió con 2 bolsas. PDF DEMO-WA-001 enviado desde Aside, descargado por la API oficial: proveedor Laboratorio StockRescue, fecha 2026-10-09, RECEIPT, CAFE-250, una bolsa, conversión 1 y $300. Confirmación explícita → 3 bolsas visibles en el panel HTTPS autenticado.
- Venta de prueba por lenguaje natural → preview → código exacto → 2 bolsas. Aviso de stock bajo recibido, entregado y leído. El documento y la venta son ejemplos sandbox, no hechos comerciales reales.
- Reenvío del mismo PDF → documento ya registrado; repetir confirmación de venta → mismo resultado. Solo dos movimientos, saldo final 2 bolsas.
- Simulación por WhatsApp de demanda +30 % → resultado sintético con semilla y evaluación; inventario sin cambios. El modelo inicialmente propuso varias consultas relacionadas; se corrigió la selección de una única simulación y se volvió a probar realmente.
- `/cotizar CAFE-250` detectó la operación existente y dirigió a `/consultar`; se preservó el mismo checkout PROCESSING y la reserva de $360. No se creó otra compra. Cotización/aprobación hasta compra se valida en tests aislados y en la evidencia sandbox histórica; no se declara un nuevo recorrido remoto COMPLETED.
- LaunchAgent instalado y supervisor reiniciado: nueva URL de Quick Tunnel, callback de la misma app actualizado y activo según Graph API; cola, documentos, movimientos y operación conservados. Una sola instancia del worker.
- Resumen de las 22:40 CDMX sobrevivió al reinicio y se calculó con el inventario vigente, pero el envío quedó REVIEW sin ID confirmado. Se conserva para revisión, sin reintento ciego.
- Segundo resumen, programado desde lenguaje natural en WhatsApp para las 22:52:57 CDMX: se confirmó con código, permaneció SCHEDULED hasta la hora correcta y luego Meta confirmó DELIVERED (`wamid.HBgNNTIxNTUzMzczNDYwOBUCABEYEkMzM0VCRDI2Nzc3MkQ1MjY2MwA=`); visible en Aside. El primer envío incierto permanece REVIEW.
- HTTPS público: /health 200, /api/bootstrap 401 sin sesión, /demo 200, webhook GET inválido 403; sesión de propietario permitió leer el panel. Meta verificó externamente el challenge y envió eventos firmados. El lector web de Codex no pudo abrir el Quick Tunnel; las pruebas HTTPS desde Aside/HTTP y las llamadas externas de Meta sí funcionaron.
- Plantilla stockrescue_notification es_MX: solicitada como UTILITY y aprobada por Meta como MARKETING. Un envío mediante la plantilla fue visible en Aside y confirmado DELIVERED. Se probó dentro de la ventana activa, sin afirmar una espera real de 24 horas. Token renovado con vigencia aproximada de 60 días.

Los IDs salientes reales se conservan en la cola SQLite y sus eventos de entrega/lectura se relacionan en la pantalla Agente y avisos. Las bases y mensajes privados no se publican en Git.

## Automatización reproducible

```sh
npm ci
npm run check
npm run build
npx playwright install chromium webkit
npm run test:ui
```

- `check`: ESLint, TypeScript estricto y **66 pruebas Node**.
- `build`: comprobación TypeScript; el runtime ejecuta TypeScript nativo de Node, sin bundle de producción.
- **16 pruebas de navegador**, ocho en Chromium 156 y ocho en WebKit 27.2.
- `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades reportadas en dependencias de ejecución.
- `git diff --check`: sin errores. Búsqueda de patrones de claves y enlaces alojados privados en archivos versionables: sin coincidencias.

El servidor de UI existe solo en `tests/ui/server.ts`, puerto 4325 y SQLite en memoria. Restablece el estado antes de cada caso; jamás construye un proveedor sandbox. Resultados, trazas y capturas de fallo van a `.tmp/codex/`, fuera de Git. El endpoint de reset no existe en el servidor de producto.

## Acceso de jueces y reconstrucción

La ampliación pública añade una prueba HTTP de aislamiento entre dos visitantes, preservación del inventario del propietario, proyección de evidencia sin contactos ni detalles privados, bloqueo de carga de documentos reales/envío WhatsApp, protección de origen y reinicio individual. La prueba móvil en Chromium y WebKit recorre compra simulada, recepción, documento editable y reinicio sin login. Una primera ejecución encontró una espera insuficiente en el test después de recargar; se corrigió esperando el evento load.

Se comprobó el túnel conectado desde Chromium sin sesión: raíz → /demo/, tres productos, evidencia leída de Google CONNECTED, WhatsApp DELIVERED y el mismo checkout Reap PROCESSING por $360. Sin errores JavaScript. Tras recuperar únicamente el worker, se conservaron la URL del túnel, dos movimientos y dos bolsas de café.

También se inició `npm run demo:public` con su propio Quick Tunnel: entrada sin login y evidencia histórica; ese túnel adicional se usa solo para validar el lanzador y se detiene al terminar, conservando el túnel del MVP.

El lanzador separado `npm run demo:public` utiliza proveedor simulado y memoria, sin cargar credenciales ni clientes externos. Los detalles del arranque y cómo reconstruir el mismo código están en [MAC-DE-CASA](MAC-DE-CASA.md). Git no contiene las bases de la operación conectada.

## Base de integración anterior · evidencia histórica

Validación local del 9 de octubre de 2026, Windows, Node 25.8.1, para [PR #3](https://github.com/kaizentrick/stockrescue-ai/pull/3): `npm run check` pasó ESLint, TypeScript estricto y **54 pruebas Node** (36 del SaaS y 18 del agente). También pasaron `npm run build`, `git diff --check` y `npm run agent:alerts` en modo preview, sin enviar mensajes.

Las pruebas nuevas cubren configuración, firma del webhook, destinatarios autorizados, aislamiento del número de WhatsApp, mensajes duplicados, persistencia y recuperación, vencimientos, respuestas inciertas, cotización y confirmación explícita. Incluyen el recorrido webhook firmado → preview → confirmación → checkout del proveedor simulado, sin duplicarlo al repetir el evento, y el arranque del gateway con TypeScript nativo.

Se usaron credenciales ficticias y clientes simulados: no se hicieron llamadas autenticadas a Google, Meta ni Reap, ni se enviaron mensajes reales. Las pruebas de navegador anteriores corresponden al SaaS; no se volvieron a ejecutar localmente para esta integración. La operación real requiere las credenciales, el callback HTTPS y la plantilla aprobada descritos en [AGENT-INTEGRATION.md](AGENT-INTEGRATION.md).

## Cobertura añadida del MVP

Propietario/revisión/vencimiento e idempotencia de previews; rollback ante stock insuficiente; factura sin stock y recepción con conversión de cajas; duplicado por hash/identidad; ambigüedad, edición posterior al preview y rollback multilínea; tareas y lease tras reabrir SQLite; resumen calculado al vencer y cancelación de su siguiente ocurrencia; simulación reproducible sin filtración temporal ni cambios de stock; memoria del agente e ID repetido; medios y estados Meta; normalización mexicana; autenticación y demo aislada; webhook firmado accesible sin login y duplicado persistido una vez. Selección de una simulación frente a consultas relacionadas, sin seleccionar modificaciones entre varias propuestas.

El recorrido móvil nuevo prueba movimiento, PDF, revisión y simulación en ambos motores. Las pruebas automatizadas usan transporte AI/Meta simulado y nunca realizan compras ni envíos externos.

## Qué cubren las pruebas

Dominio y dinero: min/max, empaques, mínimos, capacidad, reservas, consumo cero, pedidos tardíos, brecha de stock por fecha de llegada y precisión decimal que evita una unidad adicional por redondeo binario. Identidad canónica del café y correspondencia con la fila 20 del directorio oficial.

Transacciones: invalidar aprobación al cambiar inventario, envío, cotización o precio; vencimiento y presupuestos; checkout concurrente y entre instancias SQLite; timeout y recuperación tras reinicio con la misma clave; no repetir automáticamente un intento incierto de más de 24 horas. Respuestas tardías no reactivan propuestas canceladas. Pago no equivale a recepción.

Contrato: sandbox fijo, rutas permitidas, hosts alojados, redirecciones rechazadas, campos fiscales opcionales, subtotal consistente con cantidad y precio unitario, rechazo de cotizaciones antiguas sin evidencia y renovación de enrollment sin sustituir uno activo. HTTP exige origen y formato adecuados, no expone credenciales y no acepta un retorno falsificado como pago.

Navegador: inventario → cotización → aprobación → vinculación ficticia → compra simulada → recepciones parciales → segundo ciclo. Pérdida de respuesta después de aceptar recepción conserva la intención y evita duplicar stock. CSV inválido no modifica datos. Diálogos accesibles por teclado, Escape, foco después de guardar y aprobar. Inventario/detalle/aprobación a 390 y 1440 px; cotización a 320 px con texto duplicado.

## Revisión de interfaz

Tres roles independientes: UX/contenido, UI/espaciado y responsive/accesibilidad/interacción. Se corrigieron aviso permanente de carga, comienzo demasiado bajo en móvil, continuidad del segundo ciclo, copia de recepción parcial, mensajes CSV, concordancias, nombres accesibles de diálogos, restitución de foco, desbordamiento al ampliar texto y selectores nativos WebKit que reducían el área táctil.

Inspección de Chromium y WebKit; anchos representativos de 320, 390, 768, 1024 y 1440 px, más vecinos de los cambios de diseño en 480, 800 y 1100 y hasta 1660 px en el barrido visual. Se distinguieron teclado, toque sin hover, viewport corto, desconexión y recuperación, motion normal y reducido. El analizador estático produjo cero errores y una advertencia MOT004: revisión en ambos motores confirmó que la transición de color se desactiva con `prefers-reduced-motion`.

Límites: texto al 200 % se simuló duplicando tamaños computados; no equivale a una certificación de zoom en todos los navegadores. Sin pruebas físicas de iOS/Android, VoiceOver, lector de pantalla completo ni certificación WCAG. No es PWA ni promete funcionamiento desconectado del servidor.

## Sandbox real

Con la credencial del evento se verificaron búsqueda/detalle, variante y cotización de una bolsa de café por **$360 MXN**. El control inicial rechazó checkout sin enrollment activo. El reintento posterior en Safari convencional, tarjeta oficial distinta, OTP y passkey completada por el usuario llegó a **ACTIVE**, verificado por GET. Cinco solicitudes de revocación de registros anteriores devolvieron 409 ENROLLMENT_NOT_ACTIVE; cuatro estaban EXPIRED y uno FAILED, todos sin tarjeta capturada.

Desde la UI se obtuvo una cotización nueva, se aprobó el total y se creó un único checkout con simulación. La aprobación alojada requirió otra verificación de passkey; después, GET devolvió **PROCESSING**, `orderId` y `finalAmount` de $360 MXN, sin nextAction. **Todavía no se declara COMPLETED**. Se conserva la reserva y se consulta el mismo intento; el inventario no aumenta por la autorización. El 403 del enrollment anterior es evidencia histórica, no el estado del registro nuevo. Detalles, horas y referencias no secretas en [REAP-INTEGRATION.md](REAP-INTEGRATION.md).

El lanzador `npm run sandbox` fue probado con 1Password CLI: servidor iniciado en 127.0.0.1:4317, sin llave en argumentos, archivos ni salida. La práctica de revisión quedó en el puerto 4319 con su base independiente.

## GitHub

`.github/workflows/check.yml` ejecuta en cada PR: Node 26, `npm ci`, check, build y Chromium/WebKit en Ubuntu. Permisos de solo lectura de contenido, sin secretos, despliegue ni llamadas sandbox. Los resultados remotos se consultan en Checks del PR; las pruebas enumeradas arriba fueron ejecutadas localmente.
