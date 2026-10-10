# Contribuir a StockRescue

Consultar [alcance actual](README.md), [arquitectura](docs/ARCHITECTURE.md) y [trabajo pendiente](docs/TASKS.md) antes de editar. La rama de evolución del MVP es `cx/stockrescue-mvp`; coordinar la base de cada cambio y usar el prefijo `cx/` para nuevas ramas.

1. Acordar alcance y archivos al trabajar en paralelo. Revisar cambios locales y remotos antes de escribir o publicar.
2. Mantener cambios enfocados; no hacer force push ni sobrescribir trabajo ajeno.
3. Presentar un PR con problema, comportamiento resultante, pruebas y límites reales. El merge sigue el acuerdo del equipo.
4. Ejecutar `npm run check` y `npm run build`. Si cambia la interfaz, verificar recorrido y ancho móvil; registrar evidencia en los documentos existentes de QA.
5. Validar por separado práctica y sandbox. Un resultado mock no prueba Reap; un adaptador implementado tampoco prueba un checkout remoto.
6. No incluir llaves, PAN/CVV, OTP, enlaces privados de autorización, archivos `.env`, bases locales ni información de personas.

Las pruebas automatizadas usan datos sintéticos y transportes de prueba. La validación remota permanece en sandbox y dentro del alcance autorizado. No habilitar producción ni ocultar fallos remotos con respuestas mock.

## Invariantes

- Cantidad de compra y unidades recibidas tienen conversión explícita.
- Pedidos abiertos cuentan para evitar sobrecompra; pagar no incrementa existencias.
- La aprobación corresponde al total final vigente y se invalida al cambiar datos o cotización.
- Presupuesto e idempotencia se comprueban en servidor, independientemente de los botones.
- Un resultado incierto se consulta con el intento persistido; un timeout no genera otra compra.
- Recepciones parciales y repetidas no incrementan stock dos veces.

## Higiene

Reutilizar documentos y convenciones existentes. Los temporales van en `.tmp/codex/` y se eliminan al finalizar. No agregar informes duplicados ni entornos con valores privados. Conservar `package-lock.json` y las licencias de dependencias.

Los paquetes `docs/space/`, `docs/pitch/` y `docs/reviews/` preservan el proyecto anterior y sus hashes. Documentar la transición en [SPACE-STATUS.md](docs/SPACE-STATUS.md) sin modificar retroactivamente esos originales.
