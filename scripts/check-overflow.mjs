import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:3000/dashboard';
const width = Number(process.argv[3] ?? 375);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width, height: 812 } });
await page.goto(url, { waitUntil: 'networkidle' });

const result = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.right > vw + 1) {
      // alleen 'bladeren' rapporteren: elementen zonder te breed kind
      const hasWideChild = [...el.children].some((c) => {
        const cr = c.getBoundingClientRect();
        return cr.width > vw + 1 || cr.right > vw + 1;
      });
      if (!hasWideChild) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString() ?? '').slice(0, 120),
          w: Math.round(r.width),
          right: Math.round(r.right),
        });
      }
    }
  }
  return {
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 15),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
