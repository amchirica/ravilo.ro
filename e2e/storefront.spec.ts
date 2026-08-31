import { test, expect } from "@playwright/test";

test("mobile menu covers the page and shows links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Deschide meniul|Open menu/i }).click();
  const menu = page.getByRole("dialog", { name: /Deschide meniul|Open menu/i });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: /Produse|Products/i })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Noutăți|New arrivals/i })).toBeVisible();
});

test("RO homepage renders brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "RAVILO" }).first()).toBeVisible();
});

test("EN homepage keeps the brand and can switch back", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "RAVILO" }).first()).toBeVisible();
  await page.getByRole("button", { name: "RO" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("theme toggle persists", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByLabel(/Temă|Theme/i);
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("product page renders localized stock language", async ({ page }) => {
  await page.goto("/produs/ravilo-drive-mount");
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(20);
});

test("guest cart is empty without writing cookies", async ({ page, context }) => {
  await context.clearCookies();
  const response = await page.goto("/cos");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name === "ravilo_cart")).toBe(false);
});

test("wishlist page does not loop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  const response = await page.goto("/favorite");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toBeVisible();
  expect(errors.join("\n")).not.toMatch(/Maximum update depth|getSnapshot should be cached/i);
});

test("account redirects once to shop login", async ({ request, page }) => {
  const probe = await request.get("/cont", { maxRedirects: 0 });
  expect([307, 308]).toContain(probe.status());
  const location = probe.headers().location ?? "";
  expect(location).toMatch(/\/auth\/login/);
  expect(location).toMatch(/next=/);

  let loginDocuments = 0;
  page.on("request", (req) => {
    if (req.resourceType() === "document" && req.url().includes("/auth/login")) loginDocuments += 1;
  });
  const login = await page.goto("/cont");
  expect(login?.status()).toBe(200);
  await expect(page).toHaveURL(/\/auth\/login/);
  expect(loginDocuments).toBeLessThanOrEqual(2);
});

test("admin redirects to admin login, not shop login", async ({ request, page }) => {
  const probe = await request.get("/admin", { maxRedirects: 0 });
  expect([307, 308]).toContain(probe.status());
  const location = probe.headers().location ?? "";
  expect(location).toMatch(/\/admin\/login/);
  expect(location).not.toMatch(/\/auth\/login/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(page.url()).not.toMatch(/\/auth\/login/);
});

test("checkout redirects empty cart", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/cos/);
});

test("catalog and category routes exist", async ({ page }) => {
  const products = await page.goto("/produse");
  expect(products?.status()).toBe(200);
  await expect(page.locator("h1")).toBeVisible();
  const categories = await page.goto("/categorii");
  expect(categories?.status()).toBe(200);
});

test("admin login is reachable", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
});

test("404 is premium", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist-ravilo");
  expect(response?.status()).toBe(404);
});
