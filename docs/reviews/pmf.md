# Revisión crítica de product–market fit

Fecha: 10 de octubre de 2026. Proyecto independiente de diagnóstico y compra de componentes TI. Revisión del brief, investigación de mercado y guía oficial facilitados; no incluye entrevistas, pruebas de producto competitivo ni verificación adicional de la API.

## Dictamen

**La hipótesis merece una prueba acotada; todavía no hay evidencia de PMF.** El demo puede mostrar una diferencia concreta frente a un buscador: identificar por qué un puesto no cumple su objetivo, descartar compras incorrectas, agotar una ruta de reutilización y autorizar únicamente una compra vinculada al faltante. No está demostrado que eso sea frecuente, que el cliente pague por separado ni que Reap cubra los proveedores necesarios.

El problema a vender es **resolver el bloqueo de un puesto de trabajo con una decisión verificable**. La unidad del demo es una solicitud técnica con resolución y expediente; el adaptador es su posible consecuencia. «Puesto operativo» es el resultado final que el piloto debe medir, no algo que se pueda afirmar al completar un checkout sandbox.

La mayor amenaza comercial no es otro chatbot. Es un técnico, MSP o distribuidor que ya conoce los equipos, recomienda, compra, instala y responde cuando algo falla. El producto debe ganar una tarea específica frente a ese sustituto o venderse como su herramienta. Un ERP/catálogo estándar también puede eliminar el problema antes de que aparezca.

### Posicionamiento propuesto

> Para responsables de TI que atienden solicitudes repetidas en un parque mixto, convertimos un bloqueo documentado de un puesto en una decisión de reutilización o compra compatible, con presupuesto autorizado y trazabilidad hasta confirmar su instalación.

Esta frase describe el alcance deseado, no prestaciones ya construidas. Para el deck actual: «Prototipo de diagnóstico y compra controlada; instalación pendiente de confirmación. Sin clientes pagadores confirmados».

## 1. Trabajo, usuario y alternativa real

### Trabajo principal

«Cuando un puesto no puede hacer una tarea definida, necesito saber qué lo impide y resolverlo con lo que ya existe o con la pieza correcta, sin investigar desde cero ni comprar a ciegas».

- Disparadores: alta, traslado, reemplazo o incidencia de conectividad documentada.
- Solicitante: persona afectada u operaciones.
- Usuario profesional inicial: responsable de TI interno o técnico/MSP que diagnostica y asume seguimiento.
- Comprador del software: responsable con presupuesto de TI/operaciones o dueño del MSP. Es una hipótesis; verificar quién puede aprobar realmente.
- Aprobador de la mercancía: rol distinto del comprador del software, aunque a veces coincidan.
- Resultado observable: tarea funcional verificada, o derivación explícita cuando el alcance no permite resolverla.

No tratar «necesito tres adaptadores» como diagnóstico. Tres puestos y dos adaptadores no bastan para concluir un faltante sin comprobar conexión directa, cableado, asignación, disponibilidad y requisitos de uso.

### Contra quién debe ganar

| Alternativa | Qué puede hacer mejor | Prueba honesta del producto |
|---|---|---|
| Técnico/MSP de confianza | Contexto del parque, responsabilidad, instalación, relación existente | ¿Reduce su investigación y revisiones manteniendo calidad, sin trasladarle trabajo nuevo? |
| Distribuidor/reseller | Asesoría vinculada a disponibilidad, garantía, devoluciones | ¿Sigue aportando valor si la recomendación ya viene incluida en la compra? |
| ERP + catálogo estándar | Repetición, controles, inventario y proveedores ya aprobados | ¿Resuelve excepciones técnicas que el catálogo no cubre? |
| Hoja + correo/chat + kit estándar | Bajo costo incremental y flexibilidad | Comparar con el procedimiento real del cliente, sin empeorarlo artificialmente |
| Plataformas de gasto | Presupuestos, aprobaciones, comprobación | La ventaja debe aparecer antes de aprobar: necesidad y compatibilidad documentadas |

Estas son hipótesis competitivas y capacidades descritas en la investigación entregada, no resultados de un benchmark equivalente entre productos.

## 2. Segmentación: seleccionar comportamiento, no tamaño decorativo

### Primer segmento experimental

Responsables de TI de organizaciones que tengan simultáneamente:

1. Solicitudes repetidas, demostrables en registros recientes.
2. Mezcla de modelos/configuraciones y excepciones que el kit estándar no resuelve.
3. Acceso razonable a modelos exactos, inventario y documentación.
4. Autoridad o colaboración para probar el proceso sin saltarse sus proveedores obligatorios.
5. Un responsable capaz de confirmar si la solución funcionó.

