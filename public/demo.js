fetch("/api/demo")
  .then((r) => r.json())
  .then((s) => {
    const el = document.querySelector("#demo-products");
    for (const p of s.products) {
      const a = document.createElement("article"),
        h = document.createElement("h3"),
        t = document.createElement("p");
      h.textContent = p.name;
      t.textContent =
        p.onHand +
        " " +
        p.unit +
        " · consumo supuesto " +
        p.dailyDemand +
        "/día";
      a.append(h, t);
      el.append(a);
    }
    const c = s.scenario;
    document.querySelector("#demo-scenario").textContent =
      "Supuesto de este escenario: " +
      c.assumptionDailyDemand +
      " unidades/día, con variación semanal y aumento de 30 %. Demanda estimada para 7 días: " +
      c.nextWeek.toFixed(1) +
      " unidades. Cobertura: " +
      (c.coverageDays ?? 0).toFixed(1) +
      " días. Cantidad sugerida: " +
      c.recommendedUnits +
      " unidades. Error medio histórico: " +
      c.maeHistory.toFixed(2) +
      " vs. supuesto fijo: " +
      c.maeCurrent.toFixed(2) +
      ".";
  });
