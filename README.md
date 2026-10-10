# StockRescue

**Reposición de inventario con cantidades justificadas, aprobación humana y Reap sandbox.** StockRescue calcula qué hace falta, cuánto pedir y si el total cabe en el presupuesto. Un pedido confirmado queda pendiente de recibir; las existencias aumentan cuando la persona registra la recepción.

El MVP reutiliza persistencia, aprobaciones e idempotencia del prototipo Reap Workplace Agent. Su caso principal es reponer **Café Guerrero Atoyac de Blend Station, bolsa de 250 g en grano**, incluido en la lista de comercios del evento. Vasos y filtros permiten explorar el mismo cálculo, pero no tienen proveedor habilitado para comprar.

**Estado verificado el 9 de octubre de 2026:** plataforma protegida y demostración pública, Google AI Studio con `gemini-3.8-flash`, conversación y documentos reales por WhatsApp Cloud API. Los datos operativos siguen siendo los ejemplos del sandbox. El checkout Reap existente continúa **PROCESSING** por $360 MXN: se conserva el mismo intento y su reserva, sin otra compra. Ver [QA](docs/QA.md) y [Reap](docs/REAP-INTEGRATION.md).

## Ejecutar el MVP conectado

Requiere macOS, Node.js 24+, npm, Cloudflare `cloudflared` y 1Password CLI (`op`). Las credenciales se leen por pipes desde la bóveda, nunca desde archivos `.env`.

```sh
npm ci
npm run check
npm run build
npm run service -- status
# Primer registro en este Mac (ya realizado):
# npm run service -- install
npm run service -- stop
npm run service -- start
# Recuperación de un servicio ya cargado:
npm run service -- restart
```

El LaunchAgent `com.kaizentrick.stockrescue` arranca al iniciar sesión, recupera procesos y ejecuta una sola instancia del worker. 1Password debe estar desbloqueado y autorizar su CLI al iniciar. Para diagnóstico en primer plano: detener primero el servicio y ejecutar `npm run mvp:public`; `npm run mvp` sirve solamente en localhost:4321. No ejecutar los lanzadores antiguos del agente junto con el MVP.

