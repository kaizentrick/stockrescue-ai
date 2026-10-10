# Entorno del agente de WhatsApp

Este trabajo prepara la integración de Google AI Studio (Gemini API) y Meta WhatsApp Cloud API como complemento de StockRescue. Se desarrolla sobre `cx/stockrescue-mvp` y se revisa en un PR separado del MVP.

## Alcance acordado

- Configuración validada mediante variables de entorno, sin llaves en Git.
- Cliente de Gemini para preguntas sobre inventario, reposiciones, pedidos y reportes.
- Cliente de WhatsApp, verificación del webhook y procesamiento de mensajes.
- Preview con cantidades calculadas y cotización del SaaS; confirmación humana de ese snapshot.
- Preparación de alertas de inventario usando plantillas de Meta.
- Pruebas de contrato sin credenciales ni tráfico autenticado.

No se provisionan cuentas, números, plantillas ni despliegues. La puesta en marcha requiere la llave de AI Studio, configuración de Meta y callback HTTPS del operador.

El cálculo, presupuesto, cotización e idempotencia proceden de StockRescue. Gemini no recibe herramientas para ejecutar compras. El entorno inicial corresponde a una sola tienda y reutiliza el servicio local, sin inventar una integración multitenant o un ERP nuevo.
