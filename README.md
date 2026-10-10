# Reap Workplace Agent

MVP independiente para el hackathon Reap. Un responsable de TI reporta una pantalla sin conexión; el agente comprueba puertos y capacidades, propone reutilizar o conectar directamente y solo busca una compra cuando hace falta. **Un pedido confirmado no significa instalación ni incidencia resuelta.**

**Estado: simulación local funcional.** Inventario, catálogo, compatibilidad, precios, proveedores y pedidos son fixtures sintéticos. No se ha completado una integración real con Reap. No hay llaves, tarjetas ni llamadas a servicios de IA.

## Inicio rápido

Requiere Node.js 24 o superior y npm.

```sh
npm ci
npm run check
npm start
```

Abrir http://127.0.0.1:4317. No se necesita archivo `.env`. El servidor escucha exclusivamente en loopback; no publicarlo. Persistencia en `.data/workplace.sqlite`, excluida de Git. La interfaz permite exportar cada expediente JSON. No borrar la base mientras haya un intento pendiente.

```sh
npm run dev        # reinicia servidor al editar TypeScript
npm run lint
npm run typecheck
npm test
npm run build      # comprobación TypeScript; no requiere bundle
```

## Demo

| Puesto | Evidencia fixture | Decisión |
|---|---|---|
| P-01 | HDMI 2.0 de origen y destino, cable disponible | Conexión directa, no compra |
| P-02 | USB-C DP Alt, monitor HDMI, A-01 asignado 4K/60 | Reutilización, no compra |
| P-03 | USB-C DP Alt 4K/60; A-02 libre solo 4K/30 | Adaptador mínimo compatible |

P-03 admite una variante de reporte sin protocolo conocido que bloquea compra. Se puede limitar presupuesto, cancelar antes del envío, recotizar para invalidar aprobación, simular fallo/expiración o timeout y consultar el mismo intento. Después de un fallo definitivo, preparar otro intento exige cotización y aprobación nuevas. El mock conserva idempotencia tras reiniciar.

## Seguridad y límites

- Presupuesto reservado en transacción SQLite, clave por operación persistida antes del envío, doble clic/concurrencia sin duplicar.
- Aprobación SHA-256 ligada a la cotización completa: variante, merchant, cantidad, destino, envío, importes, moneda y vencimiento.
- Timeout conserva reserva y estado pendiente. Los parámetros de retorno no marcan éxito.
- Motor de reglas sobre fixtures; no pretende resolver hardware arbitrario, ni fallos de controladores.
- Sesión local de un solo operador; sin autenticación corporativa. No es un producto listo para publicar.
- `src/reap.ts` contiene el transporte server-side preparado para configuración segura y mapeo posterior. La UI no lo activa. Ver [integración y bloqueos](docs/REAP-INTEGRATION.md).

## Trabajo conjunto

`main` conserva la base documental; implementación en `feat/local-mvp`, mediante PR en borrador. No hacer force push ni fusionar automáticamente. Josmar elige entre interfaz, QA, negocio o demo; no se presupone su especialidad.

- [Contribuir](CONTRIBUTING.md) y [tablero](docs/TASKS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Integración Reap y fuentes oficiales](docs/REAP-INTEGRATION.md)
- [Guion de demo](docs/DEMO-SCRIPT.md)
- [Dirección visual](docs/DESIGN.md) y [evidencia de QA](docs/QA.md)
- [Referencias de merchants](docs/MERCHANTS.md)

No se utiliza código, datos, diseños ni cuentas de producto de otros proyectos. Nombre comercial y demanda pagadora pendientes. La candidatura y el video los envía el usuario.

## Documentación compartida

[Índice completo del Space](docs/space/README.md): 8 páginas y anexo con 152 merchants, exportados íntegramente con fuentes, fechas y SHA-256. Los textos son una instantánea y conservan el estado aprobado/propuesto de su fecha. [Estado de implementación posterior](docs/SPACE-STATUS.md).
