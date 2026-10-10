# Arquitectura de StockRescue

Aplicación de un operador local para analizar inventario y ejecutar una reposición supervisada en práctica o Reap sandbox. Node.js 24+ ejecuta TypeScript directamente; HTTP y SQLite son nativos. La interfaz usa HTML, JavaScript y CSS. Se conserva la base anterior y se reemplaza el dominio de hardware por inventario, propuestas y recepción.

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
| `public/` | Inventario, detalle, CSV, confirmaciones, pedidos y registro |

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

MVP monotienda, sin autenticación, roles, aislamiento multitenant, POS, forecasting estadístico, reembolsos o conciliación contable. El registro local es revisable, no un registro antifraude firmado; un administrador del archivo puede editarlo. La validación remota se registra por separado del estado de implementación.
