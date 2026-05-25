import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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
  await page.getByRole("heading", { name: "Acme Analytics" }).waitFor();
  await page.getByText("Activation funnel").waitFor();
  await page.getByText("Weekly retention").waitFor();
  await page.getByText("Feature flags").first().waitFor();
  await page.getByText("Live event stream").waitFor();
  await page.getByRole("button", { name: "7d" }).click();
  await page.getByLabel("Search analytics").fill("feature_flag_called");
  await page.getByText("feature_flag_called").first().waitFor();
  await page.getByLabel("Search analytics").fill("");
  await page.getByLabel("Toggle new-query-builder").click();
  await page.getByText("2/5 enabled").waitFor();
  await page.getByTitle("Toggle dark mode").click();
  await page.screenshot({ path: "output/playwright/dashboard-smoke.png", fullPage: true });
  console.log("smoke passed: dashboard sections, chart controls, search, flag toggle, and theme toggle work");
} finally {
  await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
