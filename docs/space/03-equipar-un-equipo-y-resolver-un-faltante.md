# Equipar un equipo y resolver un faltante

Fuente: https://chatgpt.com/space/page_d6b00bb5027481919337fc2862bc2a2d

Creación: 2026-10-09T23:57:11.603979Z  
Última modificación en Space: 2026-10-10T00:01:45.014550Z  
Exportación UTC: 2026-10-10T00:58:50.522215+00:00  
Página padre: page_6ac9681f593081919017833102c3d2c7  
Secuencia de origen: 2

---

El usuario eligió: «Desarróllalo entonces con el nuevo enfoque, prepara un equipo y un faltante».

Este brief desarrolla esa elección. Conserva la comparación previa como antecedente. Es un producto nuevo e independiente: sin código, cuentas, datos ni activos de otros proyectos. No se ha construido la aplicación ni realizado un pago.

## Propuesta en una frase

Un asistente que compara lo que un equipo necesita con lo que ya tiene, detecta una pieza que falta y propone cómo completar el puesto con compatibilidad documentada, dentro del presupuesto y con aprobación humana.

## Usuario inicial y valor

Responsable de operaciones de un equipo pequeño que prepara puestos de trabajo. Hoy cruza listas, comprueba conectores y busca accesorios manualmente. El producto explica la diferencia entre inventario y objetivo, y vincula cada propuesta de compra al faltante que resuelve.

Hipótesis por validar: esta explicación reduce compras innecesarias o incompatibles y acelera la preparación de puestos. No se presenta ahorro ni demanda comercial como resultados demostrados.

## Ejemplo completamente sintético

Objetivo: preparar tres puestos para trabajar con un monitor externo cada uno.

Inventario ficticio:

- Tres portátiles del modelo demo L-01.

- Tres monitores demo M-01, cada uno con un cable HDMI.

- Dos adaptadores demo A-01 de USB-C a HDMI.

Documentos de prueba etiquetados como ficticios:

- Ficha L-01: en este ejemplo sintético, la única salida de vídeo de cada portátil es USB-C con DisplayPort Alt Mode; no tiene HDMI ni otra salida directa compatible con M-01. No hay docks ni cables conversores adicionales en el inventario.

- Ficha M-01: en este ejemplo sintético, su entrada de vídeo disponible es HDMI y su cable incluido es HDMI a HDMI; no tiene entrada USB-C. El objetivo es 1080p a 60 Hz. Los portátiles se alimentan con sus cargadores propios y los monitores con sus fuentes incluidas; no se requiere Power Delivery del adaptador.

- Ficha A-01: entrada USB-C con requisito DisplayPort Alt Mode y salida HDMI compatible con 1080p a 60 Hz.

Diagnóstico condicionado: falta un adaptador únicamente bajo las fichas y asignaciones sintéticas explícitas de este ejemplo. Tres portátiles, tres monitores y dos adaptadores por sí solos no demuestran una necesidad de compra. Primero se comprueba si existe conexión directa, otro cable compatible o un accesorio disponible que resuelva el puesto.

Mapa sintético de conexiones:

- Puesto 1: portátil L-01 número 1 → adaptador A-01 número 1 → cable HDMI número 1 → monitor M-01 número 1.

- Puesto 2: portátil L-01 número 2 → adaptador A-01 número 2 → cable HDMI número 2 → monitor M-01 número 2.

- Puesto 3: portátil L-01 número 3 → adaptador ausente → cable HDMI número 3 → monitor M-01 número 3.

Con esas premisas se necesita una unidad, no un kit completo. Si el tercer portátil dispone de HDMI compatible y el cable sirve, la salida correcta es «No hace falta comprar». La existencia de un conector USB-C por sí sola nunca se interpreta como soporte de vídeo.

Reglas del ejemplo:

- Cantidad por comprar: una unidad.

- Presupuesto máximo total: 40 USD, incluidos impuestos, envío y cargos.

- Proveedores aprobados por la empresa: Proveedor Demo A y Proveedor Demo B.

- Para un checkout real de sandbox, el proveedor además debe estar habilitado por Reap. Estos nombres ficticios no representan comercios admitidos.

- Sin fecha de entrega prometida ni urgencia logística inventada.

Alternativas ficticias para explicar la decisión:

1. Adaptador A-01 de Proveedor Demo A: 24 USD de producto, 5 USD de envío y 3 USD de impuestos; total 32 USD. Evidencia completa: opción propuesta.

2. Adaptador A-02 de Proveedor Demo B: 18 USD, pero la ficha no permite verificar salida de vídeo. Estado: compatibilidad no verificable. No pasa a pago.

3. Adaptador A-03 de Proveedor Demo B: total 46 USD. Compatible según ficha ficticia, descartado por superar el presupuesto.

