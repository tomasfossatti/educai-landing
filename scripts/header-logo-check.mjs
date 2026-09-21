import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/header-logo';
await fs.mkdir(out, { recursive: true });
const failures = [];
const results = [];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByLabel('Email').fill('docente@educai.demo');
  await page.getByLabel('Contraseña').fill('educai-demo');
  await Promise.all([
    page.waitForURL(`${BASE}/teacher`, { timeout: 120000 }),
    page.getByRole('button', { name: 'Ingresar' }).click(),
  ]);
  await page.waitForLoadState('networkidle');
}

async function inspect(browser, label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e)));
  try {
    await login(page);
    const logo = page.locator('.brand-logo');
    await logo.waitFor({ state: 'visible', timeout: 20000 });
    const data = await logo.evaluate(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight,
        src: el.getAttribute('src'), objectFit: s.objectFit,
        topbarHeight: document.querySelector('.topbar')?.getBoundingClientRect().height ?? null,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    if (!data.src?.includes('/educai-logo-header.png')) throw new Error(`${label}: unexpected logo src ${data.src}`);
    if (data.naturalWidth !== 701 || data.naturalHeight !== 200) throw new Error(`${label}: unexpected natural size ${data.naturalWidth}x${data.naturalHeight}`);
    const expectedHeight = viewport.width <= 620 ? 32 : 36;
    if (Math.abs(data.height - expectedHeight) > 1) throw new Error(`${label}: rendered height ${data.height}px, expected ${expectedHeight}px`);
    if (data.width < 95 || data.width > 150) throw new Error(`${label}: suspicious rendered width ${data.width}px`);
    if (data.objectFit !== 'contain') throw new Error(`${label}: object-fit is ${data.objectFit}`);
    if (data.scrollWidth > data.viewportWidth) throw new Error(`${label}: horizontal overflow`);
    if (data.topbarHeight && data.topbarHeight > 80) throw new Error(`${label}: topbar grew unexpectedly to ${data.topbarHeight}px`);
    if (consoleErrors.length || pageErrors.length) throw new Error(`${label}: browser errors ${JSON.stringify({consoleErrors,pageErrors})}`);
    results.push({ label, ...data, consoleErrors, pageErrors });
    await page.screenshot({ path: `${out}/${label}.png`, fullPage: false });
  } catch (e) {
    failures.push(`${label}: ${e?.stack || e}`);
    await page.screenshot({ path: `${out}/${label}-failure.png`, fullPage: false }).catch(()=>{});
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
await inspect(browser, 'header-1440', { width: 1440, height: 500 });
await inspect(browser, 'header-390', { width: 390, height: 500 });
await browser.close();
await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
console.log(JSON.stringify({ results, failures }, null, 2));
if (failures.length) process.exit(1);
