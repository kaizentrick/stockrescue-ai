(() => {
  const $ = (selector) => document.querySelector(selector);
  const post = async (path) => {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stockrescue-client": "local",
      },
      body: "{}",
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
  };
  $("#demo-reset").onclick = async () => {
    await post("/demo/reset");
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("stockrescue-demo-receipt-"))
        sessionStorage.removeItem(key);
    }
    location.reload();
  };
  $("#logout").hidden = true;
  $("#document-upload").hidden = true;
  const explanation = document.createElement("p");
  explanation.textContent =
    "Práctica: carga un documento de ejemplo ya estructurado, corrige sus datos y confirma. La extracción real de PDF e imágenes con Gemini está verificada en el entorno conectado; aquí no se usa IA externa.";
  const sample = document.createElement("button");
  sample.textContent = "Cargar recepción de ejemplo";
  sample.onclick = async () => {
    sample.disabled = true;
    try {
      await post("/demo/api/demo-document");
      window.dispatchEvent(
        new CustomEvent("stockrescue:view", { detail: "documents" }),
      );
    } catch (error) {
      $("#error").hidden = false;
      $("#error").textContent = error.message;
    } finally {
      sample.disabled = false;
    }
  };
  $("#document-upload").after(explanation, sample);
  $("#reminder-form [name=channel] option[value=whatsapp]")?.remove();
  $("#chat-form [name=message]").placeholder =
    "Prueba /inventario o /reporte (práctica sin IA)";
  fetch("/api/evidence")
    .then((response) => response.json())
    .then((evidence) => {
      const box = $("#demo-evidence");
      box.textContent = "";
      if (evidence.source !== "live")
        document.querySelector('a[href="/login"]')?.remove();
      const heading = document.createElement("p");
      heading.textContent =
        evidence.source === "live"
          ? "Estado leído del servidor conectado. Cada servicio conserva la hora de su última evidencia; no implica una nueva prueba ahora."
          : "Evidencia histórica del 9 de octubre de 2026, registrada en QA. Este Mac ejecuta únicamente la práctica; no está conectado a los proveedores.";
      box.append(heading);
      for (const integration of evidence.integrations) {
        const item = document.createElement("p");
        item.textContent = `${integration.provider}: ${integration.status}${integration.at ? " · " + new Date(integration.at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" }) + " CDMX" : ""}`;
        box.append(item);
      }
      for (const operation of evidence.operations) {
        const item = document.createElement("p");
        item.textContent = `Reap sandbox: ${operation.status} · $${(operation.total / 100).toFixed(2)} MXN · mismo checkout ${operation.checkoutId}. PROCESSING no acredita una compra completada. La práctica permite explorar el resultado simulado sin repetir esa compra.`;
        box.append(item);
      }
    })
    .catch(() => {
      $("#demo-evidence").textContent =
        "No se pudo consultar la evidencia. Revisa QA en el repositorio.";
    });
})();
