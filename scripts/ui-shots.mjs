import { chromium } from 'playwright-core';

const routes = process.argv[2]
  ? [process.argv[2]]
  : ['/dashboard', '/project/demo-project-001', '/project/demo-project-001/trace/trace-ls-001', '/acties', '/rapportage', '/project/demo-project-001/planning'];
const widths = [375, 768, 1440];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const route of routes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const name = route.replaceAll('/', '_') || '_root';
    await page.screenshot({ path: `/tmp/ui-shots/pw${name}-${width}.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`${route} @${width}: scrollWidth=${sw}${sw > width ? '  << OVERFLOW' : ''}`);
    await page.close();
  }
}
await browser.close();
