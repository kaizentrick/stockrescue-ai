# Interfaz de StockRescue

La primera pantalla relaciona inventario con la siguiente decisión: qué falta, cuánto pedir y por qué. El usuario empieza con el ejemplo o importa un CSV, sin configurar pagos antes de entender la propuesta.

## Composición

Se evaluaron secuencia asistida, libro de inventario con detalle y cola de excepciones. Se eligió **inventario con detalle de reposición**, con pasos guiados dentro del panel. La cola se conserva como filtro «Necesitan atención».

La tabla muestra producto, disponible, cobertura y acción. El panel presenta recomendación, razón y conversión de unidades. El cálculo completo y referencias técnicas se expanden a petición. Cotización, aprobación y envío aparecen cuando corresponden; la aprobación siempre sigue al total final.

En móvil, «Revisar» abre el detalle y «Volver al inventario» devuelve a la lista. Pedidos e historial mantienen vistas propias. Los diálogos resuelven edición, importación y aprobación con etiquetas, navegación de teclado y mensajes asociados.

## Jerarquía y lenguaje

- Distintivo permanente: práctica local con precios/pedidos simulados, o Reap sandbox sin dinero real.
- Resumen de productos que necesitan atención, pedidos por recibir y presupuesto disponible.
- Acciones concretas: preparar, cotizar, revisar y aprobar importe, enviar compra de prueba, consultar mismo intento y registrar recepción.
- «Disponible» descuenta reservas; «en camino» representa mercancía comprometida fuera de existencias.
- La compra no promete evitar el faltante cuando la cobertura se agota antes del plazo.
- Un precio ficticio no se presenta como cotización de Reap. Compra y recepción son estados diferentes.

Tipografía de sistema para controles/datos, serif para encabezado y decisión, números tabulares, fondo claro y verde oscuro para acciones. Reglas y espacio separan las áreas. No se usan logos oficiales, clientes, resultados comerciales o prueba social inventada.

## Estados que debe conservar el recorrido

| Situación | Respuesta |
|---|---|
| Stock suficiente o sin consumo | Explicar por qué no se compra |
| Proveedor no vinculado | Permitir análisis y explicar bloqueo de compra |
| CSV inválido | Mostrar fila/campo; bloquear importación |
| Capacidad o presupuesto insuficiente | Explicar límite sin cambiar cantidades en silencio |
| Cotización vencida o modificada | Revocar aprobación y pedir revisión nueva |
| Autorización hospedada pendiente | Abrir enlace permitido y consultar al volver |
| Resultado incierto | Conservar intento/presupuesto y consultar |
| Pedido confirmado | Mostrar pendiente de recepción, sin aumentar stock |
| Recepción parcial | Mostrar recibido/total y permitir solo el saldo |
| Recepción completa | Cerrar recepción y permitir una nueva necesidad |

La evidencia de recorrido y limitaciones detectadas se mantiene en [QA.md](QA.md). Este documento describe el contrato de experiencia; no sustituye esa verificación.
