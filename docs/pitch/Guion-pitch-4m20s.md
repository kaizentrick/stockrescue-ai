# Agente de equipamiento

Guion de presentación en español. 7 láminas. Duración objetivo: 4:20, con margen antes de 5:00. Nombre descriptivo provisional.

Estado del proyecto: 9 de octubre de 2026, 19:00, Ciudad de México. El checkout usa una simulación local. La ejecución real contra Reap sandbox aún necesita validación.

## 1. Agente de equipamiento

0:00–0:25 (25 segundos)

Un puesto necesita conectar su monitor y TI tiene que decidir qué hacer. Nuestro agente revisa el equipo disponible y la evidencia técnica para proponer reutilizar o comprar una pieza compatible. Cuando hace falta comprar, el flujo exige una cotización y una aprobación explícita. Este prototipo usa una simulación local.

Fuentes y contexto:
- Nombre descriptivo provisional. Estado técnico reportado por el equipo al 9 de octubre de 2026, 19:00, Ciudad de México.
- Y Combinator, How to Design a Better Pitch Deck, consultado el 9 de octubre de 2026: https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck
- Imagen de portada: ilustración conceptual generada con IA. No muestra equipos, pruebas ni clientes reales.

## 2. Un puesto bloqueado

0:25–1:00 (35 segundos)

Pensemos en una oficina con distintos modelos de computadoras. Cambia una laptop y el monitor deja de conectar. Operaciones busca un accesorio, TI verifica si funciona y alguien autoriza el gasto. La solicitud se reparte entre personas y mensajes. Nuestro caso de prueba tiene tres portátiles, tres monitores y dos adaptadores. Contarlos no demuestra que falte uno: primero debemos conocer los puertos, los cables y la conexión que necesita cada puesto.

Fuentes y contexto:
- Escenario sintético del proyecto. La frecuencia, el costo y el impacto del problema todavía requieren validación con usuarios.
- Dell, How to Choose a USB Type-C Dock or a USB Type-A Dock for Compatibility, consultado el 9 de octubre de 2026: https://www.dell.com/support/kbdoc/en-us/000125885/usb-and-usb-type-c-dock-compatibility-list

## 3. La decisión empieza en el inventario

1:00–1:45 (45 segundos)

El agente compara el objetivo del puesto con los modelos exactos y sus fichas. USB-C por sí solo no prueba que haya salida de video. Si el inventario permite una conexión válida, propone reutilizar y termina sin compra. Si falta información, pide ese dato. Si comprueba un faltante, compara componentes compatibles y proveedores permitidos. El presupuesto se verifica contra el total con envío e impuestos. La hipótesis de valor es reducir decisiones equivocadas y trabajo de revisión. Todavía no presentamos esos beneficios como resultados medidos.

Fuentes y contexto:
- Diseño del producto e hipótesis por validar. Las fichas e inventario del caso de demostración son sintéticos.
- Dell, guía de compatibilidad de docks, consultada el 9 de octubre de 2026: https://www.dell.com/support/kbdoc/en-us/000125885/usb-and-usb-type-c-dock-compatibility-list

## 4. Compra aprobada y estado verificable

1:45–2:35 (50 segundos)

La demo recorre una solicitud concreta. Primero explica la pieza elegida y conserva la evidencia. Después presenta la cotización exacta: variante, comercio, cantidad, moneda y total. La persona aprueba esas condiciones. El paso que estamos preparando es ejecutar el Agentic module de Reap en sandbox y consultar el estado del mismo intento. Hoy este recorrido de checkout funciona en simulación local y la conexión real a Reap sigue pendiente de validación. Incluso con un pedido confirmado, el expediente mantiene la instalación pendiente. La prueba funcional del puesto viene después.

