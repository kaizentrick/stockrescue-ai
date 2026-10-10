const $ = (id) => document.getElementById(id);
let state,
  current,
  busy = false;
const uncertain = new Set(
  JSON.parse(sessionStorage.getItem("uncertain-checkouts") || "[]"),
);
const rememberUncertain = () =>
  sessionStorage.setItem("uncertain-checkouts", JSON.stringify([...uncertain]));
const operationLabel = {
  PENDING: "Pendiente de verificación",
  COMPLETED: "Pedido confirmado; instalación pendiente",
  FAILED: "Compra fallida",
  EXPIRED: "Checkout vencido",
};
const eventLabel = {
  REPORTED: "Reporte registrado",
  DIAGNOSED: "Diagnóstico completado",
  QUOTED: "Cotización final",
  APPROVED: "Aprobación registrada",
  RESERVED: "Presupuesto reservado",
  PENDING: "Verificación pendiente",
  RECONCILED: "Resultado verificado",
  CANCELED: "Reporte cancelado",
  RETRY_PREPARED: "Nuevo intento preparado",
  CHECKOUT_COMPLETED: "Pedido simulado confirmado",
  CHECKOUT_FAILED: "Compra fallida",
  CHECKOUT_EXPIRED: "Checkout vencido",
};
const money = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n / 100,
  );
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (v) =>
  new Date(v).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
