# Evidencia de verificación

## Automatizada

`npm run check`: ESLint + TypeScript estricto + 24 pruebas Node, sin fallos. Se ejecutaron con permiso para sockets loopback; el sandbox inicial bloqueaba `listen`, no era un fallo de lógica.

Cobertura: conexión directa/reutilización sin compra, accesorio incompatible, merchant no admitido, datos insuficientes, bloqueo de búsqueda innecesaria, presupuesto por puesto y global, aprobación invalidada, vencimiento, 12 checkouts concurrentes sin duplicar, reserva competida desde dos conexiones SQLite, timeout pendiente y reconciliación con misma clave, cancelación, fallos/expiración y nuevo intento, persistencia tras reinicio, snapshots e historial, reporte repetido, retorno falsificado, rechazo de origen externo y contrato del transporte Reap usando fetch falso.

No se llamó a Reap ni se usó una credencial. Los tests del transporte no prueban habilitación de cuenta, compatibilidad de merchant ni ejecución sandbox real.

Regresiones adicionales: interrupción entre reserva y envío recuperada con la misma clave; cable sin protocolo/capacidad suficiente nunca aceptado por su nombre; aprobación invalidada al cambiar hardware o evidencia del diagnóstico.

Revisión independiente de fiabilidad sobre 8e26a0e: ambos hallazgos cerrados y enlace aprobación/evidencia revalidado; 23 pruebas sin HTTP más comprobación adicional de cambio de diagnóstico. Sin bloqueadores ni mayores nuevos dentro del MVP local. El coordinador ejecutó la suite completa de 24, incluida HTTP.

## Interfaz local

Navegador integrado de Codex en macOS (versión de motor no expuesta por la herramienta), español; pruebas mediante UI:

- P-01 conexión directa sin compra.
- P-02 información insuficiente, cancelación y nuevo reporte con reutilización.
- P-03 cotización, aprobación, recotización e invalidación; fallo definitivo, nuevo intento, expiración, nuevo intento, timeout y consulta del mismo intento; pedido confirmado con instalación pendiente.
- Servidor QA desechable detenido justo antes del checkout: al fallar fetch, desaparece ejecutar checkout y queda «Consultar expediente». La incertidumbre se conserva en sessionStorage por expediente.
- Vencimiento de cotización aprobado observado en servidor QA separado: ver capturas locales de revisión.
- Smoke final tras reiniciar el servidor con las correcciones: cancelación, nuevo reporte y diagnóstico directo sin compra; captura `final-no-purchase.jpg` con viewport normal restaurado.

Capturas y matrices en `artifacts/` local (excluidas del repositorio). No contienen secretos ni datos reales.

## Responsive y especialistas

Matriz DOM de estado pendiente: 320, 390, 600, 759, 760, 761, 768, 900, 1024, 1440 y 1600 px. Sin overflow horizontal de página. Consulta pendiente y descarga JSON: 44 px en todos esos anchos. Tablas con scroll horizontal local. Capturas de cotización, pendiente, confirmado, información insuficiente y reutilización a anchos representativos.

Tres revisores independientes: UX/contenido, UI/espaciado, responsive/accesibilidad/interacción. Hallazgos corregidos: estado operativo antes del diagnóstico histórico, recuperación tras pérdida de conexión, retirada de aprobación vencida, objetivo táctil de exportación y separación del título móvil. Revalidación de 9ff255e: los tres revisores cerraron los hallazgos observados, con 0 bloqueadores y 0 mayores abiertos. Las capturas finales verificadas son final-confirmed-wide.jpg (viewport 1440×1000), final-confirmed-mobile.jpg (390×844) y pending-fixed-390/1440. Los archivos antiguos confirmed-fixed-* estaban mal rotulados y no se usan como evidencia de ancho. network-loss-320.jpg acredita pérdida de conexión en composición de escritorio, no viewport 320.

Límites: sin VoiceOver, dispositivos físicos, zoom de 200–400 %, Chrome/Firefox ni garantía universal de compatibilidad. No se ha probado identidad corporativa, despliegue público ni operación productiva. No se afirma cumplimiento WCAG auditado integralmente. El analizador estático de diseño reportó 0 errores y 0 advertencias; complementa, no reemplaza, revisión visual.