Fuentes y contexto:
- Estado al 9 de octubre de 2026, 19:00, Ciudad de México: interfaz y ciclo de checkout en simulación local. Adaptador Reap deshabilitado. No hay ejecución de API real verificada.
- AI Builders México, guía oficial del Agentic Hackathon, consultada el 9 de octubre de 2026: https://aibuilders.mx/reap#apis
- Reap, One-time purchases, documentación de referencia consultada para el proyecto: https://docs.reap.global/agentic-payments/one-time-purchases
- Captura real del prototipo local, revisión 9ff255e, proporcionada por el equipo. Detalle del archivo preview.jpg. Inventario y datos sintéticos. El recorte conserva el estado del pedido y la instalación pendiente. No es una captura de Reap.

## 5. Los límites también son parte del producto

2:35–3:15 (40 segundos)

Queremos que el límite sea visible. Una compatibilidad desconocida exige más evidencia. Un total fuera del presupuesto bloquea la compra. Si cambia la cotización, caduca la aprobación anterior. Y si la respuesta tarda, conservamos el intento y consultamos su estado antes de volver a comprar. Ya probamos localmente la invalidación por cambio de cotización, la conciliación tras un timeout y la nueva aprobación después de un fallo o vencimiento. Falta repetir el recorrido contra Reap sandbox con evidencia de sus respuestas.

Fuentes y contexto:
- Pruebas del prototipo reportadas por ingeniería al 9 de octubre de 2026, 19:00, Ciudad de México. Los resultados descritos pertenecen al mock local.
- Reap, One-time purchases: https://docs.reap.global/agentic-payments/one-time-purchases

## 6. Cliente inicial y alternativa real

3:15–3:50 (35 segundos)

Nuestra primera hipótesis son oficinas con equipos de distintos modelos y solicitudes frecuentes de altas o reemplazos. TI usaría el producto y operaciones o administración evaluaría el pago. Hoy pueden resolverlo con su técnico, un proveedor, hojas de cálculo o herramientas de compras. Nuestra apuesta es un expediente que justifique la compatibilidad y la reutilización antes del gasto. Hay que demostrar que ese trabajo adicional merece pagarse. Proponemos probar cobro por organización con solicitudes limitadas, sin fijar todavía un precio.

Fuentes y contexto:
- Hipótesis comercial y propuesta de modelo de ingresos. No hay clientes, pilotos adquiridos, ingresos ni disposición a pagar acreditados.
- Sequoia Capital, Writing a Business Plan, publicada el 15 de marzo de 2019, consultada el 9 de octubre de 2026: https://sequoiacap.com/article/writing-a-business-plan
- Clara México, producto de gestión de gasto, referencia competitiva: https://www.clara.com/es-mx/productos/gestion-gastos

## 7. La siguiente prueba

3:50–4:20 (30 segundos)

Tenemos un prototipo local y controles del checkout probados en ese entorno. El siguiente paso técnico es verificar el ciclo completo con Reap sandbox y un comercio permitido. Después proponemos cinco pilotos para comparar decisiones correctas, minutos de trabajo y disposición a pagar frente al proceso habitual. La pregunta que queremos responder es sencilla: ¿puede TI resolver mejor esta solicitud, con evidencia suficiente y una compra autorizada cuando realmente hace falta?

Fuentes y contexto:
- Plan propuesto. Cinco pilotos es una meta de validación, no tracción. No se ha realizado contacto con prospectos ni adquirido compromisos.
- AI Builders México, requisito de Agentic module, sandbox y comercios soportados: https://aibuilders.mx/reap#apis

## Ensayo

Leer el guion sin leer todos los textos de la lámina. La ventana de cada lámina incluye una pausa breve. Si se añade una demostración en vivo, sustituir la explicación de la lámina 4 por esa demo y mantenerla dentro de sus 50 segundos. No sumar una demo aparte. Ensayar con cronómetro y cerrar antes de 4:40.

La estructura sigue dos principios de las referencias: una idea legible por lámina (Y Combinator) y propósito, dolor, solución y alternativas explícitos (Sequoia). El pitch de hackathon omite proyecciones y solicitud de inversión porque no hay cifras respaldadas para presentarlas.
