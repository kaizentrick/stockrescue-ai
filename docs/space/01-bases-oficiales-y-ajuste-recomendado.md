# Bases oficiales y ajuste recomendado

Fuente: https://chatgpt.com/space/page_24daae195c788191ba0c8b9e19b7a1ad

Creación: 2026-10-10T00:34:40.536335Z  
Última modificación en Space: 2026-10-10T00:58:14.545173Z  
Exportación UTC: 2026-10-10T00:58:50.522215+00:00  
Página padre: page_6ac9681f593081919017833102c3d2c7  
Secuencia de origen: 1

---

Contraste del enfoque elegido con las bases de Reap × AI Builders México, revisadas el 9 de octubre de 2026, hora de Ciudad de México. La elección vigente sigue siendo equipar un equipo y resolver un faltante. El ajuste descrito aquí es una recomendación para valorar; no una nueva elección aprobada ni una implementación realizada.

## Qué cambian las bases oficiales

La guía desaconseja los chatbots genéricos que buscan, muestran y compran, y pide ir más allá del ejemplo de comprar sillas a proveedores aprobados. El proyecto necesita mostrar un problema concreto y una intervención útil del agente, con pagos en el centro.

Reglas verificadas:

- Es obligatorio utilizar Agentic, directamente con Reap API o mediante el wallet module que lo incluye. Cards Issuing es opcional.

- Todo funciona en sandbox, sin dinero real.

- Solo se permiten comercios de la lista del bot de Telegram, consultada con /merchants.

- No se permite sustituir Agentic con scraping del checkout ni entregar datos crudos de tarjeta al modelo.

- Viajes y categorías restringidas quedan fuera.

- No hay builder kit; se trabaja con la documentación.

- Most Worthwhile Problem incorpora Best Use of Latest Technology. El track onchain es distinto y no es necesario para esta propuesta.