La investigación sugiere oficinas de servicios profesionales como punto de partida. No hay evidencia para fijar un rango ganador de empleados ni afirmar que cualquier pyme pertenece al mercado.

### Segundo segmento a contrastar en paralelo, sin mezclar resultados

MSP/técnico externo que agrega solicitudes de varias cuentas. Puede concentrar frecuencia y confianza, pero introduce gestión multicliente, separación de datos, procesos y responsabilidad. Primero medir su trabajo con casos anonimizados; no construir de entrada una plataforma multitenant completa.

### Despriorizar

- Compradores ocasionales con parque estandarizado y sin errores registrados.
- Quienes reciben resolución satisfactoria incluida en su soporte actual y no tienen tarea residual por pagar.
- Casos donde domina entrega urgente, instalación presencial o soporte fuera del alcance.
- Hardware crítico, dimensionamiento complejo y entornos regulados.

**No combinar a un usuario interesado con un cliente pagador.** Un técnico puede querer usarlo sin tener presupuesto; dirección puede pagarlo sin usarlo. La investigación debe conectar ambas decisiones.

## 3. Frecuencia, costo del error y captura de valor

### Lo que se debe medir

Por cuenta y solicitud: disparador, categoría, fecha, minutos activos de cada persona, esperas, disponibilidad de datos, resolución habitual, costo de corrección, recepción, instalación y resultado. Recoger también solicitudes resueltas sin compra y casos fuera de alcance; excluirlos del denominador fabricaría resultados.

Separar:

- Frecuencia observada de solicitudes técnicas, solicitudes dentro del alcance y compras resultantes.
- Tiempo de trabajo activo y tiempo calendario hasta resolución.
- Compatibilidad incorrecta, cantidad innecesaria, falta de cable/accesorio, entrega tardía y falta de factura. Son problemas distintos.
- Precio del componente y costo comprobado de una decisión incorrecta: devolución no recuperable, envío, revisión técnica y repetición del trabajo.
- Indisponibilidad del puesto y pérdida económica efectivamente atribuible. No convertir automáticamente toda espera en salario perdido o ventas perdidas.

### Hipótesis de valor

Valor medido = trabajo activo evitado + costos de errores evitados atribuibles + otras pérdidas demostradas − carga de registro, revisión y cambio de proceso.

Para atribuir errores evitados, una alerta sola no basta. Usar comparación ciega con el proceso previo o revisión experta de la decisión que se habría tomado. No inventar el contrafactual «se habría comprado mal».

### Captura

- **Suscripción por organización:** solo si hay uso repetido y valor persistente. Una semana con altas no demuestra recurrencia mensual.
- **Tarifa por solicitud resuelta:** hipótesis útil para trabajo episódico; definir si resolución significa diagnóstico, decisión aprobada o instalación verificada. No cobrar por «resultado» que no se controla.
- **Herramienta para MSP:** hipótesis si concentra volumen y el técnico gana capacidad facturable o reduce trabajo real. No asumir que todo minuto liberado se convierte en margen.

No usar GMV como ingreso ni asumir interchange, comisión comercial o afiliación sin contrato. Si se gana dinero únicamente cuando hay compra, existe un conflicto con recomendar reutilizar; el diseño y el pricing deben preservar esa opción.

Contribución por solicitud = ingreso efectivamente asignable − datos/inferencia/infraestructura variable − costos de ejecución asumidos − soporte y revisión humana − pérdidas atribuibles. Medir también onboarding y adquisición, aunque no se asignen a cada incidente. Un accesorio barato puede ser una buena demostración y una unidad económica insuficiente.

## 4. Mapa de evidencia

| Afirmación | Estado a esta fecha | Qué falta |
|---|---|---|
| Existe actividad empresarial de compras online en México | Respaldada por investigación secundaria entregada | No acredita demanda de este producto |
| El conector visible basta para determinar compatibilidad | Falso como supuesto general del producto | Modelo y capacidades documentadas; abstención si faltan |
| Reutilizar evita algunas compras | Hipótesis lógica, sin efecto medido en clientes | Inventario fiable y casos resueltos sin compra |
| La investigación de compatibilidad cuesta trabajo frecuente | Hipótesis | Registros, observación y frecuencia por segmento |
| Los errores tienen costo suficiente para pagar software | Hipótesis | Incidentes reales, costo y presupuesto del comprador |
| El usuario confiará más en evidencia que en su técnico | No demostrado; puede ser falso | Comparación con sustituto real y responsabilidad clara |
| API key entregada | Contexto facilitado por el equipo | No implica key probada, enrollment válido ni checkout ejecutado |
| Satechi/Dockcase México en hoja de merchants | Contexto facilitado por el equipo | No demuestra SKU, moneda, dirección, stock, quote ni checkout API |
| Reap Agentic utilizado de extremo a extremo | No demostrado en materiales revisados | Evidencia de llamadas y estado terminal sandbox verificable |
| Existe cliente pagador/retención/rentabilidad | No demostrado | Pago, uso posterior, renovación y costos completos |
| El pedido implica instalación correcta | No | Confirmación explícita de recepción e instalación |