URL verificada al entregar: [MVP protegido](https://tours-representation-concerts-pipe.trycloudflare.com) y [demostración pública](https://tours-representation-concerts-pipe.trycloudflare.com/demo).

La dirección HTTPS vigente se consulta con `npm run service -- status`; `/` requiere la contraseña del elemento **StockRescue Owner** en 1Password. `/demo` ofrece datos simulados aislados. El **Quick Tunnel dura mientras corre cloudflared** y cambia de URL al reiniciar el supervisor; el lanzador actualiza el callback de Meta automáticamente. No se encontró una cuenta y dominio de Cloudflare configurados para un túnel estable. Mac despierto, conexión y sesión iniciada son necesarios.

Elementos de bóveda: `StockRescue Reap sandbox`, `GOOGLE_AI_STUDIO_API_KEY`, `StockRescue Owner`, `StockRescue WhatsApp`, todos en su campo `credential`. El último contiene la configuración de Meta en JSON. `.data/service.json` contiene únicamente `{"metaConfigured":true}`, sin secretos. Datos: `.data/stockrescue-sandbox.sqlite`; cola: `.data/stockrescue-agent.sqlite`; no borrar ninguno para recuperar una operación. `.data` es privada y está excluida de Git.

El bot de prueba es **+1 555 653 4554**. Solo se admite **+52 55 3373 4608**; Meta puede representarlo con el prefijo mexicano antiguo `521`. La app **StockRescue** está separada de Cenlo. El token Meta se renovó con vigencia de 60 días; necesita renovación antes de caducar. La clave Reap del evento vence el 11 de octubre a las 00:00 CDMX. Los avisos fuera de la ventana de atención requieren la plantilla aprobada por Meta; ver [configuración y dependencias](docs/AGENT-INTEGRATION.md).

Para práctica completamente local y sin credenciales: `npm start`, puerto 4317 y `.data/stockrescue-mock.sqlite`. Ese lanzador antiguo no es el despliegue público protegido.

## Primer recorrido

1. Revisar el café en **Inventario**: dos bolsas disponibles y consumo estimado de media bolsa al día.
2. Usar **Editar datos** para ajustar existencias, reservas, consumo, plazos, capacidad y límite; o **Importar inventario** para previsualizar un CSV antes de guardarlo.
3. Pulsar **Preparar reposición** y **Obtener cotización final**. Revisar cantidad, dirección, envío, moneda y total.
4. Aprobar el total mediante el diálogo. Vincular la tarjeta ficticia en práctica local o seguir la autorización hospedada en sandbox.
5. Enviar la compra de prueba. Si el resultado es incierto, consultar **el mismo intento**.
6. Abrir **Pedidos y recepción** y registrar lo recibido, completo o parcial. **Historial** conserva decisiones y permite exportar el registro.

El café inicial sugiere una bolsa: objetivo de tres menos dos disponibles, con una bolsa por unidad de compra. Tiene cuatro días de cobertura y alcanza el punto de reposición de dos bolsas. Si al editar los datos la cobertura queda por debajo del plazo, la app muestra la brecha sin prometer evitar el faltante. En práctica, una bolsa a $300 más $99 de envío produce un total ficticio de $399 MXN. Sandbox utiliza exclusivamente su cotización final validada y puede rechazar cantidades mayores.

## Controles y alcance

- Motor min/max conservado, historial de movimientos y pronóstico por promedio histórico; si faltan siete días completos se declara el consumo editable como supuesto.
- Gemini interpreta consultas y propone movimientos, recepciones y recordatorios; cada cambio relevante exige confirmación del backend.
- PDF, JPEG y PNG con extracción, corrección por SKU/unidad, detección de duplicados y confirmación transaccional. Una factura de compra se archiva sin sumar stock.
- Simulación reproducible de demanda regular, semanal, promociones y retrasos, separada del inventario; evaluación temporal sin usar datos posteriores.
- Recordatorios y resúmenes actualizados, una vez/diarios/semanales en CDMX; avisos persistentes y estados de entrega asociados al mensaje.
- Distingue piezas de inventario y paquetes comprados; no compra por demanda cero ni cuando el empaque excede capacidad.
- Incluye mercancía comprometida para evitar sobrecompra y señala entregas tardías.
- Valida CSV con errores por fila; actualizar datos revoca propuestas y aprobaciones sin enviar.
- Aprueba un snapshot del producto, cantidad, destino, envío, moneda y total. Revalida evidencia y cotización antes del checkout.
- Reserva presupuesto de forma transaccional y persiste la clave antes de enviar. Pagos pendientes y confirmados consumen presupuesto; fallos definitivos lo liberan.
- Un timeout conserva intento y reserva. El retorno del navegador nunca acredita un pago.
- Importes en centavos MXN, sin conversión implícita. No se permite comprar a un comercio arbitrario desde un CSV.

El MVP cubre una tienda local y un producto comprable mediante el adaptador. Incluye acceso de un propietario; no incluye roles, múltiples empresas, POS, emisión fiscal, reembolsos, compras automáticas ni ejecución productiva. El plazo de llegada procede de la estimación del inventario, no de una promesa del comercio. La utilidad comercial aún requiere un piloto.

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

- [Entorno del agente de WhatsApp y Google AI Studio](docs/AGENT-INTEGRATION.md): configuración, webhook firmado, documentos, confirmaciones, avisos y recuperación del proceso unificado.
- [Arquitectura y cálculo](docs/ARCHITECTURE.md)
- [Integración Reap y sandbox](docs/REAP-INTEGRATION.md)
- [Producto de la lista de comercios](docs/MERCHANTS.md)
- [Recorrido y dirección visual](docs/DESIGN.md)
- [Guion de demostración](docs/DEMO-SCRIPT.md)
- [Validación](docs/QA.md), [trabajo pendiente](docs/TASKS.md) y [contribuciones](CONTRIBUTING.md)

## Antecedentes preservados

`docs/space/`, `docs/pitch/` y `docs/reviews/` son **instantáneas históricas del proyecto de equipamiento**, con sus originales y comprobaciones de integridad. No describen la UI ni el alcance actual de StockRescue. Se conservan sin reescribir archivos, PDF, presentación o hashes. [Estado de la transición](docs/SPACE-STATUS.md).

No incluir llaves, datos de tarjeta, enlaces privados de autorización ni bases en commits, issues o capturas. Los registros exportados pueden contener dirección y correo introducidos en la aplicación: revisarlos antes de compartir.
