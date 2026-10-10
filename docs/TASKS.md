# Trabajo de StockRescue

| Entregable | Estado de implementación | Evidencia o siguiente paso |
|---|---|---|
| Motor min/max, empaques, mínimos y capacidad | Implementado | Pruebas de dominio/servicio; comandos en QA |
| Inventario editable y CSV con preview | Implementado | Recorrido y validación por fila |
| Cotización final, aprobación y presupuesto | Implementado | Revalidación en servidor e invalidación por cambios |
| Pedido, recuperación y recepción parcial | Implementado | Pruebas verifican reintentos, recepción parcial y segundo ciclo |
| Caso de café Blend Station | Catálogo y cotización de una bolsa verificados en sandbox | Comprobar disponibilidad y total en cada nueva cotización |
| Compra completa Reap sandbox | Enrollment ACTIVE y checkout autorizado; pendiente de resultado final | Checkout PROCESSING con referencia de pedido; consultar el mismo intento hasta estado terminal. Detalle en REAP-INTEGRATION.md |
| Inventario, pedidos e historial | Implementados y probados localmente | Recorrido de escritorio/móvil y recuperación |
| GitHub y documentación del nuevo alcance | Actualizados en rama StockRescue | Repositorio renombrado; históricos preservados; integración a main mediante PR |
| Piloto con negocio y datos reales | Pendiente | Calidad de datos, uso recurrente y utilidad económica |
| Usuarios, varias empresas, POS y producción | Fuera del MVP | Diseño y validación independientes |
| Google AI Studio + WhatsApp Cloud API | Integrados y verificados realmente | Modelo gemini-3.8-flash, chat y PDF por API, confirmación compartida y eventos entregado/leído |
| Documentos y movimientos | Implementados, pruebas y recorrido real | Duplicados, conversiones, corrección y rollback |
| Pronóstico y simulación | Implementados | Historial confirmado o supuestos explícitos, semilla y backtest temporal |
| Recordatorios y resúmenes | Programador persistente activo | Reinicio conserva tareas; resumen de las 22:52:57 confirmado DELIVERED; primer envío incierto permanece REVIEW |
| Plantilla Meta | APPROVED, reclasificada MARKETING por Meta | Envío de plantilla confirmado DELIVERED en el número autorizado; revisar categoría antes de ampliar uso |
| Panel HTTPS, auth y demo | Operativos por Quick Tunnel | URL cambia al reiniciar; callback automático. Acceso del propietario en 1Password |
| Inicio y recuperación | LaunchAgent instalado | Mac despierto, sesión y 1Password disponibles; una instancia con lease |

Acordar archivos y responsables antes del trabajo paralelo. Actualizar documentos existentes, sin informes duplicados. El estado de implementación no acredita resultados de pruebas ni una compra remota: consultar [QA](QA.md) e [integración Reap](REAP-INTEGRATION.md).

Candidatura, video y publicaciones externas se coordinan con el equipo. No hay demanda pagadora ni ahorro demostrados por esta demo.
