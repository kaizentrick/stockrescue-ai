# Abrir StockRescue desde otra Mac

La rama vigente es **`cx/stockrescue-mvp`**, en [kaizentrick/stockrescue-ai](https://github.com/kaizentrick/stockrescue-ai/tree/cx/stockrescue-mvp). `main` puede no contener todavía el MVP. La Mac actual conserva la integración de Google/Meta/Reap; otra Mac puede abrir su propio túnel de práctica sin tocarla.

## Arranque para jueces y equipo · sin credenciales

Requiere Git, Node.js 24 o posterior, npm y `cloudflared` en PATH. El CI usa Node 26. Con Homebrew instalado, `brew install node cloudflared` instala los faltantes; no reinstalar lo que ya funciona.

```sh
git clone --branch cx/stockrescue-mvp https://github.com/kaizentrick/stockrescue-ai.git
cd stockrescue-ai
npm ci
npm run check
npm run build
# Opcional para repetir también las pruebas de navegador:
npx playwright install chromium webkit
npm run test:ui
# Vista local en http://127.0.0.1:4322:
npm run demo
# Detener la vista local con Ctrl+C antes del túnel:
caffeinate -i npm run demo:public
```

El comando imprime la URL HTTPS y guarda solo esa URL en `.data/demo-public-url`. Abrirla: debe llevar a `/demo/` sin contraseña. Mantener abierta esa terminal, la Mac despierta y conectada; Ctrl+C detiene ese proceso y su túnel. Reiniciar crea otra URL y borra las sesiones de práctica. No cerrar la tapa durante la validación.

Cada visitante tiene una base SQLite en memoria, separada del resto, hasta una hora o hasta reiniciar. El arranque público no lee 1Password ni `.data/stockrescue-sandbox.sqlite`, no crea clientes Reap/Google/Meta y no modifica el webhook. Esto permite dejar ambos equipos activos. Solo guarda la URL pública, no datos de visitantes. La evidencia del sandbox se marca **histórica** en esta Mac.

Para actualizar un clon limpio: `git fetch origin` y `git pull --ff-only origin cx/stockrescue-mvp`. Si hay cambios locales o divergencia, revisarlos antes; no usar reset ni force push. Si el repo pide autenticación, usar la sesión existente de GitHub/`gh auth login`, sin pegar tokens en el prompt.

## Prompt para pegar en Codex en la Mac de casa

```text
Reconstruye y deja abierta la demo de StockRescue para jueces desde este Mac.

Repositorio: https://github.com/kaizentrick/stockrescue-ai
Rama requerida: cx/stockrescue-mvp (no asumir que main está actualizado).

1. Busca un clon existente y verifica remote, rama y cambios pendientes. Si no existe, clona esa rama en una carpeta apropiada del usuario. Conserva cambios ajenos; no uses reset/force ni mezcles proyectos.
2. Lee AGENTS.md si existe, README.md, docs/MAC-DE-CASA.md, docs/DEMO-SCRIPT.md y docs/QA.md. Consulta Memory si está disponible, pero comprueba el código vivo; si falla, usa el repo y comunica la limitación.
3. Verifica Git, Node >=24 (CI: 26), npm y cloudflared en PATH. Instala únicamente los faltantes usando las herramientas habituales del Mac. Ejecuta npm ci, npm run check y npm run build. Instala los navegadores de Playwright si faltan y corre npm run test:ui.
4. Ejecuta npm run demo:public en una terminal persistente, manteniendo la Mac despierta con caffeinate -i si corresponde. Usa el lanzador incluido, puerto 4322. No ejecutes mvp:public, service install, agent:start ni agent:alerts: el otro Mac seguirá llevando Google, WhatsApp y Reap. No leas ni copies sus secretos o sus bases y no cambies el callback de Meta.
5. Comprueba la nueva URL HTTPS: la raíz debe abrir /demo/ sin login, /health debe responder y el recorrido debe permitir cotizar, aprobar, enviar una compra simulada y registrar recepción. Repite desde otro contexto de navegador para verificar que no comparte inventario. Comprueba documento de ejemplo y simulación. No efectúes compras ni mensajes externos.
6. Mantén claras las etiquetas: práctica simulada; comandos locales sin Gemini; evidencia histórica del checkout cc6753a9-1f2a-4eb8-8ed0-69b8b3fa4db6, que estaba PROCESSING por $360 MXN. No inventes una nueva consulta a Reap ni un resultado COMPLETED.
7. Entrega URL abierta, rama y commit exactos, resultados de pruebas y cómo detener/reabrir la demo. Deja el proceso y túnel activos. Usa docs/DEMO-SCRIPT.md para que Kaizen pueda revisar y grabar el video; no envíes la candidatura ni publiques mensajes por tu cuenta.

Autorizo el arranque y publicación de esta demo temporal aislada. No necesito contraseña para los jueces. Si hay una verificación personal de GitHub o de macOS, pídeme solo esa intervención y continúa con lo demás.
```

## Si después se necesita trasladar la integración conectada

Esto es un cambio de sede, no el arranque anterior. Se necesita el mismo acceso autorizado a 1Password y las bases privadas del proyecto. **Git no contiene el checkout ni la cola de mensajes.** No arrancar un worker nuevo sobre una base vacía: no reconstruye el intento existente.

1. Coordinar el cambio y detener `npm run service -- stop` en el Mac original. El lease solo coordina procesos que comparten esa SQLite; no protege dos copias en equipos distintos.
2. Con los procesos detenidos, transferir por un canal privado autorizado las bases de StockRescue y sus archivos WAL/SHM si existen. Incluye `stockrescue-sandbox.sqlite`, `stockrescue-agent.sqlite` y `service.json`, exclusivamente dentro de `.data`. No subirlos a Git ni copiar bases internas de Codex. No transferir `public-url`, secretos o logs.
3. En casa, verificar integridad y que siga presente el checkout `cc6753a9-1f2a-4eb8-8ed0-69b8b3fa4db6`. Usar los elementos existentes de 1Password únicamente por CLI, sin imprimir valores. Conservar el único destinatario autorizado.
4. Configurar `{"metaConfigured":true}` en `.data/service.json` si corresponde. Probar `npm run mvp:public`; el lanzador registra el nuevo callback de la misma app. El lanzador conectado actual espera `cloudflared` en `/opt/homebrew/bin/cloudflared` (Apple Silicon); revisar esa ruta antes en una Mac Intel.
5. Verificar salud, inventario, mismo checkout y callback. No volver a comprar para demostrar el traslado. Registrar el LaunchAgent una sola vez con `npm run service -- install` después de detener el modo manual. Dejar apagado el worker anterior.

La clave Reap del evento vence el 11 de octubre de 2026 a las 00:00 CDMX, según la información recibida. Después del vencimiento, la práctica abierta sigue funcionando; la conexión sandbox requiere una credencial vigente. El token de Meta tampoco es permanente. Ver [AGENT-INTEGRATION](AGENT-INTEGRATION.md).
