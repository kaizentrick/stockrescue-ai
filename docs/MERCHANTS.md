# Directorio de merchants: referencia, no catálogo validado

Fuente aportada por Nahum y verificada por el conector de lectura del hilo padre: [All Supported Merchants](https://docs.google.com/spreadsheets/d/1pqb1Jlx1sycembPcjMZ4dxhwzVWXfK7k8RtfNMhb_cs/edit?gid=0#gid=0), A1:I153. 152 comercios; 29 de Electronics. Modificación de hoja: 2026-10-05 14:01:46 UTC.

| Fila | Dominio | Mercado | Envío explícito a MX | Producto de referencia | Variante de hoja (string) | Precio de referencia |
|---|---|---|---|---|---|---|
| 118 | satechi.net | US | Sí | USB-C Snap Hub - Citrus | 44267709005912 | 44.99 USD |
| 37 | dockcase.com | HK | Sí | Dockcase Smart USB-C Hub 7-in-1 with M.2 SSD Enclosure - Black | 51181256933688 | 109.99 USD |
| 5 | anker.com.sg | SG | No; solo MY/SG | Anker Nano USB-C Hub 8-in-1 Dual Display 85W A210B - Silver | 52786047254813 | 72.9 SGD |

**Nada de lo anterior acredita stock, habilitación de API, cotización final o compatibilidad de vídeo.** La hoja no contiene esas columnas ni merchant API ID. Los IDs de variante se conservan como texto y no se equiparan automáticamente a IDs de Reap. No se abrieron carritos. Sus enlaces incluyen `example_click_id`, que no debe reutilizarse como identificador real.

`src/merchant-directory.ts` conserva estos tres extractos con procedencia y hechos aún sin verificar. Los candidatos explícitos para destino México son Satechi y Dockcase; Anker SG es un caso de descarte por destino. `*` y `Unknown` no equivalen a envío universal.

La UI sigue usando exclusivamente catálogo fixture y MXN sintéticos. La allowlist operativa real continúa vacía hasta validar IDs y respuesta API. No se incorporan precios de referencia a cotizaciones, no se hace conversión monetaria ni se afirma que un hub USB-C soporte el protocolo/resolución requeridos.

## Presupuestos independientes

Las referencias 44.99 USD y 109.99 USD superan el escenario previo de 40 USD descrito en el Space, incluso antes de envío e impuestos: ese escenario debe rechazarse. La demo local usa explícitamente otro fixture: límite por puesto configurable (500 MXN por defecto), total ficticio 337.84 MXN y presupuesto global 1.000 MXN. No convierte los precios de hoja ni altera aprobaciones. Ningún presupuesto sintético autoriza gasto real.