4. Adaptador A-04 de Proveedor Demo C: total 28 USD. Descartado porque el proveedor no está aprobado.

Los importes anteriores son datos de demostración, no cotizaciones ni ofertas reales. Si el usuario cambia el presupuesto, se recalcula la recomendación, pero ninguna restricción se relaja silenciosamente.

## Recorrido y pantallas

### Preparar el equipo

Entradas: número de puestos, objetivo de funcionamiento, inventario existente, modelos, fichas o enlaces técnicos y presupuesto total. La demo precarga únicamente datos sintéticos visibles.

Salida: lista de supuestos que el usuario puede corregir. Solo se piden datos personales de entrega cuando sean necesarios para cotizar y estén autorizados.

### Detectar el faltante

Vista de tres puestos con su mapa de conexiones. Bajo las premisas sintéticas documentadas, dos quedan completos y uno pendiente: tres adaptadores requeridos menos dos disponibles da un faltante de uno. Si cambia la conectividad y el tercer puesto puede funcionar sin adaptador, el resumen pasa a «No hace falta comprar».

Las fichas justifican la cadena portátil → adaptador → monitor. Un dato técnico ausente produce un bloqueo de verificación, no una suposición favorable.

### Comparar opciones

Tarjetas con producto, proveedor, cantidad, coste conocido, evidencia técnica y motivo de aceptación o descarte. Estados del producto: cumple, no cumple y no verificable.

Separar restricciones obligatorias de preferencias. Mostrar todas las razones relevantes: material/prestación, compatibilidad, proveedor y presupuesto. No usar una puntuación opaca como sustituto de la evidencia.

### Revisar cotización y aprobar

Mostrar artículo y variante exactos, una unidad, comercio, total y moneda, desglose, modalidad y destino de entrega, pago puntual y restricciones de cancelación o devolución disponibles. Indicar vencimiento de la cotización cuando exista.

Botón explícito: «Aprobar esta compra de prueba». Nunca confundir aprobación del diagnóstico, del presupuesto o del plan con aprobación de un cargo.

Un cambio material de variante, proveedor, importe, dirección o condiciones invalida la aprobación anterior y exige revisión. Si la cotización vence, obtener una nueva y confirmar su vigencia y condiciones antes de continuar.

### Resultado verificable

Mostrar estado del intento y referencia de pedido únicamente si se obtiene del sistema correspondiente. Una redirección de retorno no acredita por sí sola finalización. El inventario real no se marca como recibido por completar un checkout: la recepción queda fuera de esta demo.

Etiqueta persistente: «Demo con inventario ficticio». Mostrar además «Pago simulado localmente» o «Prueba Reap sandbox», según lo que se haya ejecutado realmente. Nunca mostrar una simulación local como respuesta de Reap.

## Estados y prevención de duplicados

La aplicación conserva un identificador propio de intención de compra, el resumen aprobado, su versión y las referencias de cotización/checkout disponibles.

Estados internos propuestos, distintos de los estados oficiales de Reap:

- Faltante detectado.

- Verificación pendiente o alternativas listas.

- Cotización pendiente o lista para revisión.

- Aprobación pendiente.

- Envío de checkout en curso.

- Resultado por confirmar.

- Prueba completada, rechazada o con error confirmado, según respuesta real.

Los valores externos se interpretan conforme a la documentación de ciclo de vida verificada durante implementación; no inventar equivalencias para códigos desconocidos.

Doble clic: bloquear el envío concurrente y reutilizar la misma intención y clave de idempotencia para el mismo intento autorizado, conforme al contrato de la API. Guardar referencias recibidas antes de actualizar la interfaz.

Timeout o respuesta incierta: mostrar «Resultado por confirmar»; si existe checkout ID, consultar su estado. No crear una nueva compra ni una nueva clave porque la primera respuesta tarde. Si no hay ID, reconciliar por mecanismos documentados antes de cualquier reintento. No asumir fallo ni éxito. No reintentar cotizaciones fallidas sin corregir la causa cuando la documentación lo prohíbe.

Recargar o volver desde la aprobación alojada recupera la misma intención. Una compra adicional requiere una intención y aprobación nuevas; el mandato puntual no se reutiliza para otro cargo.

## Criterios de aceptación

1. Detecta una unidad faltante únicamente después de mapear puertos, protocolos, cableado y accesorios por puesto bajo las premisas sintéticas; si la conexión directa o el inventario resuelve la necesidad, recomienda no comprar.

2. Todas las filas del inventario y fichas de esta demo se identifican como sintéticas.

3. Solo recomienda una opción si cada restricción obligatoria tiene evidencia; un atributo desconocido queda explícitamente sin verificar.

4. Filtra proveedores por aprobación empresarial y, para ejecutar sandbox, por disponibilidad real de integración.

