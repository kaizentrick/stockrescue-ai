# StockRescue

**Reposición de inventario con cantidades justificadas, aprobación humana y Reap sandbox.** StockRescue calcula qué hace falta, cuánto pedir y si el total cabe en el presupuesto. Un pedido confirmado queda pendiente de recibir; las existencias aumentan cuando la persona registra la recepción.

El MVP reutiliza persistencia, aprobaciones e idempotencia del prototipo Reap Workplace Agent. Su caso principal es reponer **Café Guerrero Atoyac de Blend Station, bolsa de 250 g en grano**, incluido en la lista de comercios del evento. Vasos y filtros permiten explorar el mismo cálculo, pero no tienen proveedor habilitado para comprar.

**Estado:** práctica local funcional y conexión autenticada al sandbox de Reap. El nuevo enrollment llegó a **ACTIVE** con tarjeta oficial de prueba, OTP y passkey en Safari. Se obtuvo y aprobó una cotización de una bolsa por **$360 MXN** ($300 de producto y $60 de envío); el checkout simulado se autorizó y continúa **PROCESSING**, con referencia de pedido y sin acciones pendientes. Todavía no se declara COMPLETED. Los importes son evidencia de esa prueba, no precios futuros garantizados. Ver [integración Reap](docs/REAP-INTEGRATION.md) y [validación](docs/QA.md). Producción está bloqueada; existencias, consumo y dirección inicial son ejemplos.

## Ejecutar

Requiere Node.js 24 o superior y npm.

```sh
npm ci
npm run check
npm run build
npm start
```

Abrir [StockRescue local](http://127.0.0.1:4317). Sin configuración adicional se inicia en **Práctica local**; no requiere llave ni realiza compras externas. `npm run dev` reinicia el servidor al editar TypeScript.

Los datos se guardan en `.data/stockrescue-mock.sqlite`; sandbox usa una base separada, `.data/stockrescue-sandbox.sqlite`. Ambas están excluidas de Git. El servidor escucha en `127.0.0.1`. El MVP es de un operador local, sin autenticación multiusuario: no publicarlo como servicio abierto.

Para abrir el entorno conectado, usar `npm run sandbox` con 1Password CLI (`op`) y la bóveda desbloqueada. El lanzador lee el campo secreto `credential` del elemento `StockRescue Reap sandbox`, sin imprimirlo ni crear un archivo de secretos. Ver configuración, caducidad de la llave y resultado del último intento en [integración Reap](docs/REAP-INTEGRATION.md).

## Primer recorrido

1. Revisar el café en **Inventario**: dos bolsas disponibles y consumo estimado de media bolsa al día.
2. Usar **Editar datos** para ajustar existencias, reservas, consumo, plazos, capacidad y límite; o **Importar inventario** para previsualizar un CSV antes de guardarlo.
3. Pulsar **Preparar reposición** y **Obtener cotización final**. Revisar cantidad, dirección, envío, moneda y total.
4. Aprobar el total mediante el diálogo. Vincular la tarjeta ficticia en práctica local o seguir la autorización hospedada en sandbox.
5. Enviar la compra de prueba. Si el resultado es incierto, consultar **el mismo intento**.
6. Abrir **Pedidos y recepción** y registrar lo recibido, completo o parcial. **Historial** conserva decisiones y permite exportar el registro.

El café inicial sugiere una bolsa: objetivo de tres menos dos disponibles, con una bolsa por unidad de compra. Tiene cuatro días de cobertura y alcanza el punto de reposición de dos bolsas. Si al editar los datos la cobertura queda por debajo del plazo, la app muestra la brecha sin prometer evitar el faltante. En práctica, una bolsa a $300 más $99 de envío produce un total ficticio de $399 MXN. Sandbox utiliza exclusivamente su cotización final validada y puede rechazar cantidades mayores.

## Controles y alcance

- Motor determinista de mínimos y máximos; no hay LLM ni predicción estadística de ventas.
- Distingue piezas de inventario y paquetes comprados; no compra por demanda cero ni cuando el empaque excede capacidad.
- Incluye mercancía comprometida para evitar sobrecompra y señala entregas tardías.
- Valida CSV con errores por fila; actualizar datos revoca propuestas y aprobaciones sin enviar.
- Aprueba un snapshot del producto, cantidad, destino, envío, moneda y total. Revalida evidencia y cotización antes del checkout.
- Reserva presupuesto de forma transaccional y persiste la clave antes de enviar. Pagos pendientes y confirmados consumen presupuesto; fallos definitivos lo liberan.
- Un timeout conserva intento y reserva. El retorno del navegador nunca acredita un pago.
- Importes en centavos MXN, sin conversión implícita. No se permite comprar a un comercio arbitrario desde un CSV.

El MVP cubre una tienda local y un producto comprable mediante el adaptador. No incluye usuarios/roles, múltiples empresas, POS, facturación, reembolsos, reposiciones automáticas ni ejecución productiva. El plazo de llegada procede de la estimación del inventario, no de una promesa del comercio. La utilidad comercial aún requiere un piloto.

## Piezas reutilizadas

Se incorporan dependencias concretas, conservando las licencias distribuidas por npm. Versiones fijadas en `package.json` y `package-lock.json`; licencias comprobadas en los paquetes instalados.

| Proyecto | Versión | Uso | Licencia |
|---|---|---|---|
| [Papa Parse](https://github.com/mholt/PapaParse) | 5.7.0 | Lectura y generación de CSV | MIT |
| [Zod](https://github.com/colinhacks/zod) | 4.6.5 | Contratos de inventario, ajustes y proveedor | MIT |
| [decimal.js](https://github.com/MikeMcl/decimal.js) | 10.6.0 | Conversión exacta de importes a centavos | MIT |
| [Playwright](https://github.com/microsoft/playwright) | 1.64.0 | Verificación en navegador | Apache-2.0 |

No se incorporó un ERP completo ni una biblioteca de agentes. La interfaz usa HTML, JavaScript y CSS propios; HTTP y SQLite son módulos nativos de Node. Consultar [QA](docs/QA.md) para los comandos y resultados de pruebas de navegador disponibles.

## Documentación actual

- [Arquitectura y cálculo](docs/ARCHITECTURE.md)
- [Integración Reap y sandbox](docs/REAP-INTEGRATION.md)
- [Producto de la lista de comercios](docs/MERCHANTS.md)
- [Recorrido y dirección visual](docs/DESIGN.md)
- [Guion de demostración](docs/DEMO-SCRIPT.md)
- [Validación](docs/QA.md), [trabajo pendiente](docs/TASKS.md) y [contribuciones](CONTRIBUTING.md)

## Antecedentes preservados

`docs/space/`, `docs/pitch/` y `docs/reviews/` son **instantáneas históricas del proyecto de equipamiento**, con sus originales y comprobaciones de integridad. No describen la UI ni el alcance actual de StockRescue. Se conservan sin reescribir archivos, PDF, presentación o hashes. [Estado de la transición](docs/SPACE-STATUS.md).

No incluir llaves, datos de tarjeta, enlaces privados de autorización ni bases en commits, issues o capturas. Los registros exportados pueden contener dirección y correo introducidos en la aplicación: revisarlos antes de compartir.