async function api(path, data) {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: data
      ? { "Content-Type": "application/json", "X-Workplace-Client": "local" }
      : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
function button(action, text, primary = false) {
  return `<button type="button" data-action="${action}" class="${primary ? "primary" : ""}">${esc(text)}</button>`;
}
function render() {
  const w = state.workplaces.find((w) => w.id === $("workplace").value);
  current =
    state.cases.find((c) => c.workplace.id === w.id && !c.canceled) ||
    state.cases.find((c) => c.workplace.id === w.id);
  $("inventory-summary").textContent =
    `${w.id} · Objetivo: 4K a ${w.requiredHz4k} Hz`;
  const c = current,
    d = c?.diagnosis,
    q = c?.quote,
    op = c?.operation;
  const quoteActive = !!q && Date.parse(q.expiresAt) > Date.now();
  const approvalActive = c?.approvalValid && quoteActive;
  const unknownSend = c && uncertain.has(c.id);
  const ports = (arr) =>
    arr
      .map(
        (p) =>
          `${p.connector} · ${{ HDMI: "HDMI", DP_ALT: "DisplayPort Alt Mode", DATA_ONLY: "Solo datos, sin vídeo", UNKNOWN: "Protocolo por confirmar" }[p.protocol]}${p.maxHz4k ? " · " + p.maxHz4k + " Hz en 4K" : ""}`,
      )
      .join("; ");
  const equipment = c?.workplace || w;
  let html = `<p class="meta">${esc(w.id)} / ${esc(w.name)} · Incidencia abierta</p><h2>Pantalla sin conexión</h2><p>Comprueba la ruta de vídeo antes de autorizar un gasto. La instalación se verifica físicamente después.</p>`;
  if (unknownSend)
    html += `<div class="decision"><h3>Envío pendiente de verificación</h3><p>Se perdió la conexión. No se conoce el resultado del envío. Conservamos el expediente; consulta su estado antes de continuar.</p><div class="actions">${button("recover", "Consultar expediente", true)}</div></div>`;
  else if (op)
    html += `<div class="decision"><h3>${esc(operationLabel[op.status])}</h3><p>${esc(op.note)}</p>${op.status === "PENDING" ? `<div class="actions">${button("reconcile", "Consultar mismo intento", true)}</div>` : ""}<p>Incidencia abierta; instalación y comprobación física pendientes.</p></div>`;
  if (!c || c.canceled) {
    html += `<div class="field-row"><div><label for="scenario">Evidencia del reporte</label><select id="scenario"><option value="normal">Puertos y capacidades documentados</option><option value="unknown">USB-C sin protocolo confirmado</option></select></div><div><label for="budget">Límite del puesto (MXN)</label><input id="budget" type="number" min="0" max="1000" step="1" value="500"></div></div><div class="actions">${button("report", "Reportar y diagnosticar", true)}</div>`;
    if (c?.canceled)
      html +=
        "<p>Expediente anterior cancelado antes de comprar. Puedes crear otro reporte.</p>";
  }
  if (d)
    html += `<div class="${op || unknownSend ? "section" : "decision"}"><h3>${op || unknownSend ? "Diagnóstico previo: " : ""}${esc(d.title)}</h3>${d.reasons.map((r) => `<p>${esc(r)}</p>`).join("")}</div>`;
  html += `<h3>Conexiones documentadas</h3><div class="table-scroll" role="region" aria-label="Inventario del puesto" tabindex="0"><table class="equipment"><caption>Datos sintéticos del puesto seleccionado; no especificaciones comerciales.</caption><thead><tr><th scope="col">Equipo</th><th scope="col">Modelo fixture</th><th scope="col">Puerto y capacidad</th></tr></thead><tbody><tr><td>Portátil</td><td>${esc(equipment.laptop)}</td><td>${esc(ports(equipment.outputs))}</td></tr><tr><td>Monitor</td><td>${esc(equipment.monitor)}</td><td>${esc(ports(equipment.inputs))}</td></tr><tr><td>Cable existente</td><td>Fixture de cable</td><td>${esc(equipment.cable)}</td></tr></tbody></table></div><p class="scroll-hint">Si la tabla no cabe, desplázala horizontalmente.</p>`;
  if (d)
    html += `<h3>Alternativas evaluadas</h3><div class="table-scroll" role="region" aria-label="Alternativas de conexión" tabindex="0"><table class="alternatives"><thead><tr><th scope="col">Ruta</th><th scope="col">Resultado</th></tr></thead><tbody>${d.alternatives.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.result)}</td></tr>`).join("")}</tbody></table></div>`;
  if (c && !c.canceled && !op && !unknownSend) {
    html += '<div class="actions">';
    if (!d) html += button("diagnose", "Diagnosticar", true);
    if (d?.decision === "BUY" && !q)
      html += button("quote", "Buscar variante y cotizar", true);
    html += button("cancel", "Cancelar reporte");
    html += "</div>";
  }
  if (q) {
    html += `<section class="section quote"><h3>Cotización final · fixture</h3><p>${esc(q.product)}</p><dl><dt>Variante</dt><dd>${esc(q.variantId)} · ${q.quantity} unidad</dd><dt>Proveedor</dt><dd>${esc(q.merchant)} (ficticio)</dd><dt>Destino</dt><dd>${esc(q.destination)}</dd><dt>Entrega</dt><dd>${esc(q.delivery)}</dd><dt>Componente</dt><dd class="amount">${money(q.subtotal)}</dd><dt>Envío</dt><dd class="amount">${money(q.shipping)}</dd><dt>Impuestos</dt><dd class="amount">${money(q.tax)}</dd><dt class="total">Total MXN</dt><dd class="amount total">${money(q.total)}</dd><dt>Presupuesto</dt><dd class="amount">${money(c.budget)}</dd><dt>Vence</dt><dd>${date(q.expiresAt)}</dd></dl><p class="reference">Cotización: ${esc(q.id)}<br>Snapshot: ${esc(c.quoteHash)}</p>`;
    if (!op && !c.canceled && !unknownSend) {
      html += `<p>${approvalActive ? "Aprobación vigente para este snapshot." : !quoteActive ? "Cotización vencida. Solicita otra y vuelve a aprobar." : c.approval ? "Esta aprobación ya no es válida. Recotiza y vuelve a aprobar." : "Sin aprobación vigente. Una nueva cotización invalida cualquier aprobación anterior."}</p><div class="actions">${!approvalActive && quoteActive ? button("approve", `Aprobar compra simulada por ${money(q.total)} MXN`, true) : ""}${button("quote", "Solicitar nueva cotización")}</div>`;
      if (approvalActive)
        html += `<label for="outcome">Escenario de checkout mock</label><select id="outcome"><option value="completed">Confirmación normal</option><option value="timeout">Timeout después de enviar</option><option value="failed">Fallo definitivo</option><option value="expired">Checkout vencido</option></select><div class="actions">${button("checkout", "Ejecutar checkout simulado", true)}</div>`;
    }
    html += "</section>";
  }
  if (op) {
    html += `<section class="section"><h3>Resultado de compra</h3><p class="status-text">${esc({ PENDING: "Pendiente de verificación", COMPLETED: "Pedido confirmado; instalación pendiente", FAILED: "Compra fallida", EXPIRED: "Checkout vencido" }[op.status])}</p><p>${esc(op.note)}</p><p class="reference">Operación: ${esc(op.key)}${op.orderId ? `<br>Pedido: ${esc(op.orderId)}` : ""}</p>${op.finalAmount ? `<p>Total confirmado: ${money(op.finalAmount)} MXN</p>` : ""}${op.status === "PENDING" ? `<p>La reserva sigue activa. Usa la consulta del inicio del expediente; no inicies otra compra.</p>` : ""}${["FAILED", "EXPIRED"].includes(op.status) ? '<p>La reserva quedó liberada. Revisa la causa antes de preparar un nuevo intento con cotización y aprobación nuevas.</p><div class="actions">' + button("retry", "Preparar nuevo intento") + "</div>" : ""}<p>Incidencia: abierta. Falta conectar y comprobar imagen a 4K/60 Hz.</p></section>`;
  }
  if (c)
    html += `<section class="section"><h3>Bitácora del expediente</h3><p class="reference">${esc(c.id)}</p><a class="plain-link" href="/api/cases/${esc(c.id)}" download="expediente-${esc(w.id)}.json">Descargar expediente JSON</a><ol class="audit">${c.audit.map((a) => `<li><time>${date(a.at)}</time><strong>${esc(eventLabel[a.event] || a.event)}</strong><p>${esc(a.detail)}</p></li>`).join("")}</ol></section>`;
  $("content").innerHTML = html;
}
async function refresh() {
  state = await api("/api/bootstrap");
  render();
}
$("workplace").addEventListener("change", () => {
  render();
  $("notice").textContent = `Puesto ${$("workplace").value} seleccionado.`;
  $("error").textContent = "";
});
$("content").addEventListener("click", async (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target || busy) return;
  busy = true;
  target.disabled = true;
  $("content").setAttribute("aria-busy", "true");
  $("error").textContent = "";
  const action = target.dataset.action;
  const activeId = current?.id;
  try {
    if (
      ["approve", "checkout"].includes(action) &&
      Date.parse(current.quote.expiresAt) <= Date.now()
    ) {
      await refresh();
      throw new Error("Cotización vencida. Solicita otra y vuelve a aprobar.");
    }
    if (action === "recover") {
      await api(`/api/cases/${activeId}`);
      uncertain.delete(activeId);
      rememberUncertain();
    } else if (action === "report") {
      current = await api("/api/cases", {
        workplaceId: $("workplace").value,
        scenario: $("scenario").value,
        budget: Number($("budget").value) * 100,
      });
      await api(`/api/cases/${current.id}/diagnose`, {});
    } else if (action === "retry") {
      await api(`/api/cases/${current.id}/retry`, {});
    } else
      await api(
        `/api/cases/${current.id}/${action}`,
        action === "approve"
          ? { hash: current.quoteHash }
          : action === "checkout"
            ? { outcome: $("outcome").value }
            : {},
      );
    await refresh();
    $("notice").textContent =
      action === "quote"
        ? "Cotización actualizada. La aprobación anterior queda invalidada."
        : action === "cancel"
          ? "Reporte cancelado; no se envió compra."
          : "Expediente actualizado.";
    $("dossier").focus();
  } catch (error) {
    if (action === "checkout") {
      uncertain.add(activeId);
      rememberUncertain();
      try {
        await refresh();
      } catch {
        render();
      }
      $("notice").textContent =
        "Resultado de envío sin verificar. Consulta el expediente; no se creará otra compra.";
    }
    $("error").textContent =
      error instanceof TypeError
        ? "Sin conexión con el servidor local. Conservamos el expediente; vuelve a consultar cuando se recupere."
        : error instanceof Error
          ? error.message
          : "No se pudo conectar. Revisa la conexión y consulta el expediente antes de repetir una compra.";
    target.disabled = false;
  } finally {
    busy = false;
    $("content").removeAttribute("aria-busy");
  }
});
async function init() {
  try {
    state = await api("/api/bootstrap");
    $("workplace").innerHTML = state.workplaces
      .map((w) => `<option value="${w.id}">${w.id} · ${esc(w.name)}</option>`)
      .join("");
    render();
    if (location.search.includes("return="))
      $("notice").textContent =
        "Retorno sin verificar. El navegador no acredita un pedido; consulta el mismo intento.";
  } catch {
    $("content").textContent =
      "No se pudo cargar el servidor local. Inicia npm start y recarga esta página.";
  }
}
setInterval(() => {
  if (
    !busy &&
    current?.approvalValid &&
    current.quote &&
    Date.parse(current.quote.expiresAt) <= Date.now() &&
    !current.operation
  ) {
    current.approvalValid = false;
    render();
    $("notice").textContent =
      "La cotización venció. Aprobación invalidada; solicita otra cotización.";
  }
}, 1000);
init();
