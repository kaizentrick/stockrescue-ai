(() => {
  const $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const kinds = {
    SALE: "Venta",
    CONSUMPTION: "Consumo",
    RETURN: "Devolución",
    WASTE: "Merma",
    ADJUSTMENT: "Ajuste",
    RECEIPT: "Recepción",
    PURCHASE: "Factura de compra",
    UNKNOWN: "Por aclarar",
  };
  let products = [],
    pending,
    ops,
    loading = false;
  const localDate = () =>
    new Date()
      .toLocaleString("sv-SE", { timeZone: "America/Mexico_City" })
      .replace(" ", "T")
      .slice(0, 16);
  const date = (v) =>
    new Date(v).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  async function api(path, data) {
    const r = await fetch(
      (location.pathname.startsWith("/demo/") ? "/demo" : "") + path,
      {
        method: data === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-stockrescue-client": "local",
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      },
    );
    if (r.status === 401) {
      location.href = "/login";
      throw new Error("Inicia sesión.");
    }
    const b = await r.json();
    if (!r.ok) throw new Error(b.error);
    return b;
  }
  function error(e) {
    $("#error").hidden = false;
    $("#error").textContent = e.message ?? String(e);
  }
  async function execute(button, fn) {
    button.disabled = true;
    try {
      await fn();
    } catch (e) {
      error(e);
    } finally {
      button.disabled = false;
    }
  }
  function skuOptions(id) {
    return (
      '<option value="">Seleccionar SKU</option>' +
      products
        .map(
          (p) =>
            `<option value="${esc(p.id)}" ${p.id === id ? "selected" : ""}>${esc(p.id)} · ${esc(p.name)} (${esc(p.unit)})</option>`,
        )
        .join("")
    );
  }
  async function load() {
    if (loading) return;
    loading = true;
    try {
      const [s, o] = await Promise.all([
        api("/api/bootstrap"),
        api("/api/operations"),
      ]);
      products = s.products;
      ops = o;
      document.querySelectorAll(".sku-select").forEach((el) => {
        const v = el.value;
        el.innerHTML = skuOptions(v || products[0]?.id);
      });
      render();
    } catch (e) {
      error(e);
    } finally {
      loading = false;
    }
  }
  function render() {
    $("#movement-list").innerHTML =
      "<h3>Historial registrado</h3>" +
      (ops.movements.length
        ? `<div class="table-scroll"><table><thead><tr><th>Fecha CDMX</th><th>SKU</th><th>Movimiento</th><th>Cantidad</th><th>Origen y referencia</th></tr></thead><tbody>${ops.movements.map((m) => `<tr><td>${esc(date(m.at))}</td><td>${esc(m.product_id)}</td><td>${esc(kinds[m.kind])}</td><td>${m.quantity}</td><td>${esc(m.note)}<br><small>${esc(m.origin)} ${esc(m.reference)}</small></td></tr>`).join("")}</tbody></table></div>`
        : "<p>Aún no hay movimientos registrados.</p>");
    $("#document-list").innerHTML =
      ops.documents
        .map((doc) => {
          const d = doc.data;
          return `<article class="document-card"><h3>${esc(d.folio || "Sin folio")} · ${esc(kinds[d.kind])}</h3><p>${esc(doc.status)} · ${esc(date(doc.created_at))}</p>${doc.status === "REVIEW" ? `<form data-document="${esc(doc.id)}"><div class="form-grid"><label>Tipo<select name="kind">${["UNKNOWN", "PURCHASE", "SALE", "RECEIPT"].map((k) => `<option value="${k}" ${d.kind === k ? "selected" : ""}>${kinds[k]}</option>`).join("")}</select></label><label>Proveedor o emisor<input name="supplier" value="${esc(d.supplier)}" required></label><label>Fecha<input type="date" name="date" value="${esc(d.date)}" required></label><label>Folio<input name="folio" value="${esc(d.folio)}" required></label><label>Total MXN<input type="number" name="total" step="0.01" min="0" value="${d.total ?? ""}"></label></div><div class="document-lines">${d.lines.map((l, i) => `<fieldset data-line="${i}"><legend>${esc(l.description)}</legend><div class="form-grid"><label>SKU<select name="sku">${skuOptions(l.productId)}</select></label><label>Cantidad del documento<input name="quantity" type="number" min="0.001" step="any" value="${l.quantity ?? ""}" required></label><label>Unidad del documento<input name="unit" value="${esc(l.unit)}" required></label><label>Unidades de inventario por unidad del documento<input name="conversion" type="number" min="1" step="1" value="${l.unitsPerPackage ?? ""}" required></label><label>Importe de línea MXN<input name="amount" type="number" min="0" step="0.01" value="${l.amount ?? ""}"></label></div></fieldset>`).join("")}</div><label>Aclaraciones pendientes (resuélvelas antes de vaciar esta lista)<textarea name="questions">${esc(d.questions.join("\n"))}</textarea></label><div class="actions"><button class="primary">Guardar correcciones</button><button type="button" data-doc-preview="${esc(doc.id)}">Revisar confirmación</button></div><p class="small">Factura: solo archivo. Ticket de venta: resta. Recepción física confirmada: suma. Verifica las unidades antes de confirmar.</p></form>` : "<p>Documento confirmado. Sus movimientos no se repetirán.</p>"}</article>`;
        })
        .join("") || "<p>No hay documentos pendientes.</p>";
    $("#integrations").innerHTML =
      ops.integrations
        .map(
          (i) =>
            `<article><h3>${esc(i.provider)}</h3><strong>${esc(i.status)}</strong><p>${esc(i.detail)}</p><small>${esc(date(i.at))}</small></article>`,
        )
        .join("") +
      `<article><h3>Agente</h3><p>${ops.agent.practice ? "Práctica guiada por comandos · sin IA externa" : "Google AI Studio · " + esc(ops.agent.model)}</p><p>${ops.agent.practice ? "Compra simulada" : "Compra sandbox"}: ${ops.agent.allowCheckout ? "requiere cotización y código" : "envío deshabilitado"}</p></article>`;
    $("#reminder-list").innerHTML = ops.reminders
      .map(
        (r) =>
          `<p>${esc(r.data.text)} · ${esc(date(r.due_at))} · ${esc(r.data.channel)} · ${esc(r.status)} ${r.status === "SCHEDULED" ? `<button data-cancel-reminder="${esc(r.id)}">Cancelar</button>` : ""}</p>`,
      )
      .join("");
    $("#notification-list").innerHTML =
      ops.notifications
        .slice(0, 30)
        .map(
          (n) =>
            `<p><strong>${esc(n.status)}</strong> · ${esc(n.text)} <small>${esc(n.channel)} · ${esc(date(n.at))}${n.error ? " · " + esc(n.error) : ""}</small></p>`,
        )
        .join("") || "<p>Sin avisos pendientes.</p>";
    $("#delivery-list").innerHTML =
      "<h4>Estados de WhatsApp recibidos de Meta</h4>" +
      (ops.deliveries ?? [])
        .map(
          (d) =>
            `<p>${esc(d.status)} · ${esc(date(d.at))} · ${esc(d.message)}${d.error ? " · Error " + esc(d.error) : ""}<small>${esc(d.outbound_id)}</small></p>`,
        )
        .join("") +
      ((ops.messageReview ?? []).length
        ? `<p>${ops.messageReview.length} mensajes requieren revisión. No se reenvían automáticamente.</p>`
        : "");
  }
  function preview(p, text) {
    pending = p;
    $("#action-preview").textContent = text;
    $("#action-error").textContent = "";
    $("#action-dialog").showModal();
  }
  $("#action-cancel").onclick = () => $("#action-dialog").close();
  $("#action-confirm").onclick = async (e) => {
    e.target.disabled = true;
    try {
      await api("/api/actions/confirm", { id: pending.id });
      $("#action-dialog").close();
      window.dispatchEvent(new Event("stockrescue:changed"));
      await load();
    } catch (err) {
      $("#action-error").textContent = err.message;
    } finally {
      e.target.disabled = false;
    }
  };
  $("#movement-form [name=at]").value = localDate();
  $("#movement-form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    v.quantity = Number(v.quantity);
    v.at = new Date(v.at + ":00-06:00").toISOString();
    void execute(e.submitter, async () =>
      preview(
        await api("/api/movements/preview", v),
        `${kinds[v.kind]} · ${v.productId}\nCantidad: ${v.quantity} unidades de inventario\nFecha: ${date(v.at)}\nMotivo: ${v.note}`,
      ),
    );
  };
  $("#document-upload").onsubmit = (e) => {
    e.preventDefault();
    void execute(e.submitter, async () => {
      const file = e.target.elements.document.files[0];
      if (file.size > 8 * 1024 * 1024) throw new Error("Máximo 8 MB.");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await api("/api/documents/upload", {
        mime: file.type,
        base64,
      });
      $("#notice").hidden = false;
      $("#notice").textContent = result.duplicate
        ? "Documento ya registrado; no se duplicaron movimientos."
        : "Documento extraído. Revisa SKU, unidades y cantidades.";
      await load();
    });
  };
  $("#document-list").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target,
      doc = ops.documents.find((d) => d.id === form.dataset.document),
      v = Object.fromEntries(new FormData(form));
    const data = {
      ...doc.data,
      kind: v.kind,
      supplier: v.supplier,
      date: v.date,
      folio: v.folio,
      total: v.total === "" ? null : Number(v.total),
      questions: v.questions.split("\n").filter((x) => x.trim()),
      lines: [...form.querySelectorAll("[data-line]")].map((el, i) => ({
        ...doc.data.lines[i],
        productId: el.querySelector("[name=sku]").value || null,
        quantity: Number(el.querySelector("[name=quantity]").value),
        unit: el.querySelector("[name=unit]").value,
        unitsPerPackage: Number(el.querySelector("[name=conversion]").value),
        amount:
          el.querySelector("[name=amount]").value === ""
            ? null
            : Number(el.querySelector("[name=amount]").value),
      })),
    };
    void execute(e.submitter, async () => {
      await api("/api/documents/" + doc.id + "/edit", data);
      await load();
    });
  });
  $("#document-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-doc-preview]");
    if (!b) return;
    const d = ops.documents.find((d) => d.id === b.dataset.docPreview);
    void execute(b, async () =>
      preview(
        await api("/api/documents/" + d.id + "/preview", {}),
        `${kinds[d.data.kind]} · ${d.data.folio}\n${d.data.supplier} · ${d.data.date}\n${d.data.lines.map((l) => `${l.productId}: ${l.quantity} ${l.unit} × ${l.unitsPerPackage} = ${(l.quantity ?? 0) * (l.unitsPerPackage ?? 0)} unidades de inventario`).join("\n")}\n${d.data.kind === "PURCHASE" ? "Solo se archiva; inventario sin cambios." : "Se registrarán los movimientos mostrados."}\nSe usan las correcciones guardadas.`,
      ),
    );
  });
  $("#simulation-form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    for (const k of ["uplift", "dailyDemand", "seed", "delayDays"])
      v[k] = Number(v[k]);
    void execute(e.submitter, async () => {
      const c = await api("/api/simulations", v);
      $("#simulation-result").innerHTML =
        `<h3>Resultado simulado</h3><div class="summary"><article><h4>Demanda de 7 días</h4><strong>${c.nextWeek.toFixed(1)}</strong></article><article><h4>Cobertura</h4><strong>${c.coverageDays?.toFixed(1) ?? "Sin consumo"} días</strong></article><article><h4>Reponer</h4><strong>${c.recommendedUnits} unidades</strong></article><article><h4>Riesgo de faltante</h4><strong>${c.shortageRisk ? "Sí" : "No"}</strong></article></div><div class="bars" aria-label="Ventas simuladas por día">${c.series.map((n, i) => `<meter title="Día ${i + 1}: ${n}" min="0" max="${Math.max(1, ...c.series)}" value="${n}" aria-label="Día ${i + 1}: ${n}"></meter>`).join("")}</div><p>Error absoluto medio: historial ${c.maeHistory.toFixed(2)} · supuesto fijo ${c.maeCurrent.toFixed(2)}. Plazo modelado: ${c.leadDays} días.</p>`;
      const f = await api("/api/forecast/" + v.productId);
      $("#forecast-result").textContent =
        `Datos operativos: ${f.source}. Estimación semanal ${f.nextWeek.toFixed(1)}; recomendación ${f.recommendedUnits} unidades vs. min/max ${f.currentMinMax}.`;
    });
  };
  $("#chat-form").onsubmit = (e) => {
    e.preventDefault();
    const form = e.target,
      message = form.elements.message.value;
    let key = form.dataset.key;
    if (!key || form.dataset.last !== message) {
      key = crypto.randomUUID();
      form.dataset.key = key;
      form.dataset.last = message;
    }
    void execute(e.submitter, async () => {
      const r = await api("/api/chat", { message, key });
      const block = document.createElement("div"),
        q = document.createElement("p"),
        a = document.createElement("p");
      q.textContent = "Tú: " + message;
      a.textContent = "StockRescue: " + r.answer;
      block.append(q, a);
      $("#chat-history").append(block);
      form.reset();
      delete form.dataset.key;
      window.dispatchEvent(new Event("stockrescue:changed"));
      await load();
    });
  };
  $("#reminder-form").onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    v.dueAt = new Date(v.dueAt + ":00-06:00").toISOString();
    void execute(e.submitter, async () =>
      preview(
        await api("/api/reminders/preview", v),
        `${v.kind === "summary" ? "Resumen actualizado" : "Recordatorio"}: ${v.text}\n${date(v.dueAt)} CDMX\nCanal: ${v.channel}\nFrecuencia: ${v.repeat}`,
      ),
    );
  };
  $("#reminder-list").onclick = (e) => {
    const b = e.target.closest("[data-cancel-reminder]");
    if (b)
      void execute(b, async () =>
        preview(
          await api("/api/reminders/cancel", { id: b.dataset.cancelReminder }),
          "Cancelar este recordatorio: " +
            ops.reminders.find((r) => r.id === b.dataset.cancelReminder).data
              .text,
        ),
      );
  };
  $("#logout").onclick = () =>
    void api("/api/logout", {})
      .then(() => (location.href = "/login"))
      .catch(error);
  window.addEventListener("stockrescue:view", (e) => {
    if (["movements", "documents", "simulations", "agent"].includes(e.detail))
      void load();
  });
  setInterval(() => {
    if (!document.hidden && !$("#agent").hidden) void load();
  }, 15000);
})();
