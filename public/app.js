const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    (v ?? 0) / 100,
  );
const number = (v) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v ?? 0);
const date = (v) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
let state,
  selected = "CAFE-250",
  view = "inventory",
  csv = "",
  approvalId = "",
  busy = false;
const labels = {
  REORDER: "Reponer",
  ENOUGH: "Suficiente",
  NO_DEMAND: "Sin consumo",
  INCOMING: "En camino",
  CAPACITY: "Revisar capacidad",
};
function notify(text, error = false) {
  const el = $(error ? "#error" : "#notice");
  el.textContent = text;
  el.hidden = !text;
  if (error) $("#notice").hidden = true;
}
async function api(path, data) {
  const response = await fetch(path, {
    method: data === undefined ? "GET" : "POST",
    headers:
      data === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            "X-StockRescue-Client": "local",
          },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "El servidor no respondió. Tus datos guardados siguen disponibles al reconectar.",
    );
  }
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}
async function run(fn, message, form) {
  if (busy) return;
  let succeeded = false;
  busy = true;
  document.body.classList.add("busy");
  $("#error").hidden = true;
  if (form) form.querySelector(".form-error").textContent = "";
  const buttons = [...document.querySelectorAll("button")];
  const disabled = buttons.map((b) => b.disabled);
  buttons.forEach((b) => (b.disabled = true));
  notify("Procesando… Espera la confirmación antes de repetir la acción.");
  try {
    await fn();
    succeeded = true;
    if (message) notify(message);
    else notify("");
  } catch (e) {
    const text =
      e instanceof TypeError
        ? "Se perdió la conexión o la respuesta. Consultamos el último estado disponible; verifica el resultado antes de repetir."
        : e.message || "No se pudo conectar.";
    if (form) form.querySelector(".form-error").textContent = text;
    notify(text, true);
    try {
      state = await api("/api/bootstrap");
      render();
    } catch {
      /* Keep the last known state; never report success. */
    }
  } finally {
    busy = false;
    document.body.classList.remove("busy");
    buttons.forEach((b, i) => {
      if (b.isConnected) b.disabled = disabled[i];
    });
    if (state) render();
    if (succeeded && form) {
      const selector =
        form.getAttribute("id") === "settings-form"
          ? "#settings-open"
          : form.getAttribute("id") === "approval-form"
            ? "[data-enroll], [data-action=checkout]:not(:disabled), #detail h2"
            : form.getAttribute("id") === "edit-form"
              ? "#detail h2"
              : null;
      const target = selector ? $(selector) : null;
      target?.focus();
    }
  }
}
async function reload() {
  state = await api("/api/bootstrap");
  render();
}
function currentProposal(id = selected) {
  const matches = state.proposals.filter(
    (p) =>
      p.productId === id &&
      p.state !== "CANCELED" &&
      !["FAILED", "EXPIRED"].includes(p.operation?.status),
  );
  const unfinished = matches.find((p) => p.operation?.status !== "COMPLETED");
  if (unfinished) return unfinished;
  if (state.products.find((p) => p.id === id)?.analysis.status === "REORDER")
    return undefined;
  return matches.find((p) =>
    state.incoming.some(
      (i) => i.proposalId === p.id && i.received < i.quantity,
    ),
  );
}
function receiptIntent(id) {
  try {
    return JSON.parse(
      sessionStorage.getItem("stockrescue-receipt-" + id) || "null",
    );
  } catch {
    return null;
  }
}
function clearConfirmedReceipts() {
  for (const r of state.receipts) {
    const intent = receiptIntent(r.incomingId);
    if (intent?.key === r.key)
      sessionStorage.removeItem("stockrescue-receipt-" + r.incomingId);
  }
}
const unit = (n, plural) =>
  esc(
    n === 1 && ["bolsas", "piezas", "paquetes"].includes(plural)
      ? plural.slice(0, -1)
      : plural,
  );