5. Compara el presupuesto con el total completo de la cotización, no con el precio del producto.

6. Muestra al menos una alternativa descartada por presupuesto, una por falta de evidencia y otra por proveedor.

7. No permite iniciar checkout sin aprobación de la selección y condiciones vigentes.

8. Doble clic y recarga no crean intenciones nuevas ni envíos paralelos.

9. Un timeout permanece incierto hasta una comprobación fiable; nunca muestra éxito solo por volver a la página.

10. Diferencia visualmente inventario ficticio, simulación local y sandbox. No afirma recepción ni plazo de entrega.

## Cinco pruebas esenciales

Caso feliz: bajo las fichas y conexiones sintéticas descritas, una unidad faltante, A-01 con evidencia y total de 32 USD bajo límite de 40 USD; el usuario aprueba y la prueba concluye según consulta de estado. Se registra referencia solo si existe.

Sin compra necesaria: cambiar el tercer portátil por uno con salida HDMI que soporte el objetivo y conservar el cable HDMI compatible. El tercer puesto queda completo sin adaptador adicional. El sistema recomienda «No hace falta comprar», no cotiza ni inicia checkout.

Presupuesto: bajar el tope a 30 USD; A-01 deja de ser válida. El sistema presenta «No hay una opción verificada dentro del presupuesto» y permite revisar el límite o los requisitos. No compra A-02 solo por ser barata.

Compatibilidad desconocida: eliminar de la ficha del portátil el soporte DisplayPort Alt Mode. El diagnóstico físico sigue detectando el faltante, pero bloquea la recomendación comprable hasta verificar vídeo. Solicita la ficha exacta o revisión humana, sin afirmar que el adaptador funcionará.

Timeout: simular pérdida de respuesta al enviar checkout. Mantener intención y clave; evitar doble clic; consultar el checkout existente cuando se disponga de ID. Mostrar resultado incierto hasta resolver. Una simulación local del timeout se etiqueta como tal.

## Plan de implementación independiente por ejecutar

Arquitectura mínima propuesta:

- Interfaz con cinco vistas o pasos del mismo recorrido.

- Fixtures de inventario, fichas y catálogo ficticios en un módulo aislado.

- Motor determinista de cantidades y restricciones; el modelo puede interpretar texto y explicar, pero no inventar evidencia ni decidir si una regla desconocida se cumple.

- Servicio de cotización/pago con dos adaptadores claramente separados: simulación local y Reap sandbox.

- Persistencia mínima de intención, versión aprobada, claves y referencias para evitar duplicados y reanudar.

- Secretos exclusivamente en servidor y configuración nueva; no reutilizar credenciales o infraestructura de otros productos.

Orden propuesto para cuatro horas, condicionado a entorno y acceso disponibles:

- 0:00–0:30: proyecto independiente, fixtures, contratos y pruebas de cantidades/compatibilidad.

- 0:30–1:30: inventario, faltante, evidencia y alternativas.

- 1:30–2:30: cotización, aprobación y adaptador simulado; conectar sandbox solo si está realmente habilitado y autorizado.

- 2:30–3:15: estados, recuperación de intención y protección contra envíos duplicados.

- 3:15–4:00: ejecutar los cinco casos, revisar etiquetas y preparar demostración.

Sin credenciales, enrollment o catálogo confirmados, el entregable de cuatro horas sería un prototipo simulado honesto. No prometer integración funcional real dentro del plazo si esos prerrequisitos faltan.

Fuera del alcance inicial: compra multicomercio, varios destinos, urgencias y garantías de entrega, actualización automática de inventario físico, recurrencia, gestión de activos, soporte general de cualquier hardware y uso de datos de proyectos actuales.

## Integración Reap y cuestiones pendientes

La documentación de compras puntuales permite búsqueda/variante/cotización, revisión de envío y checkout, con consulta posterior de estado. También documenta idempotencia en solicitudes de cotización y checkout y simulación de checkout completado solo en sandbox. La aplicación mantiene aprobación humana explícita además de cualquier acción alojada requerida por Reap. Fuente: [Compras puntuales](https://docs.reap.global/agentic-payments/one-time-purchases).

Confirmar antes de integrar: acceso específico a Agentic Payments, enrollment activo, mandato apropiado, versión y host de API, retorno HTTPS, comercios y productos de prueba admitidos. El flujo externo por URL necesita aclaración: la guía lo describe para dominios autorizados y la FAQ habla de habilitación por cuenta y evolución del producto. No asumir disponibilidad. Fuentes: [Setup](https://docs.reap.global/agentic-payments/setup), [FAQ](https://docs.reap.global/agentic-payments/faq).

Esta entrega documenta el enfoque elegido y cómo demostrarlo. No solicita otra elección, no crea cuentas ni utiliza credenciales existentes, y no ejecuta compras.

