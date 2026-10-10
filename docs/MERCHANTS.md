# Producto de referencia de StockRescue

Fuente: [All Supported Merchants](https://docs.google.com/spreadsheets/d/1pqb1Jlx1sycembPcjMZ4dxhwzVWXfK7k8RtfNMhb_cs/edit?gid=0#gid=0), 152 filas de comercios. Se conserva la instantánea en [el anexo del Space](space/08-comercios-admitidos.md) y [su JSON](space/08-comercios-admitidos-fuente.json).

| Dato | Referencia |
|---|---|
| Fila | 20 |
| Comercio | Blend Station · `blendstation.com.mx` |
| Mercado y destino declarado | México · MX |
| Producto | Cafe Guerrero Atoyac Bourbon Tipica Natural Fermentado |
| Variante | 250 gr / Grano |
| Variante de la hoja | `47607777984690` |
| Precio de la hoja | $300 MXN, sin acreditar total con envío |
| SKU local | `CAFE-250` |
| Unidad de inventario y compra | Una bolsa de 250 g |

El artículo analizado debe ser el mismo que se intenta cotizar y comprar. Precio e identificador de la hoja son referencias: no prueban stock, permisos, impuestos, envío o checkout completado. El ID Shopify no se convierte automáticamente en ID de catálogo de Reap.

El adaptador configura identificadores de Reap y exige comprobar comercio, variante de 250 g en grano, MXN y disponibilidad mediante detalles de producto. Cotiza con la cantidad calculada. Si el subtotal no coincide con cantidad por precio unitario verificado, o existe otra discrepancia de contrato, bloquea compra. Estado de validación remota en [REAP-INTEGRATION.md](REAP-INTEGRATION.md).

La práctica usa el precio de referencia como fixture de $300 por bolsa y envío ficticio. Nunca sustituye `amountBreakdown.finalAmount` en sandbox. No hay conversión implícita de moneda ni compra de otro artículo para simular la solución del faltante.

## Otros productos y antecedentes

Vasos y filtros demuestran cobertura, paquetes, mínimos y capacidad. Tienen `supplier: none`: se calcula su necesidad y se explica que no puede ejecutarse su compra.

Los candidatos previos de electrónica —Satechi, Dockcase y Anker— permanecen en históricos y `src/merchant-directory.ts`. No forman parte del caso de café ni de su allowlist. `*` y `Unknown` en destinos de la hoja no equivalen a envío universal.

La lista no demuestra rentabilidad para reventa. El piloto comercial debe evaluar precio final, margen, disponibilidad y plazo real de entrega.
