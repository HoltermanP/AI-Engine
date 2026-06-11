/**
 * E2E-test van de ontwerpflow in een echte browser:
 * waypoints klikken → tracé berekenen → alternatief → opslaan.
 * Gebruik: node scripts/e2e-ontwerpflow.mjs [traceUrl]
 */
import { chromium } from 'playwright-core';

const url =
  process.argv[2] ?? 'http://localhost:3000/project/demo-project-001/trace/trace-ls-001';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleFouten = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleFouten.push(msg.text().slice(0, 160));
});
page.on('pageerror', (err) => consoleFouten.push(`pageerror: ${String(err).slice(0, 160)}`));

console.log('1. Pagina laden…');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);

const canvas = await page.locator('canvas').first().boundingBox();
if (!canvas) throw new Error('Geen kaartcanvas gevonden');

console.log('2. Twee waypoints klikken (auto-modus staat standaard aan)…');
await page.mouse.click(canvas.x + canvas.width * 0.35, canvas.y + canvas.height * 0.5);
await page.waitForTimeout(800);
await page.mouse.click(canvas.x + canvas.width * 0.7, canvas.y + canvas.height * 0.45);
await page.waitForTimeout(800);

const puntenBadge = await page
  .locator('text=/\\d+ punten/')
  .first()
  .textContent()
  .catch(() => null);
console.log(`   waypoints geplaatst: ${puntenBadge ?? 'BADGE NIET GEVONDEN'}`);

console.log('3. Tracé berekenen (kan ~30–60 s duren)…');
await page.getByRole('button', { name: /bereken tracé/i }).click();

const klaar = await Promise.race([
  page
    .waitForSelector('text=/Route-alternatieven|Aanbevolen/', { timeout: 120000 })
    .then(() => 'alternatieven'),
  page
    .waitForSelector('text=/Geen route|mislukt/i', { timeout: 120000 })
    .then(() => 'fout'),
]).catch(() => 'timeout');
console.log(`   resultaat: ${klaar}`);

if (klaar === 'alternatieven') {
  console.log('4. Berekend tracé opslaan…');
  await page.getByRole('button', { name: /berekend tracé opslaan/i }).click();
  const opgeslagen = await page
    .waitForSelector('text=/opgeslagen/i', { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  console.log(`   opgeslagen: ${opgeslagen ? 'JA' : 'NEE'}`);
} else {
  const fouttekst = await page
    .locator('.text-red-700, .text-red-600')
    .first()
    .textContent()
    .catch(() => null);
  console.log(`   fouttekst: ${fouttekst ?? '-'}`);
}

await page.screenshot({ path: '/tmp/e2e-ontwerpflow.png' });
console.log(`5. Console-fouten: ${consoleFouten.length}`);
for (const f of consoleFouten.slice(0, 6)) console.log(`   - ${f}`);
console.log('Screenshot: /tmp/e2e-ontwerpflow.png');

await browser.close();
process.exit(klaar === 'alternatieven' ? 0 : 1);