Fuente: [Guía oficial y APIs](https://aibuilders.mx/reap#apis).

## Encaje del producto y riesgo de parecer genérico

Un formulario de compra con catálogo y aprobación podría quedarse demasiado cerca de lo que las bases desaconsejan. Tener inventario o reglas no demuestra por sí solo originalidad, valor comercial o una buena experiencia agéntica.

El valor a demostrar sería que el sistema identifica por qué un puesto no puede funcionar, comprueba lo disponible, evita compras innecesarias y ejecuta una resolución autorizada únicamente cuando hay evidencia suficiente. Esto mantiene el foco en el resultado operativo del usuario.

La investigación de mercado permanece vigente: no se ha demostrado demanda específica, disposición a pagar ni rentabilidad. El encaje con un premio no sustituye esa validación.

## Ajuste recomendado por valorar

**Recuperar un puesto bloqueado**, usando un ticket de incidencia como entrada. Esta formulación es una recomendación para concretar el enfoque que el usuario ya eligió; todavía no reemplaza su especificación aprobada.

Recorrido propuesto:

1. Un ticket explica qué necesita hacer la persona y qué le impide hacerlo.

2. El agente relaciona modelo, puertos, protocolos, cableado e inventario y muestra evidencia del diagnóstico.

3. Primero intenta resolver con equipo disponible o conexión directa. Si sirve, concluye sin comprar.

4. Si falta una pieza, propone únicamente alternativas técnicamente verificadas, dentro del presupuesto y de un comercio de la lista real admitida.

5. Presenta cotización completa y solicita aprobación de sus condiciones exactas.

6. Ejecuta Agentic en sandbox y consulta el resultado, conservando intención y clave de idempotencia ante timeout.

7. Actualiza el ticket a «Pedido de prueba confirmado; instalación pendiente» solo cuando el resultado sandbox lo permita. No lo declara reparado, entregado ni instalado.

La frontera importante es pedido frente a solución física: un checkout confirmado no demuestra que la persona pueda trabajar de nuevo. El cierre real del incidente requeriría recepción, instalación y comprobación humana fuera de esta demo.

## Estado técnico confirmado y pendiente

- **Recibidas, no probadas:** API key de equipo y tarjeta TEST facilitadas en el correo de organización. No se reproducen sus valores ni el cuerpo del correo en este Space.

- **Referencia técnica:** base https://sg.sandbox.api.reap.global y Reap-Version 2025-02-14. Deben comprobarse con el acceso concreto antes de llamar funcional a la integración.

- **Recibida y leída:** lista de referencia de merchants aportada por el usuario. [Catálogo y candidatos de prueba](https://chatgpt.com/space/page_cd686f9234788191a5069b6720bf028b). Pendientes la disponibilidad efectiva por API, compatibilidad, cotización y prueba con la cuenta sandbox.

- **Pendiente:** habilitación y permisos efectivos de Agentic, enrollment ACTIVE, flujo de mandato, retorno HTTPS y una operación de prueba observada.

- **Confirmado por las bases:** no habrá builder kit; no debe seguir tratándose como una entrega pendiente.

- **Sin ejecutar:** creación de app, registro de cuentas, checkout, envío del proyecto y cambios de producción.

La entrega de credenciales no acredita integración operativa y no autoriza copiarlas a documentación, navegador cliente, logs o prompts. La tarjeta TEST sigue siendo material que no debe recibir el modelo.

Referencias: [API de creación de checkout](https://docs.reap.global/api-reference/agentic/create-checkout), [Setup](https://docs.reap.global/agentic-payments/setup). La fecha de expiración procede de la comunicación del organizador verificada en la conversación.

## Horarios y vigencia

Todos los horarios siguientes corresponden a Ciudad de México, UTC−6:

- **Entrega del proyecto:** sábado 10 de octubre de 2026 a las 21:00, equivalente al domingo 11 a las 03:00 UTC.

- **Expiración comunicada del acceso de prueba:** domingo 11 de octubre de 2026 a las 00:00, equivalente a las 06:00 UTC. Es el inicio del domingo, no su final.

- **Plan de cuatro horas:** es una estimación de trabajo para la demo, no el plazo oficial de entrega.

- **Puertas del evento:** viernes 9 a las 17:00 según invitación; tampoco es el cierre de entrega.

El formulario oficial seguía aceptando entregas en la revisión. Ese estado puede cambiar; hay que volver a comprobarlo antes de enviar.

## Entrega oficial y controles antes de enviar

[Formulario oficial de entrega](https://gavel-65labs.vercel.app/submit/74oz5tv1cfzllzh392gy1rqzvx4m1vop).

La revisión del formulario identifica datos del equipo, capitán y correo, enlace de proyecto, video de demo, descripción de hasta 5.000 caracteres y selección de hasta dos tracks. La entrega queda bloqueada tras enviar, por lo que conviene revisar el contenido final antes del envío.

Checklist de preparación:

- [ ] Con la lista de referencia ya recibida, verificar por API el comercio y elegir un artículo técnicamente compatible y disponible para el sandbox.

- [ ] Decidir si se adopta la formulación propuesta del puesto bloqueado.

- [ ] Demostrar al menos un recorrido real con Agentic sandbox para acreditar el requisito; una simulación local por sí sola no demuestra esa integración.

- [ ] Preparar una demo que distinga diagnóstico, aprobación, pedido y recepción pendiente.

- [ ] Incluir el caso sin compra y el caso de resultado incierto sin duplicación.

- [ ] Elegir el track según el producto realmente construido, sin añadir onchain únicamente por apariencia.

- [ ] Preparar enlaces, video y descripción sin secretos ni afirmaciones de mercado no demostradas.

- [ ] Revisar campos y permisos de los enlaces y obtener autorización de envío.

No se ha enviado el formulario. El análisis de conveniencia no implica autorización para registrar, pagar o presentar el proyecto.
