import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import type { Service } from "../../src/service.ts";

type Snapshot = ReturnType<Service["view"]>;
async function snapshot(request: APIRequestContext): Promise<Snapshot> {
  const response = await request.get("/api/bootstrap");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Snapshot;
}
async function idle(page: Page) {
  await expect(page.locator("body")).not.toHaveClass(/busy/);
}
async function configureDailyDemand(page: Page, demand: string) {
  await page.getByRole("button", { name: "Editar datos" }).click();
  await page.getByLabel("Consumo diario estimado").fill(demand);
  await page.getByRole("button", { name: "Guardar y recalcular" }).click();
  await expect(page.locator("#edit-dialog")).not.toBeVisible();
  await idle(page);
  await expect(page.locator("#detail h2")).toBeFocused();
}
async function purchase(page: Page) {
  await page.getByRole("button", { name: "Preparar reposición" }).click();
  await page.getByRole("button", { name: "Obtener cotización final" }).click();
  expect(
    (await page.locator("[data-shipping]").boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: /^Revisar y aprobar/ }).click();
  const approval = page.locator("#approval-dialog");
  await expect(approval).toBeVisible();
  await expect(approval).toContainText("Total final MXN");
  await expect(approval).toContainText("No se mueve dinero real");
  await approval.getByRole("checkbox").check();
  await approval.getByRole("button", { name: "Aprobar este total" }).click();
  await expect(approval).not.toBeVisible();
  await idle(page);
  await expect(page.locator("#detail h2")).toBeFocused();
  const enroll = page.getByRole("button", {
    name: "Vincular tarjeta de prueba",
  });
  if (await enroll.isVisible()) await enroll.click();
  await page
    .getByRole("button", { name: /^Enviar compra de práctica/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido pendiente de recibir" }),
  ).toBeVisible();
  await idle(page);
}

test.beforeEach(async ({ request, page }) => {
  const reset = await request.post("/__test/reset", {
    headers: { "X-StockRescue-Test": "reset" },
  });
  expect(reset.status()).toBe(204);
  await page.goto("/");
  await expect(page.locator("#inventory-rows tr")).toHaveCount(3);
  await idle(page);
  expect(
    (await page.locator("#filter").boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44);
});

test("purchase, partial receipt and a later replenishment remain separate", async ({
  page,
  request,
}) => {
  await configureDailyDemand(page, "1");
  await purchase(page);
  const ordered = await snapshot(request);
  expect(ordered.products.find((p) => p.id === "CAFE-250")?.onHand).toBe(2);
  expect(ordered.incoming).toHaveLength(1);
  expect(ordered.incoming[0].received).toBe(0);
  expect(ordered.proposals[0].operation?.status).toBe("COMPLETED");

  await page.getByRole("button", { name: "Ir a pedidos y recepción" }).click();
  await page.getByLabel("Cantidad recibida").fill("2");
  await page.getByRole("button", { name: "Registrar recepción" }).click();
  await expect(page.locator("#order-list")).toContainText("2 / 4");
  const partial = await snapshot(request);
  expect(partial.products.find((p) => p.id === "CAFE-250")?.onHand).toBe(4);
  expect(partial.incoming[0].received).toBe(2);
  await page.getByRole("button", { name: "Registrar recepción" }).click();
  await expect(page.locator("#order-list")).toContainText("recepción completa");
  const received = await snapshot(request);
  expect(received.products.find((p) => p.id === "CAFE-250")?.onHand).toBe(6);
  expect(received.receipts).toHaveLength(2);

  await page.getByRole("button", { name: "Inventario", exact: true }).click();
  await page.getByRole("button", { name: "Editar datos" }).click();
  await page.getByLabel("Existencias", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Guardar y recalcular" }).click();
  await expect(
    page.getByRole("heading", { name: "Reponer 5 bolsas" }),
  ).toBeVisible();
  await purchase(page);
  const second = await snapshot(request);
  expect(second.incoming).toHaveLength(2);
  expect(second.products.find((p) => p.id === "CAFE-250")?.onHand).toBe(1);
  expect(second.proposals).toHaveLength(2);
  expect(new Set(second.proposals.map((p) => p.operation?.key)).size).toBe(2);
  expect(
    second.proposals.every((p) => p.operation?.status === "COMPLETED"),
  ).toBeTruthy();
});

test("a receipt accepted before a lost response retries the same intent", async ({
  page,
  request,
}) => {
  await configureDailyDemand(page, "1");
  await purchase(page);
  await page.getByRole("button", { name: "Ir a pedidos y recepción" }).click();
  await page.getByLabel("Cantidad recibida").fill("2");
  const keys: string[] = [];
  await page.route("**/api/bootstrap", (route) => route.abort("failed"));
  await page.route("**/api/incoming/*/receive", async (route) => {
    const input = route.request().postDataJSON() as { key: string };
    keys.push(input.key);
    if (keys.length === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Registrar recepción" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar recepción pendiente" }),
  ).toBeVisible();
  await expect(page.getByLabel("Cantidad recibida")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.unroute("**/api/bootstrap");
  await page
    .getByRole("button", { name: "Confirmar recepción pendiente" })
    .click();
  await expect(page.locator("#order-list")).toContainText("2 / 4");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const recovered = await snapshot(request);
  expect(recovered.receipts).toHaveLength(1);
  expect(recovered.incoming[0].received).toBe(2);
  expect(recovered.products.find((p) => p.id === "CAFE-250")?.onHand).toBe(4);
});

test("invalid CSV cannot change inventory and import dialog works by keyboard", async ({
  page,
  request,
}) => {
  const before = await snapshot(request);
  const trigger = page.getByRole("button", {
    name: "Importar inventario",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.locator("#import-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName("Importar inventario");
  await page.getByLabel("Archivo CSV (máximo 200 KB)").setInputFiles({
    name: "inventario-invalido.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,name,onHand\nPRUEBA,Producto,-1\n"),
  });
  await expect(page.locator("#csv-preview")).toContainText("Faltan columnas");
  await expect(
    page.getByRole("button", { name: "Confirmar importación" }),
  ).toBeDisabled();
  expect((await snapshot(request)).products).toEqual(before.products);
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate(
        (element) =>
          // Native modal dialogs may move Tab to browser chrome (reported as
          // body), but must not expose interactive controls behind the dialog.
          element.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    ).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`inventory and purchase detail remain usable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await expect(page.locator("#notice")).not.toContainText("Procesando");
    const review = page.getByRole("button", { name: /^Revisar Café Guerrero/ });
    await expect(review).toBeVisible();
    if (viewport.width === 390) {
      const position = await review.boundingBox();
      expect(position).not.toBeNull();
      expect(position!.y + position!.height).toBeLessThanOrEqual(
        viewport.height,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await review.click();
    await expect(
      page.getByRole("heading", { name: /^Reponer 1 bolsa/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Preparar reposición" }).click();
    await page
      .getByRole("button", { name: "Obtener cotización final" })
      .click();
    await page.getByRole("button", { name: /^Revisar y aprobar/ }).click();
    const dialog = page.locator("#approval-dialog");
    await expect(dialog).toHaveAccessibleName("Confirma esta reposición");
    await expect(
      dialog.getByRole("button", { name: "Aprobar este total" }),
    ).toBeVisible();
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    if (viewport.width === 390) {
      await page.getByRole("button", { name: "Volver al inventario" }).click();
      await expect(review).toBeFocused();
    }
  });
}

test("quote remains within a narrow viewport when text sizes are doubled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole("button", {
      name: "Revisar Café Guerrero Atoyac · 250 g en grano",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Preparar reposición", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Obtener cotización final", exact: true })
    .click();
  await idle(page);
  await page.evaluate(() => {
    const sizes = Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    ).map((el) => ({
      el,
      size: Number.parseFloat(getComputedStyle(el).fontSize),
    }));
    for (const { el, size } of sizes) el.style.fontSize = size * 2 + "px";
  });
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(geometry.content).toBeLessThanOrEqual(geometry.viewport + 1);
  const wideFont = await page.evaluate(() => {
    document.documentElement.style.fontFamily = "Verdana, sans-serif";
    return {
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    };
  });
  expect(wideFont.content).toBeLessThanOrEqual(wideFont.viewport + 1);
  const approval = page.getByRole("button", { name: /Revisar y aprobar/ });
  await expect(approval).toBeVisible();
  const bounds = await approval.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(321);
});

test("mobile operational panels share movements, document review and simulations", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .locator("#movement-form [name=productId]")
    .selectOption("CAFE-250");
  await page.locator("#movement-form [name=quantity]").fill("1");
  await page
    .locator("#movement-form [name=note]")
    .fill("Venta de prueba de interfaz");
  await page
    .getByRole("button", { name: "Revisar movimiento", exact: true })
    .click();
  await expect(page.locator("#action-dialog")).toContainText(
    "Venta · CAFE-250",
  );
  await page
    .getByRole("button", { name: "Confirmar acción", exact: true })
    .click();
  await expect(page.locator("#movement-list")).toContainText(
    "Venta de prueba de interfaz",
  );
  expect((await snapshot(request)).products[0].onHand).toBe(1);
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await page.locator("#document-upload input").setInputFiles({
    name: "receipt.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nSynthetic test fixture"),
  });
  await page
    .getByRole("button", { name: "Leer con Gemini", exact: true })
    .click();
  await expect(page.locator("#document-list")).toContainText("UI-1");
  await page
    .getByRole("button", { name: "Revisar confirmación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar acción", exact: true })
    .click();
  await expect(page.locator("#document-list")).toContainText(
    "Documento confirmado",
  );
  expect((await snapshot(request)).products[0].onHand).toBe(2);
  await page.getByRole("button", { name: "Simulaciones", exact: true }).click();
  await page
    .getByRole("button", { name: "Simular escenario", exact: true })
    .click();
  await expect(page.locator("#simulation-result")).toContainText(
    "Resultado simulado",
  );
  expect((await snapshot(request)).products[0].onHand).toBe(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("judges enter without login, complete practice and review a sample document on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/");
  await expect(
    page.getByRole("heading", { name: "Prueba StockRescue sin contraseña" }),
  ).toBeVisible();
  await expect(page.locator("#inventory-rows tr")).toHaveCount(3);
  await page
    .getByRole("button", {
      name: "Revisar Café Guerrero Atoyac · 250 g en grano",
    })
    .click();
  await purchase(page);
  await page.getByRole("button", { name: "Ir a pedidos y recepción" }).click();
  await page.getByRole("button", { name: "Registrar recepción" }).click();
  await expect(page.locator("#order-list")).toContainText("recepción completa");
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await expect(page.locator("#document-upload")).toBeHidden();
  await page
    .getByRole("button", { name: "Cargar recepción de ejemplo" })
    .click();
  await expect(page.locator("#document-list")).toContainText("DEMO-JUECES-001");
  await page.getByRole("button", { name: "Revisar confirmación" }).click();
  await page.locator("#action-confirm").click();
  await expect(page.locator("#document-list")).toContainText(
    "Documento confirmado",
  );
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Reiniciar mi demo" }).click(),
  ]);
  await expect(page.locator("#inventory-rows tr")).toHaveCount(3);
  const state = await page.evaluate(async () =>
    fetch("/demo/api/bootstrap").then((r) => r.json()),
  );
  expect(state.products[0].onHand).toBe(2);
  expect(state.proposals).toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
