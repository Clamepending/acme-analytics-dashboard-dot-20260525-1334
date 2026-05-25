import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { existsSync } from "node:fs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= ".pw-browsers";
const { chromium, firefox } = await import("playwright");

const root = process.cwd();
const docsIndex = join(root, "docs", "index.html");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sectionButton(page, section) {
  return page.locator(`.nav button[data-section="${section}"]`);
}

function panel(page, section) {
  return page.locator(`.section[data-panel="${section}"]`);
}

async function expectVisible(locator, message) {
  assert(await locator.isVisible(), message);
}

async function expectCanvasNonblank(page, selector) {
  await page.locator(selector).evaluate(canvas => {
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      throw new Error(`${selector} has no drawable canvas context`);
    }

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const nonblankPixels = Array.from({ length: pixels.length / 4 }).filter((_, pixel) => {
      const index = pixel * 4;
      return pixels[index] !== 0 || pixels[index + 1] !== 0 || pixels[index + 2] !== 0 || pixels[index + 3] !== 0;
    }).length;

    if (nonblankPixels < 100) throw new Error(`${selector} is blank or nearly blank`);
  });
}

if (!existsSync(docsIndex)) {
  throw new Error("docs/index.html is missing; smoke test targets the static dashboard at /docs/");
}

const server = createServer(async (request, response) => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname === "/" || url.pathname.endsWith("/") ? `${url.pathname}index.html`.replace("//", "/") : url.pathname;
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": mime[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}/docs/`;
console.log(`server listening: ${baseUrl}`);
await mkdir("output/playwright", { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const launchOptions = process.env.USE_SYSTEM_CHROME && existsSync(chromePath) ? { executablePath: chromePath } : {};
const browserName = process.env.PLAYWRIGHT_BROWSER || "chromium";
const browserType = browserName === "firefox" ? firefox : chromium;
const browser = await browserType.launch(browserName === "chromium" ? launchOptions : {});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  page.setDefaultTimeout(10000);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("page loaded");

  await page.getByRole("heading", { name: "Product analytics" }).waitFor();
  await expectVisible(page.getByText("Acme Analytics"), "missing Acme Analytics project label");
  for (const section of ["overview", "events", "funnels", "retention", "cohorts", "flags"]) {
    await expectVisible(sectionButton(page, section), `missing ${section} nav button`);
    await expectVisible(panel(page, section), `missing ${section} panel`);
  }

  await expectVisible(page.getByText("Event volume"), "missing overview event volume");
  await expectVisible(page.getByText("Live event stream"), "missing events stream");
  await expectVisible(page.getByText("Activation funnel"), "missing funnels panel");
  await expectVisible(page.getByText("Cohort retention"), "missing retention panel");
  await expectVisible(page.getByRole("heading", { name: "Cohorts" }), "missing cohorts panel");
  await expectVisible(page.getByText("Feature flags"), "missing feature flags panel");
  const eventOptions = await page.locator("#eventType option").evaluateAll(options => options.map(option => option.textContent));
  for (const eventName of ["pageview", "button_click", "form_submit", "signup", "purchase", "logout"]) {
    assert(eventOptions.includes(eventName), `missing ${eventName} event filter option`);
  }
  for (const heading of ["Timestamp", "Event", "User ID", "Page", "Device", "Country"]) {
    assert(await page.locator("th", { hasText: heading }).count() > 0, `missing event property column ${heading}`);
  }
  await expectVisible(page.getByText(/\/pricing|\/signup|\/dashboard|\/billing|\/settings/).first(), "missing event page property");
  await expectVisible(page.getByText(/desktop|mobile|tablet/).first(), "missing event device property");
  await expectVisible(page.getByText(/US|GB|JP|DE|CA/).first(), "missing event country property");
  await expectVisible(page.getByText("Avg session").first(), "missing cohort avg session header");
  await expectVisible(page.getByText("Top events").first(), "missing cohort top events header");
  await expectVisible(page.getByText(/Cohorts: Activated teams|Cohorts: Power users|Cohorts: Billing intent/).first(), "missing flag cohort access labels");

  await expectCanvasNonblank(page, "#eventChart");
  await expectCanvasNonblank(page, "#cohortChart");

  for (const section of ["events", "funnels", "retention", "cohorts", "flags"]) {
    await sectionButton(page, section).click();
    await expectVisible(panel(page, section), `${section} panel did not become visible`);
    assert(await sectionButton(page, section).evaluate(button => button.classList.contains("active")), `${section} nav did not become active`);
    const visiblePanels = await page.locator(".section").evaluateAll(sections =>
      sections.filter(section => getComputedStyle(section).display !== "none").map(section => section.dataset.panel)
    );
    assert(visiblePanels.length === 1 && visiblePanels[0] === section, `${section} nav showed panels: ${visiblePanels.join(", ")}`);
  }

  await sectionButton(page, "overview").click();
  const allPanelsVisible = await page.locator(".section").evaluateAll(sections =>
    sections.every(section => getComputedStyle(section).display !== "none")
  );
  assert(allPanelsVisible, "overview should show every dashboard panel");

  await page.locator("#search").fill("billing");
  const searchState = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tbody tr, .flag, .bar-row")];
    return {
      visibleMatches: rows.filter(row => !row.classList.contains("hidden") && row.textContent.toLowerCase().includes("billing")).length,
      hiddenNonMatches: rows.filter(row => row.classList.contains("hidden") && !row.textContent.toLowerCase().includes("billing")).length,
      badVisible: rows.filter(row => !row.classList.contains("hidden") && !row.textContent.toLowerCase().includes("billing")).map(row => row.textContent.trim())
    };
  });
  assert(searchState.visibleMatches > 0, "search did not reveal any billing results");
  assert(searchState.hiddenNonMatches > 0, "search did not hide nonmatching rows");
  assert(searchState.badVisible.length === 0, `search left nonmatching rows visible: ${searchState.badVisible.join(" | ")}`);
  await page.locator("#search").fill("");

  await page.locator("#eventType").selectOption("purchase");
  const filteredEvents = await page.locator("#eventRows tr:not(.hidden)").evaluateAll(rows =>
    rows.map(row => row.dataset.event)
  );
  assert(filteredEvents.length > 0, "event type filter hid all purchase events");
  assert(filteredEvents.every(event => event === "purchase"), `event type filter left non-purchase rows visible: ${filteredEvents.join(", ")}`);
  await page.locator("#eventType").selectOption("All events");

  await sectionButton(page, "flags").click();
  const firstSwitch = page.locator(".switch[role='switch']").first();
  const beforeChecked = await firstSwitch.getAttribute("aria-checked");
  await firstSwitch.click();
  const afterChecked = await firstSwitch.getAttribute("aria-checked");
  assert(beforeChecked !== afterChecked, "feature flag switch aria-checked did not change");
  assert(await firstSwitch.evaluate(el => el.classList.contains("off") === (el.getAttribute("aria-checked") === "false")), "feature flag switch visual and aria state disagree");

  const themeButton = page.locator("#themeToggle");
  await themeButton.click();
  assert(await page.locator("body").evaluate(body => body.classList.contains("dark")), "theme toggle did not enable dark mode");
  assert(await themeButton.getAttribute("aria-pressed") === "true", "theme toggle aria-pressed did not update");
  await themeButton.click();

  await sectionButton(page, "overview").click();
  const eventsBefore = await page.locator("#kpiEvents").textContent();
  await page.locator("#range").selectOption("Last 7 days");
  await page.getByRole("button", { name: "Refresh data" }).click();
  const eventsAfter = await page.locator("#kpiEvents").textContent();
  assert(eventsBefore && eventsAfter && eventsBefore !== eventsAfter, "range/refresh controls did not rerender KPI data");

  await sectionButton(page, "funnels").click();
  await page.locator("#funnelPreset").selectOption("Invite collaboration");
  await page.getByText("Team activated").waitFor();
  await expectVisible(page.getByText(/drop/).first(), "missing funnel drop-off percentages");

  await sectionButton(page, "events").click();
  const firstTimestamp = await page.locator("#eventRows tr").first().locator("td").first().textContent();
  await page.waitForTimeout(3800);
  const nextTimestamp = await page.locator("#eventRows tr").first().locator("td").first().textContent();
  assert(firstTimestamp && nextTimestamp && firstTimestamp !== nextTimestamp, "live event stream did not auto-update");

  await page.screenshot({ path: "output/playwright/dashboard-smoke.png", fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await mobile.getByRole("heading", { name: "Product analytics" }).waitFor();
  await mobile.getByRole("button", { name: /Retention/ }).click();
  await mobile.getByText("Cohort retention").waitFor();
  const overflow = await mobile.evaluate(() => {
    const documentOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1;
    const overflowingElements = [...document.body.querySelectorAll("*")].filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    }).map(el => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.className ? `.${String(el.className).trim().replace(/\s+/g, ".")}` : ""}`);
    return { documentOverflow, overflowingElements };
  });
  assert(!overflow.documentOverflow, "mobile layout has document-level horizontal overflow");
  assert(overflow.overflowingElements.length === 0, `mobile elements overflow horizontally: ${overflow.overflowingElements.join(", ")}`);
  await mobile.screenshot({ path: "output/playwright/dashboard-mobile.png", fullPage: true });
  await mobile.close();

  console.log("smoke passed: sections, event schema/filter, live updates, funnels, cohorts, flags, theme toggle, range/refresh, canvas charts, and mobile overflow");
} finally {
  await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
