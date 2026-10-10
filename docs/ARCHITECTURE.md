# Arquitectura local

Node 24+ ejecuta TypeScript con borrado nativo de tipos. HTTP y SQLite son módulos nativos, sin dependencias de ejecución. Frontend JavaScript y CSS propios, sin librería visual ni recursos de terceros. Lint y TypeScript se usan en desarrollo.

- `domain.ts`: inventario sintético y reglas. La salida HDMI permite conexión directa. Para USB-C se exige DP Alt Mode, capacidad de origen/destino y accesorio 4K/60 Hz. Un adaptador asignado a otro puesto no se considera libre.
- `service.ts`: expediente, diagnóstico, selección mínima, aprobación SHA-256 del objeto quote, cancelación, presupuesto, checkout y reconciliación.
- `store.ts`: SQLite WAL, `BEGIN IMMEDIATE`, expediente y auditoría dentro de la misma transacción. El claim de checkout crea operación y reserva antes de ceder control asíncrono. Una segunda llamada devuelve la misma operación. PENDING y COMPLETED consumen presupuesto; FAILED/EXPIRED liberan reserva. Un intento incierto no admite cancelación/reinicio.
- `mock.ts`: catálogo local y pedidos durables con clave única. Timeout de demo simula que el proveedor aceptó pero la respuesta se perdió; consultar recupera el resultado persistido.
- `reap.ts`: transporte sandbox opt-in separado; no conectado a rutas de demo y nunca importado en navegador. Ver REAP-INTEGRATION.md.
- `server.ts`: solo 127.0.0.1, validación de Host/Origin y cabecera propia para mutaciones, límites de cuerpo, rutas explícitas, CSP sin scripts inline.

## Alcance

Herramienta local de un responsable TI, no servicio multiusuario desplegable. No hay autenticación ni roles corporativos; no publicar ni exponer en red. Aprobación local registra actor de demostración, no identidad empresarial autenticada. El sistema solo conoce tres fixtures y una especificación de vídeo; no diagnostica controladores, hardware averiado, carga USB-PD ni combinaciones arbitrarias. La extracción es determinista, no usa LLM ni créditos.

El coste mínimo se compara por total (producto + envío + impuesto) entre variantes disponibles, compatibles y permitidas del catálogo fixture. El presupuesto global demo es 1.000 MXN; por puesto configurable al reportar. La lista no es un marketplace real.

## Evidencia persistente

Cada expediente conserva hardware, razones y alternativas, cotización actual e historial, snapshot aprobado, historial de aprobaciones, intentos anteriores, operación actual, pedido y auditoría. Se descarga JSON desde la interfaz. Los archivos de base de datos se excluyen de Git. Incidencia permanece abierta en todos los resultados: no hay cierre automático ni afirmación de instalación.

La bitácora local es revisable pero no un registro antifraude firmado. Un administrador del archivo puede editarlo. No se presenta como sistema productivo de cumplimiento.
