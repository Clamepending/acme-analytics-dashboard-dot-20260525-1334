import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { existsSync } from "node:fs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= ".pw-browsers";
const { chromium } = await import("playwright");

const root = process.cwd();
const port = 4173;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

const server = createServer(async (request, response) => {
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

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`server listening: http://127.0.0.1:${port}/docs/`);
await mkdir("output/playwright", { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const launchOptions = process.env.USE_SYSTEM_CHROME && existsSync(chromePath) ? { executablePath: chromePath } : {};
const browserName = process.env.PLAYWRIGHT_BROWSER || "chromium";
const browserType = browserName === "firefox" ? (await import("playwright")).firefox : chromium;
const browser = await browserType.launch(browserName === "chromium" ? launchOptions : {});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  page.setDefaultTimeout(10000);
  await page.goto(`http://127.0.0.1:${port}/docs/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("page loaded");
  await page.getByRole("heading", { name: "Product analytics" }).waitFor();
  await page.getByText("Activation funnel").waitFor();
  await page.getByText("Cohort retention").waitFor();
  await page.getByText("Feature flags").first().waitFor();
  await page.getByText("Live event stream").waitFor();
  await page.locator("#eventChart").evaluate(canvas => {
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels.some((value, index) => index % 4 !== 3 && value !== 0)) throw new Error("event chart is blank");
  });
  await page.getByRole("button", { name: /Events/ }).click();
  await page.locator("#search").fill("signup");
  await page.getByText("signup").first().waitFor();
  await page.locator("#search").fill("");
  await page.getByRole("button", { name: /Flags/ }).click();
  const firstSwitch = page.locator(".switch").first();
  await firstSwitch.click();
  await firstSwitch.evaluate(el => {
    if (!el.classList.contains("off")) throw new Error("feature flag toggle did not switch off");
  });
  await page.locator("#range").selectOption("Last 7 days");
  await page.getByRole("button", { name: "Refresh data" }).click();
  await page.screenshot({ path: "output/playwright/dashboard-smoke.png", fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`http://127.0.0.1:${port}/docs/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await mobile.getByRole("heading", { name: "Product analytics" }).waitFor();
  await mobile.getByRole("button", { name: /Retention/ }).click();
  await mobile.getByText("Cohort retention").waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("mobile layout has horizontal overflow");
  await mobile.screenshot({ path: "output/playwright/dashboard-mobile.png", fullPage: true });
  await mobile.close();
  console.log("smoke passed: dashboard sections, canvas chart, search, nav, range, refresh, and flag toggle work");
} finally {
  await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
