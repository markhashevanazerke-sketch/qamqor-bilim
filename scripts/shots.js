/**
 * one-shot: responsive visual audit — screenshots every view at 4 widths.
 * Uses system Google Chrome via puppeteer-core.
 */
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "/home/yernur/.local/bin/google-chrome";
const OUT = path.join(__dirname, "..", "shots");
const URL = "http://localhost:3000";

const VIEWS = ["hub", "library", "reader", "adapter", "todo", "schedule", "aac"];
const VPORTS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "tablet", w: 820, h: 1180 },
  { name: "phone", w: 390, h: 844 },
  { name: "tiny", w: 320, h: 740 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });

  for (const vp of VPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 600));

    for (const view of VIEWS) {
      await page.evaluate((v) => navigateView(v), view);
      await new Promise((r) => setTimeout(r, 500));
      const file = path.join(OUT, `${vp.name}--${view}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("shot:", path.basename(file));
    }

    // Mobile: also capture the calm-break modal (bottom sheet) on phone/tiny
    if (vp.name === "phone" || vp.name === "tiny") {
      await page.evaluate(() => navigateView("hub"));
      await new Promise((r) => setTimeout(r, 300));
      await page.evaluate(() => openCalmBreakModal());
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(OUT, `${vp.name}--modal.png`), fullPage: false });
      console.log("shot:", `${vp.name}--modal.png`);
    }
    await page.close();
  }

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
