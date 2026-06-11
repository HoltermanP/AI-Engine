/** App-brede audit: alle routes laden, console-fouten en overflow rapporteren. */
import { chromium } from 'playwright-core';

const routes = [
  '/dashboard',
  '/acties',
  '/rapportage',
  '/rapportage/demo-project-001',
  '/beheer',
  '/traces',
  '/config',
  '/project/demo-project-001',
  '/project/demo-project-001/planning',
  '/project/demo-project-001/dossier',
  '/project/demo-project-001/trace/trace-ls-001',
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let problemen = 0;

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fouten = [];
  page.on('console', (m) => {
    if (m.type() === 'error') fouten.push(m.text().slice(0, 120));
  });
  page.on('pageerror', (e) => fouten.push(`pageerror: ${String(e).slice(0, 120)}`));

  const resp = await page
    .goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 60000 })
    .catch(() => null);
  await page.waitForTimeout(2500);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => 0);

  const status = resp?.status() ?? 0;
  const ok = status === 200 && fouten.length === 0 && sw <= 1440;
  if (!ok) problemen++;
  console.log(
    `${ok ? '✓' : '✗'} ${route} — HTTP ${status}, ${fouten.length} console-fout(en), scrollWidth ${sw}`
  );
  for (const f of fouten.slice(0, 3)) console.log(`    - ${f}`);
  await page.close();
}

await browser.close();
console.log(problemen === 0 ? '\nAlle routes schoon.' : `\n${problemen} route(s) met problemen.`);
process.exit(problemen === 0 ? 0 : 1);