## 5. Los tres cambios de producto prioritarios

### P0. Abrir por el bloqueo, con evidencia por modelo

**Ticket de demo:** sustituir el inicio «comprar un adaptador» por «este puesto debe mostrar imagen en este monitor». Precargar inventario sintético asignado al puesto y requisitos visibles. Renderizar la cadena portátil → puerto/protocolo → cable/adaptador → monitor, con la fuente de cada condición.

**Aceptación:** un dato técnico ausente genera una única pregunta necesaria o derivación; nunca se interpreta como compatible. El caso conocido como incompatible queda descartado. El usuario puede inspeccionar y corregir los supuestos. Distinguir hechos, datos sintéticos e inferencias.

**Valor PMF que prueba:** si la explicación técnica reduce investigación/revisión frente al proceso actual. No prueba exactitud universal.

### P0. Resolver antes de comprar: reutilizar, comprar o derivar

**Ticket de demo:** mostrar tres rutas posibles en el expediente. Reutilización requiere unidad compatible disponible y no asignada, con disponibilidad confirmable; «hay inventario» no equivale a que pueda usarse. La compra aparece solo si falta una pieza y hay evidencia suficiente. Derivar cuando no se puede verificar o resolver dentro del alcance.

**Aceptación:** agregar un caso «no comprar» con accesorio disponible y un caso de bloqueo por compatibilidad desconocida. Comparar compra por total cotizado, proveedor y SKU exactos; separar proveedor aprobado por empresa, presencia en lista del hackathon y habilitación efectiva API. No fabricar precios o disponibilidad reales.

**Valor PMF que prueba:** si evita trabajo o compras innecesarias. Es también una señal de confianza y diferencia frente a un recomendador que siempre vende.

### P0. Vincular dinero a la decisión y cerrar el expediente con estados honestos

**Ticket de demo:** aprobación vinculada a versión del diagnóstico, SKU/variante, cantidad, comercio, total/moneda y condiciones vigentes. Un cambio material vuelve a revisión. Incorporar referencia de quote/checkout solo cuando exista; mantener incertidumbre tras timeout y evitar duplicados. Mostrar por separado «pedido sandbox confirmado» y «recepción/instalación pendientes».

**Aceptación:** la bitácora explica qué se autorizó, qué se ejecutó y qué no se sabe. Un checkout completado no marca puesto operativo ni suma inventario recibido. Reap debe probarse mediante Agentic; si solo hay simulador local, indicarlo y no declararlo cumplimiento del requisito del hackathon.

**Valor PMF que prueba:** continuidad entre decisión y ejecución controlada, en lugar de añadir un botón de pago a un buscador. La instalación se valida después mediante acción humana explícita, sin prometer logística que no se ha comprobado.

## 6. Validación posterior: puertas y criterios de descarte

Los tamaños y umbrales siguientes son **decisiones experimentales propuestas**, no evidencia actual ni criterios universales de PMF. Acordarlos antes de ver resultados. Contactar, ofrecer/cobrar pilotos o compartir datos requiere autorización del usuario.

### Puerta A: problema y repetición

Revisar solicitudes históricas y entrevistar dos roles cuando existan en 6 organizaciones candidatas y 3 MSP. Clasificar cada caso sin forzarlo a la solución. Usar una ventana reciente suficientemente larga para distinguir una campaña de altas de actividad habitual.

**Continuar:** encontrar varias cuentas independientes con el mismo trabajo recurrente no resuelto y un dueño del presupuesto identificable.

**Descartar la suscripción directa:** las cuentas solo tienen eventos aislados o el kit/proveedor actual ya los resuelve bien. Probar precio por evento o herramienta MSP únicamente si existe evidencia para esa alternativa; no llamarlo PMF del segmento inicial.

### Puerta B: exactitud y viabilidad de ejecución

Evaluar al menos 30 casos anonimizados dentro y fuera de alcance con respuesta y evidencia fijadas antes por experto. Incluir desconocidos, conexión directa, inventario reservado e incompatibles. Por separado, verificar en sandbox el camino real sobre merchants permitidos; no probar compra real.

