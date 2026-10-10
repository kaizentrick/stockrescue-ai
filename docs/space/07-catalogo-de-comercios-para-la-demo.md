# Catálogo de comercios y candidatos de prueba

Fuente: https://chatgpt.com/space/page_cd686f9234788191a5069b6720bf028b

Creación: 2026-10-10T00:57:59.522814Z  
Última modificación en Space: 2026-10-10T00:58:00.998783Z  
Exportación UTC: 2026-10-10T00:58:50.522215+00:00  
Página padre: page_6ac9681f593081919017833102c3d2c7  
Secuencia de origen: 0

---

Catálogo aportado por el usuario para seleccionar comercios y productos de prueba. Lectura completa: 10 de octubre de 2026 a las 00:56 UTC, equivalente al 9 de octubre a las 18:56 de Ciudad de México. La lista permite acotar candidatos; no demuestra stock, precio vigente, compatibilidad técnica ni habilitación efectiva para las credenciales del equipo.

## Fuente y alcance

[Hoja All Supported Merchants](https://docs.google.com/spreadsheets/d/1pqb1Jlx1sycembPcjMZ4dxhwzVWXfK7k8RtfNMhb_cs/edit?gid=0), rango A2:I153: **152 registros**, de los cuales **29** están clasificados como Computers & Electronics. Última modificación de la fuente: 5 de octubre de 2026 a las 14:01:46 UTC.

Se distingue Market, que describe el mercado del registro, de Ships to, que enumera destinos. Un asterisco o Unknown no se interpreta como cobertura universal.

## Candidatos para verificar

| Fila | Comercio y mercado | Producto de prueba | Precio de artículo en la hoja | Destino México |
| --- | --- | --- | --- | --- |
| 118 | satechi.net · US | USB-C Snap Hub - Citrus | 44.99 USD | MX figura en Ships to |
| 37 | dockcase.com · HK | Dockcase Smart USB-C Hub 7-in-1 with M.2 SSD Enclosure - Black | 109.99 USD | MX figura en Ships to |
| 5 | anker.com.sg · SG | Anker Nano USB-C Hub 8-in-1 Dual Display 85W A210B - Silver | 72.9 SGD | No figura; solo MY y SG |

Referencias de variante copiadas de la hoja:

- Satechi, fila 118: 44267709005912.

- Dockcase, fila 37: 51181256933688.

- Anker Singapur, fila 5: 52786047254813.

Los precios son referencias del artículo, no cotizaciones finales con impuestos, envío y cargos. Estos hubs no se consideran equivalentes entre sí ni sustitutos verificados del adaptador ficticio del brief.

## Consecuencia para la demo

Satechi y Dockcase son candidatos documentados para revisar por figurar México entre sus destinos. Anker Singapur no debe presentarse como opción de envío a México a partir de esta hoja.

El presupuesto de 40 USD y la alternativa de 32 USD del brief eran sintéticos. El precio de artículo de Satechi ya supera ese límite y Dockcase también; no deben aparecer como aprobados bajo aquella política. La política de una prueba integrada tendrá que definirse explícitamente sin alterar silenciosamente el presupuesto.

Antes de elegir:

1. Verificar modelo exacto, puertos y protocolos del portátil, monitor y producto, incluido soporte de vídeo. El nombre USB-C no acredita compatibilidad.

2. Confirmar mediante la API que el comercio, variante y flujo están disponibles para la cuenta sandbox.

3. Obtener cotización, destino admitido y coste completo; una fila de catálogo no acredita stock ni plazo de entrega.

4. Aplicar presupuesto y reglas a esa cotización y pedir aprobación de las condiciones concretas.

5. Mantener el resultado «No hace falta comprar» si el inventario o una conexión directa resuelven el puesto.

## Estado actualizado

La lista de referencia ya fue recibida y leída; deja de estar pendiente conseguirla. Siguen pendientes la validación por API, la compatibilidad del producto elegido y una prueba sandbox observada. No se ha ejecutado ninguna compra ni se ha cambiado el enfoque elegido.
