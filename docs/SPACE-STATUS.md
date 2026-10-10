# Transición a StockRescue

El alcance actual es **reposición supervisada de inventario**, descrito en [README.md](../README.md). Se reutilizan persistencia, aprobación vinculada a evidencia, presupuesto e idempotencia de Reap Workplace Agent; se reemplaza el caso de pantallas y accesorios por una tienda, inventario, propuestas y recepción.

La implementación se desarrolla en `cx/stockrescue-mvp`. El caso principal es café Blend Station de la lista del evento; vasos y filtros usan el mismo motor con ejecución bloqueada por ausencia de proveedor. El código incluye práctica y adaptador sandbox. Se verificaron catálogo, cotización de una bolsa, enrollment ACTIVE y autorización del checkout simulado. Reap mantiene ese checkout en PROCESSING: todavía no hay confirmación COMPLETED. Evidencia remota y siguiente consulta están en [REAP-INTEGRATION.md](REAP-INTEGRATION.md), separados de la existencia del código.

## Históricos

`docs/space/`, `docs/pitch/` y `docs/reviews/` se conservan sin modificar. Registran investigación, hipótesis, presentación y revisiones de equipamiento. Sus títulos, estados, fechas e importes no se atribuyen retroactivamente a StockRescue.

`docs/space/SHA256SUMS` valida sus 12 archivos de contenido; el listado no se incluye a sí mismo. Exportación recibida como `reap-space-export-2026-10-10.zip`: 63.636 bytes, SHA-256 `5532fb25d0191dba0937d293ad2b11c2b71a9f54b1b8b29bf6d2363de6dc405a`.

Este archivo actualiza el contexto del repositorio; no implica cambios en páginas externas del Space. La hoja de merchants es fuente de descubrimiento. Producto, precio y destino de referencia no acreditan una transacción actual.

## Lectura vigente

Usar README, ARCHITECTURE, DESIGN, DEMO-SCRIPT, MERCHANTS y TASKS para desarrollar y demostrar StockRescue. Consultar QA para pruebas e integración para evidencia del proveedor. Los materiales de equipamiento son antecedentes, no la presentación vigente.

Demanda pagadora, ahorro, prevención de faltantes y rentabilidad requieren validación comercial; la demo técnica no los demuestra.