**Avanzar a piloto supervisado:** cero recomendaciones conocidas como incompatibles en la muestra y abstención explícita ante datos insuficientes; esto no prueba riesgo cero. Verificar el canal para solicitudes concretas, no para «México» en general.

**Detener ejecución de compra:** un falso positivo crítico, evidencia inventada o proveedor no habilitado. Corregir y reevaluar. Si el canal no cubre los proveedores indispensables, abandonar la promesa de compra end-to-end para ese segmento.

### Puerta C: ventaja frente al proceso habitual

Piloto supervisado de 4–6 semanas, por ejemplo con 5 cuentas del segmento elegido. Comparar solicitudes equivalentes contra el proceso real; incluir el tiempo de onboarding, revisión, corrección y excepciones. Mantener separados los resultados de MSP y TI interno. Si la ventana no contiene casos suficientes, el estudio es inconcluso; esa baja frecuencia sí informa el modelo de ingresos.

**Avanzar:** mejora repetida en trabajo activo o calidad a un nivel que el comprador considera material, sin degradar compatibilidad ni añadir una carga mayor a otra persona.

**Descartar la tesis de ahorro:** con datos mínimos disponibles, el sistema no mejora al técnico/proceso previo o depende de intervención experta por cada caso que consume el beneficio. No compensar el mal resultado contando tiempos de espera como horas ahorradas.

### Puerta D: pago y repetición después del piloto

Presentar una oferta concreta, con alcance, soporte y precio explícitos, a los compradores elegibles. Registrar quién paga, qué presupuesto usa y por qué acepta/rechaza. Solicitar continuidad o renovación después de uso real; un primer pago puede validar un servicio puntual, no retención.

**Señal mínima para invertir más:** al menos 3 cuentas independientes pagan voluntariamente por el alcance probado y vuelven a usarlo o renuevan en su siguiente ciclo real de necesidad, con costos de servicio medidos. Es un gate exploratorio, no una proclamación de PMF.

**Descartar esa oferta/segmento:** nadie paga después de demostrar un beneficio reconocido; todos exigen un alcance fuera de capacidades; o el precio aceptable queda por debajo del costo variable completo. Distinguir rechazo de precio, ausencia de problema y presupuesto ya comprometido con el sustituto.

No ampliar a una suite de activos, garantías, ERP o soporte para salvar una prueba fallida sin una nueva hipótesis y autorización de alcance.

## 7. Qué decir en el deck

1. Problema: «Una solicitud de TI puede terminar en una compra incorrecta porque inventario, requisitos y autorización están separados». Presentarlo como hipótesis hasta medir incidencias.
2. Demostración: «Este caso sintético documenta el bloqueo, verifica reutilización y compra solo el faltante bajo aprobación».
3. Diferencia: «La decisión depende de evidencia técnica; desconocido significa bloqueo. El pago queda ligado al diagnóstico aprobado».
4. Resultado: «Pedido sandbox y expediente; recepción e instalación pendientes». Añadir únicamente la evidencia real de API obtenida.
5. Mercado: «Probamos responsables TI con casos repetidos y parque mixto; evaluamos MSP como segmento distinto».
6. Negocio: «Precio, recurrencia y contribución pendientes de validación. Sin clientes pagadores confirmados».

Eliminar frases como «ahorramos X%», «rentable desde el día uno», «compatible con cualquier equipo», «compra en cualquier tienda», «puesto resuelto al pagar» o «PMF validado».

## Fuentes y límites

- Investigación entregada: `equipment_market_viability_es.md`, consultada el 9 de octubre de 2026. Incluye INEGI, alternativas y reglas de Reap; los hechos derivados conservan sus límites.
- Brief entregado: `equipar-equipo-faltante.md`. Datos y precios del escenario son sintéticos.
- Guía oficial facilitada: Agentic Hackathon — Reap × AI Builders Mexico. Requiere Agentic, sandbox y merchants admitidos; desaconseja el chatbot genérico de buscar, mostrar y comprar. El extracto no incluye URL verificable propia.
- [Documentación Reap de compras puntuales](https://docs.reap.global/agentic-payments/one-time-purchases) y [FAQ](https://docs.reap.global/agentic-payments/faq): enlaces incluidos en las fuentes entregadas; no se efectuó una prueba de cuenta/API en esta revisión.
- [Compatibilidad de docks Dell](https://www.dell.com/support/kbdoc/en-us/000125885/usb-and-usb-type-c-dock-compatibility-list): documentación técnica citada por la investigación, no evidencia de compatibilidad de un SKU aún no evaluado.

Este informe no demuestra demanda, ahorro, rentabilidad, disponibilidad comercial ni ejecución real. Define qué producto acotar y qué evidencia exigir para decidir si vale la pena seguir.
