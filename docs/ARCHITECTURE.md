# Arquitectura de StockRescue

Aplicación de un propietario autenticado para analizar inventario y ejecutar una reposición supervisada en práctica o Reap sandbox. Node.js 24+ ejecuta TypeScript directamente; HTTP y SQLite son nativos. La interfaz usa HTML, JavaScript y CSS. Se conserva la base anterior y se reemplaza el dominio de hardware por inventario, propuestas y recepción.

## Módulos

| Archivo | Responsabilidad |
|---|---|
| `src/domain.ts` | Contratos Zod, datos iniciales, motor min/max, conversión monetaria y huella de evidencia |
| `src/import.ts` | Papa Parse, validación de columnas/filas y restricciones del producto vinculado |
| `src/service.ts` | Edición, propuestas, aprobación, presupuesto, enrollment, checkout, consulta y recepción |
| `src/store.ts` | SQLite WAL y transacciones `BEGIN IMMEDIATE` sobre estado local |
| `src/mock.ts` | Cotización ficticia y pedidos persistidos por clave |
| `src/provider.ts` | Contrato común y normalización del proveedor sandbox |
| `src/reap.ts` | Transporte exclusivo del sandbox de Singapur, rutas y enlaces hospedados permitidos |
| `src/server.ts` | HTTP, Host/Origin, entradas, límites, CSP e interfaz |
| `src/start-sandbox.ts` | Lee la credencial por 1Password CLI y arranca sandbox sin escribir secretos |
| `src/operations.ts` | Movimientos y documentos transaccionales, previews, memoria conversacional, programación, avisos, simulaciones y pronóstico |
| `src/access.ts` | Sesiones privadas de propietario, cookie HttpOnly/SameSite y límite de intentos |
| `src/mvp.ts` | Servidor unificado en 4321, webhook, worker con lease, reconciliación y tareas efectivas |
| `src/launch.ts`, `src/meta-setup.ts`, `src/control.ts` | 1Password por pipes, Quick Tunnel, suscripción de StockRescue y LaunchAgent |
| `src/agent/` | Gemini AI Studio, Cloud API, medios oficiales, cola durable y confirmaciones |
| `public/` | Inventario, compras, movimientos, documentos, simulaciones, agente, avisos, acceso y demo aislada |

`src/merchant-directory.ts` conserva extractos de electrónica del prototipo anterior; no selecciona el producto actual. El café se configura en el proveedor y se documenta en [MERCHANTS.md](MERCHANTS.md).

## Cálculo

Cada SKU declara existencias, reservas, consumo diario estimado, entrega, revisión, días de seguridad, piezas por paquete, mínimo de paquetes, capacidad y presupuesto. Las reservas no pueden exceder existencias.

```text
disponible = existencias − reservas
comprometido = suma de cantidades aún no recibidas
posición = disponible + comprometido
punto de reposición = consumo diario × (entrega + seguridad)
objetivo = ceil(consumo diario × (entrega + revisión + seguridad))
```

Solo se propone comprar con consumo positivo y posición en el punto de reposición o por debajo. Se completa hasta el objetivo, redondeando a paquetes y respetando el mínimo. Si el objetivo ya está cubierto, la cantidad es cero. Si la compra excede capacidad, se bloquea; no se recorta silenciosamente.

`purchaseQuantity` es lo que se pide al comercio; `inventoryQuantity` es lo que llegará. Tres paquetes de doce representan 36 piezas. El café vinculado usa una bolsa de 250 g por unidad de compra.

Los pedidos abiertos cuentan aunque su llegada sea tardía para evitar sobrecompra. La interfaz distingue llegada oportuna/tardía y la brecha entre cobertura y plazo. Esta aproximación no simula demanda y entregas día por día; no garantiza evitar faltantes.

## Compra y autorización

```text
Inventario → análisis → propuesta → cotización final → aprobación
→ revalidación → reserva e intento persistido → checkout → consulta
→ pedido por recibir → recepción parcial o completa
```

