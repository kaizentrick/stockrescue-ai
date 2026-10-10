# StockRescue · guion para Kaizen y jueces

Este es el material vigente para grabar el video. El PPT y PDF de `docs/pitch/` conservan el concepto anterior de equipamiento; no usarlos como presentación de StockRescue.

**Mensaje central:** StockRescue convierte movimientos de inventario y mensajes de WhatsApp en una reposición explicable, con cotización final, aprobación humana y ejecución mediante Reap sandbox. Una compra no suma existencias hasta registrar la recepción.

- Código: [rama del MVP](https://github.com/kaizentrick/stockrescue-ai/tree/cx/stockrescue-mvp) · [PR #2](https://github.com/kaizentrick/stockrescue-ai/pull/2).
- [Demo abierta](https://tours-representation-concerts-pipe.trycloudflare.com/demo/): sin contraseña, cada navegador tiene una práctica independiente. La raíz del túnel también lleva aquí cuando no hay sesión de propietario.
- [Operación conectada](https://tours-representation-concerts-pipe.trycloudflare.com/login): para que Nahum grabe Google, WhatsApp y el estado Reap existentes. Acceso por 1Password; no grabar el inicio de sesión.
- [Reconstruir y levantar otro túnel en casa](MAC-DE-CASA.md).
- Evidencia detallada, fechas y límites: [QA](QA.md) y [Reap](REAP-INTEGRATION.md).

## Qué puede probar cada persona

| Entorno | Qué hace | Qué acredita |
|---|---|---|
| Demo abierta `/demo/` | Inventario y CSV, cotización/aprobación/compra simulada, recepción, movimientos, documento precargado editable, pronóstico, simulación y avisos web | Funcionamiento del producto y controles en el mismo código de negocio; no una nueva llamada a Reap, Gemini o Meta |
| Operación conectada | Inventario compartido con WhatsApp, IA real, extracción real, recordatorios y consulta del checkout existente | Las respuestas y estados efectivamente recibidos de cada proveedor |
| Demo reconstruida en otra Mac | La misma práctica, sin credenciales, con evidencia histórica identificada | Reproducibilidad desde Git; no traslada los datos ni la conexión del Mac original |

La sesión pública dura hasta una hora, o hasta el reinicio del servidor, y se puede reiniciar con el botón. El límite es 30 sesiones simultáneas. Los avisos de práctica se ejecutan mientras vive la sesión. El envío de WhatsApp y los datos del propietario no se alteran desde aquí.

## Preparación de la grabación

1. **Kaizen:** asignar narrador, operador de pantalla y editor. Abrir la rama del MVP; comprobar el check verde del último commit. Ensayar en `/demo/` y pulsar **Reiniciar mi demo** antes de la toma.
2. **Nahum:** conservar encendido el Mac conectado y su túnel. Iniciar sesión antes de grabar y abrir el chat existente con el bot **+1 555 653 4554**, desde el único número autorizado. Los jueces no necesitan enviar mensajes al bot.
3. Preparar un clip de la conversación ya verificada: PDF DEMO-WA-001, recepción de una bolsa, venta de una bolsa y aviso entregado. No volver a confirmar una recepción o venta únicamente para obtener otra toma. Ocultar conversaciones ajenas, teléfono personal, dirección y correo de envío.
4. Abrir la evidencia Reap y el pedido existente. Si sigue PROCESSING, mostrar exactamente eso. No crear otra compra, cambiar la reserva ni registrar como recibida una compra sin resultado confirmado.
5. Grabar a 1920×1080, navegador al 100 %, texto legible y cursor pausado. Usar rótulos **Práctica simulada** y **Integración real · sandbox** al cambiar de contexto. No mostrar bóvedas, llaves, tarjetas, OTP, passkeys ni enlaces privados de autorización.

Duración sugerida: **4 minutos 20 segundos**, ajustable al límite comunicado por los organizadores. Es una propuesta de edición, no una duración exigida por el evento.

## Guion de video · qué mostrar, cómo y qué decir

| Tiempo | Pantalla y acción | Narración propuesta |
|---|---|---|
| 0:00–0:20 | Nombre StockRescue sobre Inventario. Señalar café y filtros. | «Una tienda puede tener ventas, compras y mensajes repartidos entre una hoja y WhatsApp. StockRescue reúne esos movimientos para decidir qué reponer, cuánto pedir y qué gasto autorizar.» |
| 0:20–0:50 | Demo abierta. **Revisar café** → **Cómo se calculó esta reposición**. Mostrar 2 bolsas, 0.5 al día, punto 2 y objetivo 3. | «Con estos datos de ejemplo, el café tiene cuatro días de cobertura. El motor propone una bolsa para llegar al objetivo de tres. Explica sus supuestos, respeta capacidad y presupuesto, y cuenta lo que ya viene en camino. Los filtros necesitan reposición, pero no tienen un proveedor habilitado.» |
| 0:50–1:30 | **Preparar reposición** → **Obtener cotización final** → **Revisar y aprobar**. Mostrar total, checkbox y aprobación; vincular tarjeta ficticia y enviar compra de práctica. | «La cantidad no basta para autorizar un gasto. Revisamos producto, destino, envío y total. Si cambian, la aprobación deja de servir. Aquí recorremos una compra simulada. En la integración, Reap recibe la operación solo después de esa aprobación y el backend conserva una clave para evitar duplicarla.» |
| 1:30–1:55 | Abrir **Evidencia del entorno conectado**, o el pedido conectado ya autenticado. Enfocar PROCESSING y $360 MXN. | «Sí conectamos Reap sandbox: el enrollment llegó a ACTIVE y autorizamos un checkout de trescientos sesenta pesos. Este intento continúa PROCESSING. No lo presentamos como completado: conservamos su reserva y consultamos el mismo intento.» |
| 1:55–2:35 | Clip real de WhatsApp: `/inventario`, PDF y respuesta con preview, confirmación ya realizada. Al lado, documento y movimiento del panel conectado. | «El operador puede trabajar desde WhatsApp. Gemini interpreta el mensaje o extrae el documento. Antes de modificar existencias, StockRescue pide revisar SKU, unidades y tipo de movimiento. La confirmación del backend registra la recepción. Reenviar el archivo o repetir el código no duplica el stock.» |
| 2:35–3:00 | Volver a práctica. **Pedidos y recepción** → **Registrar recepción**; después **Documentos** → **Cargar recepción de ejemplo**. Mostrar campos, sin confirmar otra recepción del mismo pedido. | «Pagar no significa recibir. Las existencias aumentan cuando registramos la llegada. También distinguimos una factura de compra, que se archiva, de una recepción física o un ticket de venta. En esta práctica usamos un documento precargado; la extracción real se vio en el clip anterior.» |
| 3:00–3:25 | **Simulaciones**, seleccionar café, demanda 3 y aumento 30 %, pulsar **Simular escenario**. Mostrar supuesto, semilla, error y luego inventario intacto. | «Podemos ensayar más demanda o una entrega tardía sin tocar el inventario. La previsión usa movimientos confirmados cuando hay historial suficiente; si no, declara el supuesto. La evaluación mostrada es sintética: todavía no afirmamos precisión comercial.» |
| 3:25–3:50 | Clip del resumen real programado y entregado a las 22:52:57 CDMX; **Agente y avisos** muestra su estado. | «Los recordatorios y resúmenes se guardan y se ejecutan a su hora. Este resumen llegó por WhatsApp y Meta confirmó la entrega. Los envíos inciertos quedan para revisión; no se repiten a ciegas.» |
| 3:50–4:20 | Volver a inventario y cerrar con URL de demo, repo y tres palabras: necesidad → aprobación → ejecución. | «StockRescue conecta una necesidad concreta de inventario con un gasto supervisado. La demo abierta permite revisar el producto, y el repositorio muestra los controles y pruebas. El siguiente paso es un piloto con una tienda para medir faltantes, tiempo de reposición y capital comprometido.» |

Los subtítulos pueden salir de la columna de narración. Conservar pausas al mostrar totales, confirmaciones y estados; no acelerar esas pruebas. Para una versión corta, reducir simulaciones y recordatorios antes de recortar Reap y aprobación.

## Recorrido de validación para jueces · cinco minutos

1. Entrar sin cuenta a la demo, abrir café y revisar el cálculo. Al inicio: 2 bolsas, consumo supuesto 0.5/día, reposición de una bolsa.
2. Cotizar, revisar y aprobar. En práctica el total inicial es $399 MXN ($300 + $99 de envío). Vincular la tarjeta ficticia y enviar compra de práctica. El pedido aparece confirmado **en simulación**; el stock sigue en 2.
3. Registrar una bolsa recibida. El stock sube a 3. Una repetición con la misma intención no suma dos veces. Revisar Historial.
4. Registrar una venta de una bolsa en Movimientos: preview → confirmación. Revisar que el stock vuelve a 2.
5. Cargar recepción de ejemplo en Documentos. Revisar tipo, SKU y conversión; confirmar solo una vez. Volver a cargarla y comprobar que sigue siendo el mismo documento.
6. Simular demanda +30 % y comprobar que no cambia las existencias. En Agente y avisos probar `/inventario` y programar un aviso web a dos minutos. La práctica por comandos declara que no llama a Gemini.
7. Abrir la evidencia del entorno conectado. Revisar el estado Reap conservado y las fechas de los servicios. En una Mac reconstruida, se identifica expresamente como histórica.
8. Pulsar Reiniciar mi demo. Otro navegador o una ventana privada tiene su propia sesión desde el inicio.

## Respuestas breves al jurado

- **¿Dónde interviene la IA?** Interpreta conversación, extrae documentos y propone acciones. Cantidad, presupuesto, aprobación e idempotencia se validan en el backend.
- **¿Qué aporta Reap?** Vinculación/autorización hospedada y ejecución del checkout sandbox después de aprobar la cotización final. El agente no recibe datos de tarjeta.
- **¿Ya pagó?** Hay un checkout autorizado en PROCESSING. Existe referencia de pedido, pero todavía no evidencia de COMPLETED. No fingimos el resultado final.
- **¿Es un bot que busca y compra?** Parte de existencias, reservas, consumo, capacidad y pedidos abiertos; además registra recepción y conserva la trazabilidad posterior.
- **¿Quién pagaría?** La hipótesis es una tienda pequeña con reposición recurrente y operación por WhatsApp. Falta un piloto que pruebe disposición a pagar y utilidad; no hay ventas, ahorro o precisión comercial acreditados.
- **¿Está listo para producción?** Es un MVP sandbox de una tienda. Usuarios, empresas múltiples, POS, pagos productivos y operación sin depender de este Mac quedan fuera del alcance actual.

## Material de candidatura listo para copiar

**Nombre:** StockRescue. **Equipo:** Kaizen. **Track recomendado:** Most Worthwhile Problem, que actualmente incorpora Best Use of Latest Technology. No declarar onchain: este MVP no integra stablecoins ni contratos.

**Descripción:**

> StockRescue es un asistente de reposición para tiendas pequeñas que conecta inventario, documentos y WhatsApp con compras supervisadas mediante Reap sandbox. Calcula cuánto reponer a partir de existencias, reservas, consumo estimado, plazos, capacidad y presupuesto. Obtiene la cotización final y exige aprobación del producto, destino, envío, moneda y total antes de ejecutar.
>
> Google AI Studio con gemini-3.8-flash interpreta mensajes y extrae PDF e imágenes. Los documentos se revisan por SKU, tipo y conversión de unidades; el backend confirma los movimientos y evita duplicarlos. La plataforma comparte estado con WhatsApp Cloud API y conserva recordatorios, resúmenes y evidencia de entrega. Incluye simulaciones de demanda separadas de los datos operativos.
>
> Reap se verificó con un enrollment ACTIVE y un checkout autorizado por $360 MXN que continúa PROCESSING. Conservamos el mismo intento y su reserva; no declaramos una compra completada. El recorrido completo hasta recepción puede explorarse con el proveedor simulado, claramente identificado en la demo pública.
>
> La propuesta de valor es reducir decisiones de reposición dispersas y dar control sobre cada gasto. La utilidad comercial aún debe validarse con un piloto. El repositorio incluye instrucciones reproducibles, pruebas y los límites de la integración. La demo para jueces abre sin contraseña y aísla la práctica de cada visitante.

**Enlaces a usar:** repo en la rama `cx/stockrescue-mvp` y la URL de túnel que el equipo confirme antes de entregar. Subir el video terminado a una URL que abra sin solicitud de acceso y revisarla desde una ventana privada.

### Cómo usamos la integración Agentic

> Usamos el módulo Agentic de Reap desde el backend. Consultamos los endpoints de productos para resolver el café y su variante admitida, generamos la cotización final con `/agentic/quotes`, vinculamos el medio de prueba mediante `/agentic/enrollments` y enviamos `/agentic/checkouts` después de comprobar enrollment ACTIVE, cotización vigente, aprobación humana y presupuesto. Persistimos la clave de idempotencia y la reserva antes de enviar. Consultamos el mismo checkout por GET para conciliar su resultado; un retorno del navegador o una respuesta incierta no acreditan pago. La prueba real permanece en PROCESSING por $360 MXN. Gemini ayuda a interpretar necesidades y documentos, pero no puede saltarse las confirmaciones ni recibe datos de tarjeta.

Implementación revisable: [adaptador Agentic](../src/reap.ts), [reglas y aprobación](../src/service.ts), [agente](../src/agent/handler.ts) y [evidencia remota](REAP-INTEGRATION.md).

### Requisitos de entrega recibidos del organizador

Aviso compartido por Nahum el viernes 9 de octubre: **entregar antes de las 00:00 del sábado 10 de octubre de 2026, hora de Ciudad de México** (medianoche que termina el viernes). Esta fecha sustituye cualquier referencia anterior a entregar el sábado por la noche. No confundirla con la caducidad de la API del domingo.

| Campo solicitado | Material preparado | Acción final del equipo |
|---|---|---|
| Datos del equipo y proyecto | StockRescue · Kaizen | Completar capitán, correo e integrantes reales |
| Categoría o categorías | Recomendación: Most Worthwhile Problem | Seleccionarla en el portal |
| Demo grabada corta | Guion, pantallas y narración de este documento | Grabar, subir y probar el enlace sin login |
| Repo o proyecto | Repo público en rama del MVP + demo abierta | Usar los enlaces vigentes |
| Uso de Agentic | Bloque anterior, código y evidencia | Pegar el texto correspondiente |

El aviso pegado dice «Entrega tu proyecto aquí» sin conservar el enlace. Usar el enlace de ese mensaje original; el enlace histórico del portal no se asume confirmado para esta entrega. No se ha enviado el formulario desde este trabajo.

**Pendiente del equipo:** confirmar capitán/correo e integrantes reales, elegir el track en el formulario, grabar/subir el video y enviar la candidatura. Estos datos y el enlace del video no se inventan. Preparar este material y subir código a GitHub no presenta la candidatura.

Fuentes oficiales revisadas: [guía y tracks](https://aibuilders.mx/reap), [evento y criterios](https://luma.com/r7x9nu2h). El énfasis del guion en ejecución técnica, confianza y control responde a esos criterios. Usar el portal del aviso original y el cierre comunicado arriba; no deducir plazos de una fecha del repositorio.
