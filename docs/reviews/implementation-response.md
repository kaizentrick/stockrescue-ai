# Respuesta de implementación a las revisiones

10 de octubre de 2026. Los documentos `gtm.md` y `pmf.md` son fuentes completas e inmutables del hilo padre; sus SHA-256 se conservan. Esta respuesta describe cambios posteriores del prototipo local, no validación comercial ni integración Reap real.

| Especialidad | Hallazgo o recomendación | Respuesta verificable |
|---|---|---|
| GTM | Centrar el valor en la decisión técnica, incluidas las rutas sin compra | La interfaz abre con pantalla sin conexión y evidencia del puesto. P-01 usa HDMI directo y P-02 reutiliza; no pueden buscar ni ejecutar una compra. No se atribuyen ahorros, clientes ni demanda pagadora. |
| PMF | Verificar la cadena completa y abstenerse cuando falta evidencia | Puertos y protocolos por puesto; cable con conectores, protocolo y frecuencia estructurados. Accesorio 30 Hz descartado ante objetivo 60 Hz; datos desconocidos producen NEEDS_INFO. |
| PMF | Ligar gasto a diagnóstico, variante y condiciones exactas | Quote incluye `evidenceHash` de hardware, diagnóstico y versión de reglas; aprobación SHA-256 del snapshot completo. Cambios de evidencia, cotización o vigencia bloquean checkout. Prueba de regresión en `service.test.ts`. |
| UX/contenido | El resultado operativo quedaba después del diagnóstico histórico | Pendiente/confirmado/fallido al inicio y diagnóstico etiquetado como previo; la incidencia queda abierta y la instalación pendiente. Revalidación de 9ff255e sin mayores abiertos en alcance observado. |
| UI/espaciado | Jerarquía del estado y separación del título móvil | Dossier continuo, estado prioritario, título separado y objetivos de interacción de 44 px. Revalidación visual en escritorio y móvil; anchos de capturas finales comprobados. |
| Accesibilidad/interacción | Pérdida de respuesta permitía seguir comprando y aprobación vencida quedaba visible | Incertidumbre persistida por sesión; consulta del expediente antes de continuar. Vencimiento retira aprobación y checkout; servidor vuelve a comprobar. Exportación con objetivo de 44 px. Sin mayores abiertos en revalidación observada. |
| Fiabilidad/seguridad | Caída después de reservar podía dejar pendiente perpetuo | Recuperación explícita de la misma operación y clave; no crea otra reserva. Guards evitan aplicar respuesta tardía sobre un intento distinto o finalizado. |
| Fiabilidad/seguridad | Nombre del cable se trataba como evidencia suficiente | Se exige `cableSpec` estructurado y cadena compatible. Pruebas para cable desconocido, solo datos y 30 Hz. |

## Límites conservados

- Edición libre de inventario, documentación de fabricantes y validación física quedan fuera del MVP de fixtures. Se puede elegir escenario documentado/desconocido y cancelar un reporte, pero no corregir arbitrariamente modelos desde la interfaz.
- La hoja oficial de merchants es contexto documental, no evidencia de habilitación API, stock, compatibilidad ni cotización. El catálogo utilizado sigue siendo sintético.
- No hay usuarios corporativos, roles separados de aprobación, servicio público, recepción ni cierre físico de incidencia. La demo identifica al aprobador como sesión local.
- No hay pilotos, entrevistas, outreach, precio comercial validado, cobros ni afirmaciones de PMF. Las propuestas de GTM/PMF son tareas disponibles para elegir, no compromisos asignados a Josmar.
- Transporte Reap server-side con pruebas de contrato usando fetch falso. Activar integración requiere entrada segura de credencial específicamente autorizada y completar los gates de `REAP-INTEGRATION.md`.

Ver [QA](../QA.md) para pruebas, matriz de anchos y límites de la revisión de accesibilidad.