function quantity(p) {
  return `${number(p.analysis.purchaseQuantity)} ${p.product.unitsPerPack === 1 ? `${unit(p.analysis.purchaseQuantity, "bolsas")} de 250 g` : unit(p.analysis.purchaseQuantity, "paquetes")} · ${number(p.analysis.inventoryQuantity)} ${unit(p.analysis.inventoryQuantity, p.product.unit)}`;
}
function quoteTotals(q) {
  return `<dl class="quote-totals"><dt>Productos · ${q.quantity} ${q.quantity === 1 ? "unidad" : "unidades"}</dt><dd>${money(q.subtotal)}</dd><dt>Envío</dt><dd>${q.shipping === null ? "No desglosado" : money(q.shipping)}</dd><dt>Impuestos${q.taxIncluded ? " (incluidos)" : ""}</dt><dd>${q.tax === null ? "No desglosados" : money(q.tax)}</dd>${q.discounts ? `<dt>Descuentos</dt><dd>−${money(q.discounts)}</dd>` : ""}${q.additionalCharges ? `<dt>Otros cargos</dt><dd>${money(q.additionalCharges)}</dd>` : ""}<dt class="total-label">Total final MXN</dt><dd class="total">${money(q.total)}</dd></dl>`;
}
function render() {
  if (!state) return;
  clearConfirmedReceipts();
  $("#app").setAttribute("aria-busy", "false");
  $("#mode").textContent =
    state.mode === "REAP_SANDBOX"
      ? "Reap sandbox · sin dinero real"
      : "Práctica local · precios y pedidos simulados";
  $("#shop-name").textContent = state.settings.name;
  $("#updated").textContent =
    `Actualizado ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
  const attention = state.products.filter((p) =>
      ["REORDER", "CAPACITY"].includes(p.analysis.status),
    ).length,
    open = state.incoming.filter((i) => i.received < i.quantity).length;
  $("#summary").innerHTML =
    `<p><strong>${attention}</strong> <span>necesitan atención</span></p><p><strong>${open}</strong> <span>pedidos por recibir</span></p><p><strong>${money(state.budgetAvailable)}</strong> <span>disponible de ${money(state.settings.budget)}</span></p>`;
  $("#order-count").textContent = open ? `(${open})` : "";
  const term = $("#search").value.toLocaleLowerCase(),
    filter = $("#filter").value;
  const products = state.products.filter(
    (p) =>
      (p.name + " " + p.id).toLocaleLowerCase().includes(term) &&
      (filter === "all" ||
        (filter === "attention" &&
          ["REORDER", "CAPACITY"].includes(p.analysis.status)) ||
        (filter === "incoming" && p.analysis.incoming > 0)),
  );
  $("#inventory-rows").innerHTML = products.length
    ? products
        .map(
          (p) =>
            `<tr class="${p.id === selected ? "selected" : ""}"><td><strong>${esc(p.name)}</strong><small>${esc(p.id)} · ${esc(p.unit)}</small><small class="${p.analysis.status === "REORDER" ? "risk-text" : ""}">${labels[p.analysis.status]}${p.analysis.incoming ? ` · ${number(p.analysis.incoming)} por recibir` : ""}</small><small class="mobile-coverage">${p.analysis.coverageDays === null ? "Sin consumo" : number(p.analysis.coverageDays) + " días de cobertura"}</small></td><td>${number(p.analysis.available)}</td><td>${p.analysis.coverageDays === null ? "Sin consumo" : number(p.analysis.coverageDays) + " días"}</td><td><button class="row-action" data-select="${esc(p.id)}" aria-label="Revisar ${esc(p.name)}">Revisar</button></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="4" class="empty">No hay productos con este filtro. Prueba otra búsqueda o importa tu inventario.</td></tr>';
  renderDetail();
  renderOrders();
  renderHistory();
  showView(view, false);
}
function renderDetail() {
  const p = state.products.find((x) => x.id === selected);
  if (!p) {
    $("#detail").innerHTML =
      '<p class="empty">Selecciona un producto para revisar su reposición.</p>';
    return;
  }
  const a = p.analysis,
    proposal = currentProposal(),
    q = proposal?.quote,
    op = proposal?.operation,
    incoming = state.incoming.find((i) => i.proposalId === proposal?.id);
  const qty = proposal && !op ? proposal.analysis : a;
  let title =
    a.status === "REORDER"
      ? `Reponer ${number(qty.inventoryQuantity)} ${unit(qty.inventoryQuantity, p.unit)}`
      : labels[a.status];
  if (op)
    title =
      op.status === "COMPLETED"
        ? "Pedido confirmado"
        : op.status === "REQUIRES_ACTION"
          ? "Falta autorizar en Reap"
          : "Estamos verificando el pedido";
  const stage = op ? 4 : proposal?.state === "APPROVED" ? 3 : q ? 2 : 1;
  let content = `<button class="quiet mobile-back" data-back>Volver al inventario</button><div class="detail-title"><div><h2 tabindex="-1">${esc(p.name)}</h2><p class="product-reference">${esc(p.id)} · ${p.supplier === "blendstation" ? "Blend Station · comercio de la lista Reap" : "Proveedor aún sin vincular"}</p></div><button class="quiet" data-edit="${p.id}">Editar datos</button></div><div class="decision"><h3>${title}</h3>${!op && a.status === "REORDER" ? `<p class="quantity-line">${number(a.purchaseQuantity)} ${p.unitsPerPack === 1 ? (a.purchaseQuantity === 1 ? "unidad de compra" : "unidades de compra") : "paquetes de " + p.unitsPerPack} = ${number(a.inventoryQuantity)} ${unit(a.inventoryQuantity, p.unit)}</p>` : ""}<p>${esc(op?.note ?? a.reason)}</p>${a.gapDays > 0 && !op ? `<p class="warning">Podrías quedarte sin stock ${number(a.gapDays)} ${a.gapDays === 1 ? "día" : "días"} antes de la entrega estimada. Esta compra no elimina esa brecha; revisa una alternativa local.</p>` : ""}${a.lateIncoming > 0 ? `<p class="warning">${number(a.lateIncoming)} ${esc(p.unit)} comprometidas tienen llegada tardía o vencida. Se cuentan para evitar comprar de más.</p>` : ""}</div>`;
  content += `<ol class="journey" aria-label="Pasos de reposición">${["Revisar", "Cotizar", "Aprobar", "Pedido"].map((x, i) => `<li class="${i + 1 === stage ? "current" : ""}"${i + 1 === stage ? ' aria-current="step"' : ""}><b>${i + 1}</b>${x}</li>`).join("")}</ol>`;
  if (!op)
    content += `<details class="calculation"><summary>Cómo se calculó esta reposición</summary><dl><dt>Disponible (existencias − reservas)</dt><dd>${p.onHand} − ${p.reserved} = ${a.available}</dd><dt>Mercancía pendiente</dt><dd>${a.incoming} ${esc(p.unit)}</dd><dt>Consumo diario estimado</dt><dd>${number(p.dailyDemand)}</dd><dt>Entrega + seguridad</dt><dd>${p.leadDays} + ${p.safetyDays} días</dd><dt>Punto de reposición</dt><dd>${number(a.reorderPoint)}</dd><dt>Objetivo con revisión cada ${p.reviewDays} días</dt><dd>${number(a.target)}</dd><dt>Capacidad máxima</dt><dd>${p.maxStock}</dd></dl><p>Se compra cuando la posición (disponible + pedidos abiertos) alcanza el punto de reposición. Se completa hasta el objetivo, redondeando al empaque. Demanda y plazo son estimaciones introducidas por la tienda.</p></details>`;
  if (proposal?.error)
    content += `<p class="warning">${esc(proposal.error)}</p>`;
  if (!proposal && a.status === "REORDER")
    content +=
      p.supplier === "blendstation"
        ? '<div class="actions"><button class="primary" data-prepare>Preparar reposición</button></div><p class="small">Revisarás la cotización final antes de autorizar.</p>'
        : '<p class="warning">Puedes calcular la necesidad, pero este producto aún no tiene un comercio habilitado para comprar con Reap.</p>';
  if (proposal && !op) {
    if (!q || ["QUOTING", "DRAFT"].includes(proposal.state))
      content += `<div class="quote-section"><h3>Obtén el precio con envío</h3><p>${quantity(proposal)}</p><p class="destination">${esc(state.settings.address.addressLine1)}, ${esc(state.settings.address.city)}, ${esc(state.settings.address.region)}, ${esc(state.settings.address.postalCode)}. <button class="quiet" data-settings>Revisar destino</button></p><div class="actions"><button class="primary" data-action="quote" data-id="${proposal.id}">${proposal.state === "QUOTING" ? "Recuperar cotización pendiente" : "Obtener cotización final"}</button><button class="quiet" data-action="cancel" data-id="${proposal.id}">Cancelar propuesta</button></div></div>`;
    else {
      const expired = Date.parse(q.expiresAt) <= Date.now() + 15000,
        over =
          q.total > proposal.product.budget || q.total > state.budgetAvailable;
      content += `<div class="quote-section"><h3>${q.fixture ? "Cotización de ejemplo" : "Cotización de Reap"}</h3><p>${quantity(proposal)}</p>${q.shippingOptions.length ? `<label class="shipping-label">Opción de envío<select data-shipping="${proposal.id}" ${proposal.state === "APPROVED" ? "disabled" : ""}>${q.shippingOptions.map((o) => `<option value="${esc(o.id)}"${o.selected ? " selected" : ""}>${esc(o.name)} · ${money(o.price)}</option>`).join("")}</select></label>` : ""}${quoteTotals(q)}<p class="destination">Entrega: ${esc(q.destination.addressLine1)}, ${esc(q.destination.city)}, ${esc(q.destination.region)} ${esc(q.destination.postalCode)}.</p><p class="expiry">${expired ? "Esta cotización venció." : "Válida hasta " + date(q.expiresAt)}</p>${over ? `<p class="warning">Supera el presupuesto disponible o el límite de ${money(proposal.product.budget)} por reposición. No se enviará una compra.</p>` : ""}`;
      if (proposal.state === "APPROVED" && !expired && !over) {
        content +=
          "<p>Aprobación guardada. El total se verificará otra vez antes de enviar.</p>";
        content += enrollment();
        content += `<div class="actions"><button class="primary" data-action="checkout" data-id="${proposal.id}" ${state.enrollment?.status === "ACTIVE" ? "" : "disabled"}>Enviar compra ${state.mode === "REAP_SANDBOX" ? "en sandbox" : "de práctica"} · ${money(q.total)}</button></div>`;
      } else
        content += `<div class="actions">${!expired && !over ? `<button class="primary" data-approve="${proposal.id}">Revisar y aprobar ${money(q.total)}</button>` : ""}<button data-action="quote" data-id="${proposal.id}">Volver a cotizar</button></div>`;
      content += `<div class="actions"><button class="quiet" data-action="cancel" data-id="${proposal.id}">Cancelar propuesta</button></div></div>`;
    }
  }
  if (op) {
    content += `<div class="quote-section"><h3>${op.status === "COMPLETED" ? "Pedido pendiente de recibir" : "Siguiente paso"}</h3>${quoteTotals(op.quote)}${op.status === "COMPLETED" ? `<p>Importe verificado: <strong>${money(op.finalAmount)}</strong>.</p><p>${incoming?.received ? `Recibidas ${incoming.received} de ${incoming.quantity} ${esc(p.unit)}. Falta registrar ${incoming.quantity - incoming.received}.` : "Las existencias siguen iguales hasta registrar la recepción."}</p><button class="primary" data-view="orders">Ir a pedidos y recepción</button>` : `${op.nextAction ? `<p><a href="${esc(op.nextAction)}" target="_blank" rel="noopener noreferrer">Abrir aprobación segura de Reap</a></p>` : ""}<div class="actions"><button class="primary" data-action="reconcile" data-id="${proposal.id}">Consultar el mismo intento</button></div><p class="small">La reserva se conserva mientras se confirma el resultado. No se crea otra compra.</p>`}<details class="details-technical"><summary>Ver referencias del pedido</summary><p>Checkout: ${esc(op.checkoutId ?? "pendiente")}<br>Pedido: ${esc(op.orderId ?? "pendiente")}<br>Operación: ${esc(op.key)}</p></details></div>`;
  }
  if (proposal)
    content += `<details class="details-technical"><summary>Ver registro de esta reposición</summary><ol>${proposal.audit.map((x) => `<li>${esc(date(x.at))} · ${esc(x.detail)}</li>`).join("")}</ol></details>`;
  $("#detail").innerHTML = content;
}
function enrollment() {
  const e = state.enrollment;
  if (e?.status === "ACTIVE")
    return `<p class="small">${state.mode === "REAP_SANDBOX" ? "Tarjeta de prueba vinculada. Sandbox activo." : "Tarjeta ficticia vinculada. Práctica local activa."}</p>`;
  return `<section class="enrollment"><h3>Vincula la tarjeta de prueba</h3><p>${state.mode === "REAP_SANDBOX" ? "Se abrirá la página segura de Reap. Usa exclusivamente la tarjeta de prueba del evento. Al terminar, vuelve a esta pestaña y pulsa Consultar vinculación." : "La práctica local usa una tarjeta ficticia sin conexión a Reap."}</p>${e?.nextAction ? `<p><a href="${esc(e.nextAction)}" target="_blank" rel="noopener noreferrer">Abrir vinculación segura de Reap</a></p>` : ""}<button data-enroll>${e ? "Consultar vinculación" : "Vincular tarjeta de prueba"}</button>${e?.nextAction ? ' <button class="quiet" data-enroll data-renew="true">Crear enlace nuevo</button><p class="small">Úsalo si el enlace venció o indica que ya fue utilizado.</p>' : ""}</section>`;
}
function renderOrders() {
  const incoming = state.incoming;
  $("#order-list").innerHTML = incoming.length
    ? incoming
        .slice()
        .reverse()
        .map((i) => {
          const p = state.products.find((p) => p.id === i.productId),
            pending = i.quantity - i.received;
          const intent = receiptIntent(i.id);
          return `<article class="order-row"><div><h3>${esc(p?.name ?? i.productId)}</h3><p>${i.fixture ? "Pedido de práctica" : "Pedido sandbox Reap"} · ${pending ? "pendiente de recibir" : "recepción completa"}</p><p class="small">${esc(i.orderId)}</p></div><div><p><strong>${i.received} / ${i.quantity}</strong> ${esc(p?.unit)} recibidas</p><p>Llegada estimada: ${date(i.eta)}</p><p class="small">Plazo calculado con los días del inventario; no es una promesa del comercio.</p></div>${pending ? `<form class="receive-form" data-receive="${i.id}"><label>Cantidad recibida<input name="quantity" type="number" min="1" max="${pending}" value="${intent?.quantity ?? pending}" ${intent ? "readonly" : ""} required></label><button class="primary" type="submit">${intent ? "Confirmar recepción pendiente" : "Registrar recepción"}</button></form>` : "<p>Inventario actualizado.</p>"}</article>`;
        })
        .join("")
    : '<p class="empty">Aún no hay pedidos confirmados. Prepara una reposición desde el inventario y aprueba su total para continuar.</p>';
}
function renderHistory() {
  const events = state.proposals
    .flatMap((p) => p.audit.map((e) => ({ ...e, product: p.product.name })))
    .sort((a, b) => b.at.localeCompare(a.at));
  $("#history-list").innerHTML = events.length
    ? `<ol class="event-list">${events.map((e) => `<li><time datetime="${esc(e.at)}">${date(e.at)}</time><div><strong>${esc(e.product)}</strong><p>${esc(e.detail)}</p><small>${esc(e.event)}</small></div></li>`).join("")}</ol>`
    : '<p class="empty">Aquí aparecerán los cálculos, cotizaciones, aprobaciones y recepciones. Cada paso conserva su registro.</p>';
}
function showView(next, focus = true) {
  view = next;
  for (const id of ["inventory", "orders", "history"])
    $("#" + id).hidden = id !== next;
  document.querySelectorAll(".workspace-nav [data-view]").forEach((b) => {
    if (b.dataset.view === next) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (focus) {
    const h = $("#" + next + " h2");
    h?.setAttribute("tabindex", "-1");
    h?.focus({ preventScroll: true });
  }
}
function openSettings() {
  const f = $("#settings-form");
  for (const [k, v] of Object.entries({
    ...state.settings,
    ...state.settings.address,
    budget: state.settings.budget / 100,
  })) {
    if (f.elements.namedItem(k)) f.elements.namedItem(k).value = v;
  }
  f.querySelector(".form-error").textContent = "";
  $("#settings-dialog").showModal();
}
function openEdit(id) {
  const p = state.products.find((x) => x.id === id),
    f = $("#edit-form");
  for (const [k, v] of Object.entries({ ...p, budget: p.budget / 100 })) {
    if (f.elements.namedItem(k)) f.elements.namedItem(k).value = v;
  }
  $("#edit-name").textContent = p.name;
  f.querySelector(".form-error").textContent = "";
  $("#edit-dialog").showModal();
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || busy) return;
  if (b.dataset.close) {
    $("#" + b.dataset.close).close();
    return;
  }
  if (b.dataset.select) {
    selected = b.dataset.select;
    $("#inventory").classList.add("detail-open");
    renderDetail();
    $("#detail h2")?.focus({ preventScroll: true });
    if (innerWidth <= 800) $("#inventory").scrollIntoView({ block: "start" });
    return;
  }
  if (b.hasAttribute("data-back")) {
    $("#inventory").classList.remove("detail-open");
    $(`[data-select="${selected}"]`)?.focus();
    return;
  }
  if (b.dataset.view) {
    showView(b.dataset.view);
    return;
  }
  if (b.id === "settings-open" || b.hasAttribute("data-settings")) {
    openSettings();
    return;
  }
  if (b.dataset.edit) {
    openEdit(b.dataset.edit);
    return;
  }
  if (b.id === "import-open") {
    $("#import-dialog").showModal();
    return;
  }
  if (b.id === "refresh") {
    run(reload, "Datos actualizados.");
    return;
  }
  if (b.hasAttribute("data-prepare")) {
    run(async () => {
      state = await api("/api/proposals", { productId: selected });
    }, "Reposición preparada. Obtén la cotización para revisar el total.");
    return;
  }
  if (b.dataset.action) {
    run(
      async () => {
        state = await api(
          `/api/proposals/${b.dataset.id}/${b.dataset.action}`,
          {},
        );
      },
      b.dataset.action === "checkout"
        ? "Solicitud procesada. Revisa el estado del pedido."
        : b.dataset.action === "cancel"
          ? "Propuesta cancelada."
          : "Estado actualizado.",
    );
    return;
  }
  if (b.dataset.approve) {
    approvalId = b.dataset.approve;
    const p = state.proposals.find((x) => x.id === approvalId);
    $("#approval-summary").innerHTML =
      `<p><strong>${esc(p.product.name)}</strong></p><p>${quantity(p)}</p>${quoteTotals(p.quote)}<p class="destination">${esc(p.quote.destination.addressLine1)}, ${esc(p.quote.destination.city)} ${esc(p.quote.destination.postalCode)}</p><p class="small">${p.quote.fixture ? "Práctica local con precios ficticios." : "Compra en sandbox Reap."} No se mueve dinero real.</p>`;
    $("#approve-consent").checked = false;
    $("#approval-form .form-error").textContent = "";
    $("#approval-dialog").showModal();
    return;
  }
  if (b.hasAttribute("data-enroll")) {
    run(async () => {
      state = await api("/api/enrollment", { renew: !!b.dataset.renew });
    }, "Vinculación consultada. Continúa con el paso indicado.");
    return;
  }
  if (b.id === "import-confirm") {
    run(async () => {
      state = await api("/api/import", { csv });
      $("#import-dialog").close();
    }, "Inventario importado. Las propuestas sin enviar se recalcularán.");
  }
});
$("#search").addEventListener("input", render);
$("#filter").addEventListener("change", render);
document.addEventListener("change", (e) => {
  if (e.target.dataset.shipping)
    run(async () => {
      state = await api(
        `/api/proposals/${e.target.dataset.shipping}/shipping`,
        { shippingId: e.target.value },
      );
    }, "Envío actualizado. Revisa el total antes de aprobar.");
});
$("#csv-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  $("#import-confirm").disabled = true;
  if (!file) return;
  if (file.size > 200000) {
    $("#csv-preview").textContent = "El archivo supera 200 KB.";
    return;
  }
  try {
    csv = await file.text();
    const preview = await api("/api/import/preview", { csv });
    $("#csv-preview").innerHTML =
      `<p>${preview.total} ${preview.total === 1 ? "fila" : "filas"} · ${preview.products.length} ${preview.products.length === 1 ? "producto válido" : "productos válidos"} · ${preview.errors.length} ${preview.errors.length === 1 ? "error" : "errores"}.</p><ul class="preview-list">${preview.errors.map((x) => `<li class="invalid">Fila ${x.row}: ${esc(x.message)}</li>`).join("")}${preview.products.map((x) => `<li>${esc(x.id)} · ${esc(x.name)} · ${x.onHand} ${esc(x.unit)}</li>`).join("")}</ul>`;
    $("#import-confirm").disabled = preview.errors.length > 0;
  } catch (err) {
    $("#csv-preview").textContent = err.message;
  }
});
$("#edit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    d = Object.fromEntries(new FormData(f)),
    id = d.id;
  delete d.id;
  for (const k of Object.keys(d)) d[k] = Number(d[k]);
  d.budget = Math.round(d.budget * 100);
  run(
    async () => {
      state = await api(`/api/products/${id}`, d);
      $("#edit-dialog").close();
    },
    "Inventario actualizado y reposición recalculada.",
    f,
  );
});
$("#settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    d = Object.fromEntries(new FormData(f));
  const payload = {
    name: d.name,
    email: d.email,
    budget: Math.round(Number(d.budget) * 100),
    address: Object.fromEntries(
      [
        "firstName",
        "lastName",
        "phone",
        "addressLine1",
        "city",
        "region",
        "postalCode",
      ].map((k) => [k, d[k]]),
    ),
  };
  payload.address.country = "MX";
  run(
    async () => {
      state = await api("/api/settings", payload);
      $("#settings-dialog").close();
    },
    "Tienda guardada. Revisa nuevamente cualquier cotización.",
    f,
  );
});
$("#approval-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    p = state.proposals.find((x) => x.id === approvalId);
  run(
    async () => {
      state = await api(`/api/proposals/${approvalId}/approve`, {
        hash: p.quoteHash,
      });
      $("#approval-dialog").close();
    },
    "Total aprobado. Ahora puedes enviar la compra de prueba.",
    f,
  );
});
document.addEventListener("submit", (e) => {
  if (!e.target.dataset.receive) return;
  e.preventDefault();
  const f = e.target;
  const id = f.dataset.receive;
  const intent = receiptIntent(id) ?? {
    key: crypto.randomUUID(),
    quantity: Number(new FormData(f).get("quantity")),
  };
  try {
    sessionStorage.setItem("stockrescue-receipt-" + id, JSON.stringify(intent));
  } catch {
    notify(
      "Habilita el almacenamiento de esta pestaña para registrar recepciones sin duplicarlas.",
      true,
    );
    return;
  }
  run(async () => {
    state = await api(`/api/incoming/${id}/receive`, intent);
    clearConfirmedReceipts();
  }, "Recepción registrada. Tus existencias ya están actualizadas.");
});
window.addEventListener("offline", () =>
  notify(
    "Sin conexión. No se enviarán compras; reconecta y consulta el estado antes de repetir una acción.",
    true,
  ),
);
window.addEventListener("online", () =>
  notify(
    "La conexión volvió. Pulsa Actualizar para consultar el último estado.",
  ),
);
run(async () => {
  await reload();
  if (new URLSearchParams(location.search).has("return"))
    notify(
      "Regresaste de Reap. Consulta la vinculación o el pedido para verificar su estado.",
    );
});
