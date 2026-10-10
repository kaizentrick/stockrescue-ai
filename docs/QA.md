# Validación de StockRescue

Validación del SaaS del 9 de octubre de 2026, macOS, Node 26.8.2. Estas pruebas distinguen simulación local y respuestas reales del sandbox. No acreditan operación productiva. La validación posterior del entorno de WhatsApp se documenta por separado abajo.

## Automatización reproducible

```sh
npm ci
npm run check
npm run build
npx playwright install chromium webkit
npm run test:ui
```

- `check`: ESLint, TypeScript estricto y **36 pruebas Node**.
- `build`: comprobación TypeScript; el runtime ejecuta TypeScript nativo de Node, sin bundle de producción.
- **12 pruebas de navegador**, seis en Chromium 156 y seis en WebKit 27.2.
- `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades reportadas en dependencias de ejecución.
- `git diff --check`: sin errores. Búsqueda de patrones de claves y enlaces alojados privados en archivos versionables: sin coincidencias.

El servidor de UI existe solo en `tests/ui/server.ts`, puerto 4325 y SQLite en memoria. Restablece el estado antes de cada caso; jamás construye un proveedor sandbox. Resultados, trazas y capturas de fallo van a `.tmp/codex/`, fuera de Git. El endpoint de reset no existe en el servidor de producto.

## Entorno Gemini y WhatsApp

Validación local del 9 de octubre de 2026, Windows, Node 25.8.1, para [PR #3](https://github.com/kaizentrick/stockrescue-ai/pull/3): `npm run check` pasó ESLint, TypeScript estricto y **54 pruebas Node** (36 del SaaS y 18 del agente). También pasaron `npm run build`, `git diff --check` y `npm run agent:alerts` en modo preview, sin enviar mensajes.

Las pruebas nuevas cubren configuración, firma del webhook, destinatarios autorizados, aislamiento del número de WhatsApp, mensajes duplicados, persistencia y recuperación, vencimientos, respuestas inciertas, cotización y confirmación explícita. Incluyen el recorrido webhook firmado → preview → confirmación → checkout del proveedor simulado, sin duplicarlo al repetir el evento, y el arranque del gateway con TypeScript nativo.

Se usaron credenciales ficticias y clientes simulados: no se hicieron llamadas autenticadas a Google, Meta ni Reap, ni se enviaron mensajes reales. Las pruebas de navegador anteriores corresponden al SaaS; no se volvieron a ejecutar localmente para esta integración. La operación real requiere las credenciales, el callback HTTPS y la plantilla aprobada descritos en [AGENT-INTEGRATION.md](AGENT-INTEGRATION.md).

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