La evidencia relaciona producto/revisión, reglas, ajustes y pedidos entrantes. Cambiar inventario o ajustes invalida propuestas sin enviar. La aprobación se vincula por SHA-256 a la cotización completa; el servidor verifica vigencia, moneda, presupuesto y evidencia antes de enviar.

El proveedor comprueba variante y disponibilidad antes de cotizar. El total procede de `amountBreakdown.finalAmount`, nunca del precio de la hoja. La normalización rechaza moneda distinta a MXN y discrepancias entre subtotal, precio unitario verificado y cantidad. Impuestos no informados no se interpretan como cero. Los importes se guardan en centavos enteros, con conversión exacta mediante decimal.js.

## Persistencia y recuperación

El estado incluye tienda, productos, propuestas, auditoría, enrollment, entradas previstas y recepciones. El claim reserva presupuesto y persiste intento/clave antes de llamar al proveedor. Pendientes y confirmados consumen presupuesto; fallos definitivos y expiraciones liberan reserva. El presupuesto es el límite acumulado de la demo, no un saldo bancario ni un límite mensual renovable.

Un timeout conserva el intento. Con checkout ID, se consulta; sin él, la recuperación usa clave y cuerpo persistidos dentro de la ventana permitida. Después de 24 horas un resultado incierto requiere revisión. El retorno del navegador y una respuesta inicial sin comprobación del proveedor no acreditan éxito.

Cada recepción tiene clave idempotente. Se valida contra el saldo pendiente y la capacidad; actualización de stock, saldo recibido y registro se guardan en una transacción. Un pedido confirmado no incrementa existencias.

## Modos y límites

- `mock`: práctica sin servicios externos, `.data/stockrescue-mock.sqlite`.
- `sandbox`: proveedor conectado a `https://sg.sandbox.api.reap.global`, con `.data/stockrescue-sandbox.sqlite`. Configuración y evidencia en [REAP-INTEGRATION.md](REAP-INTEGRATION.md).
- Cualquier otro modo se rechaza; no hay pagos productivos.

MVP monotienda con autenticación de propietario; sin roles, aislamiento multitenant, POS, reembolsos o conciliación contable. El registro local es revisable, no un registro antifraude firmado; un administrador del archivo puede editarlo. La validación remota se registra por separado del estado de implementación.

## Canales, documentos y programación

La UI y WhatsApp comparten `Service` y la misma base sandbox. Todas las propuestas de modificación se vinculan al propietario/remitente, vencimiento y revisiones pertinentes. Los documentos añaden una huella de su versión; editar la revisión invalida una confirmación anterior. Movimiento, documento, estado y auditoría se confirman dentro de la misma transacción. La huella del archivo y la identidad tipo/proveedor/folio/fecha impiden duplicados.

Los archivos llegan por el endpoint autenticado o por la API oficial de Meta, con MIME y tamaño limitados. Gemini trata el documento como datos; no recibe capacidad para confirmar ni comprar. Una recepción aumenta stock, una venta lo descuenta y una factura de compra solo se archiva. Cada unidad exige conversión explícita al SKU.

El worker reclama un lease renovable en SQLite. Mensajes entrantes se deduplican por el ID de Meta y respuestas se persisten antes de enviar. Un envío de resultado incierto queda REVIEW sin reintento automático. Los eventos de entrega/fallo se relacionan por outbound_id; los ajenos no acreditan conexión. El webhook es público, exige firma de los bytes originales y filtra número y remitente; la autenticación del panel no lo bloquea.

Un tick procesa recordatorios y avisos; los resúmenes se calculan al vencer, no al programarlos. Se preservan cancelación y periodicidad diaria/semanal CDMX al reiniciar. Cada ocurrencia tiene huella única. Se consulta el mismo checkout abierto cada minuto; no se crea otro. `launchd` recupera el supervisor, que reinicia el servidor y renueva el callback cuando cambia el Quick Tunnel.

El pronóstico usa ventas/consumo confirmados y días completos anteriores (hasta 28). Antes de siete días utiliza un supuesto explícito editable. Las series sintéticas se guardan aparte con semilla y configuración. El backtest compara promedio móvil de los 14 días anteriores con el supuesto fijo, usando MAE; no representa precisión validada en un negocio real.
