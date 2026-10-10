# Demostración de StockRescue

## Preparación

Abrir la app y comprobar el distintivo de entorno. Usar inventario sintético y revisar que no haya intentos inciertos antes de iniciar otra compra. Para sandbox, consultar [REAP-INTEGRATION.md](REAP-INTEGRATION.md). No mostrar credenciales, tarjetas, OTP ni enlaces privados en grabaciones.

## Recorrido de dos a tres minutos

1. **Necesidad.** «La tienda conoce sus existencias, pero necesita decidir cuánto reponer sin comprar de más». Mostrar café, vasos y filtros; aclarar que consumo y existencias son ejemplos.
2. **Decisión.** Café: dos bolsas, consumo de media bolsa al día, entrega de tres días y uno de seguridad. Punto de reposición dos, objetivo tres; propuesta una bolsa de 250 g. Abrir cálculo y mostrar que el motor decide con estos datos sintéticos.
3. **Límite real.** Los filtros necesitan reposición, pero no tienen proveedor habilitado. La app explica el bloqueo; los vasos no requieren compra en el ejemplo.
4. **Cotización.** Preparar café y obtener precio con envío. Revisar destino y total. En práctica, el ejemplo inicial suma $300 de producto y $99 de envío. En sandbox se verificó una cotización histórica de $360 total; mostrar exclusivamente una nueva cotización vigente, sin reutilizar la anterior.
5. **Aprobación.** Confirmar producto, cantidad, envío y total. Cambiar envío, inventario o cotización invalida la aprobación. Un límite menor al total bloquea compra.
6. **Ejecución.** Vincular tarjeta ficticia y enviar después de aprobar en práctica. En sandbox, explicar el bloqueo vigente de autenticación hospedada; no anunciar una compra completada. Si se resuelve, consultar enrollment activo antes del checkout y verificar su resultado desde servidor.
7. **Recepción.** Mostrar pedido confirmado y stock sin aumentar. Con el ejemplo de una bolsa, registrar la recepción completa. Para demostrar recepciones parciales, iniciar antes una práctica local con consumo de una bolsa por día (compra cuatro); registrar una y luego las tres restantes. Comprobar cantidades y registro.
8. **Cierre.** «StockRescue conecta una necesidad comprobable de inventario con una compra supervisada. El siguiente paso comercial es probar la utilidad con un negocio y sus datos».

## Afirmaciones permitidas

- Práctica: «El recorrido está simulado localmente; precios y pedido son de ejemplo».
- Sandbox: «Este estado lo consultó el servidor a Reap», únicamente con esa evidencia. Explicar cualquier bloqueo o discrepancia.
- «El motor es determinista y explica la cantidad», sin atribuir predicciones o decisiones a un LLM.
- Un pedido confirmado no equivale a mercancía entregada. La recepción registrada por el operador tampoco verifica por sí sola una entrega física.

`docs/pitch/` pertenece al concepto anterior de equipamiento; no es la presentación vigente de StockRescue. No presentar fechas de entrega del evento sin confirmar la comunicación actual de sus organizadores.
