# Plan de demo y pruebas

Fuente: https://chatgpt.com/space/page_a1690f3a7be081918522344fc6e64af3

Creación: 2026-10-09T22:19:15.355441Z  
Última modificación en Space: 2026-10-09T22:19:37.778106Z  
Exportación UTC: 2026-10-10T00:58:50.522215+00:00  
Página padre: page_6ac9681f593081919017833102c3d2c7  
Secuencia de origen: 1

---

Plan propuesto para una primera demo de cuatro horas de trabajo. La duración es una estimación de ejecución desde el inicio del desarrollo; no establece una fecha límite del evento. Este plan no implica que la app esté construida.

## Resultado demostrable

Un empleado ficticio solicita una compra; el sistema muestra la política aplicada, permite que una persona responsable la apruebe o rechace y registra el resultado. La ejecución integrada solo se demuestra si el sandbox propio está disponible y verificado. Cualquier simulación se identifica claramente.

## Preparación antes del desarrollo

- [ ] Crear un repositorio nuevo y separado.

- [ ] Elegir entorno y configuración exclusivos del proyecto.

- [ ] Confirmar habilitación de Agentic Payments y credenciales sandbox mediante un canal seguro.

- [ ] Verificar enrollment ACTIVE, comercio de prueba y retorno HTTPS.

- [ ] Definir un único caso de compra y una moneda.

- [ ] Preparar personas, proveedor, presupuesto y solicitudes completamente ficticios.

No almacenar contraseñas, claves, tokens, datos de tarjetas ni documentos de identidad en este Space.

## Secuencia de cuatro horas

| Tramo | Trabajo propuesto | Evidencia de salida |
| --- | --- | --- |
| 0 a 30 minutos | Fijar caso de demo, condiciones del sandbox y datos ficticios | Guion, decisión sobre integración o simulación y límites explícitos |
| 30 a 90 minutos | Construir solicitud, validación determinista de política y vista de aprobación | Solicitud aceptada o rechazada con motivos visibles |
| 90 a 150 minutos | Conectar un adaptador sandbox cuando los requisitos estén verificados | Un intento trazable con estado real, o simulación claramente rotulada |
| 150 a 210 minutos | Añadir bitácora y probar duplicados, cambios de importe y resultados inciertos | Registro por solicitud y pruebas de las rutas principales |
| 210 a 240 minutos | Ensayar demo, corregir fallos críticos y preparar explicación | Recorrido repetible y lista honesta de límites |

## Escenario ficticio

El equipo tiene un presupuesto de prueba y un empleado pide una compra única a un proveedor permitido. La aprobación debe mostrar artículo, proveedor, importe total, moneda y responsable. Las cifras se eligen al conocer el comercio de demostración y no representan un compromiso de gasto.

La segunda solicitud excede el presupuesto o usa un proveedor no autorizado. Se rechaza con una razón concreta y no se genera un intento de compra.

## Criterios de aceptación

- [ ] La solicitud y la aprobación apuntan al mismo artículo, proveedor, importe y moneda.

- [ ] Un cambio material invalida la aprobación anterior.

- [ ] Una solicitud rechazada no inicia un pago.

- [ ] Un doble clic o reintento no crea una segunda compra lógica.

- [ ] Un error o timeout no se muestra como pago confirmado.

- [ ] La pantalla diferencia estados locales, estados del proveedor y simulación.

- [ ] La bitácora permite reconstruir qué se pidió, qué regla se evaluó, quién decidió y qué resultado se recibió.

- [ ] No aparecen secretos en interfaz, registros ni entregables.

- [ ] Los casos de prueba usan recursos nuevos y datos ficticios.

## Límites de la primera versión

Una organización ficticia, una política, una persona aprobadora y una compra única. Quedan para evaluación posterior las suscripciones, compras recurrentes, cambios de moneda, reembolsos, contabilidad y facturación fiscal. La independencia respecto de los proyectos actuales se mantiene.

## Decisiones pendientes

1. Confirmar recursos sandbox propios y disponibles.

2. Elegir el proveedor y caso de compra de la demo.

3. Elegir el entorno de desarrollo y la tecnología del proyecto nuevo.

4. Confirmar con los organizadores requisitos de entrega y horarios específicos antes de tratarlos como compromisos.
