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
    const wordmark = page.locator('.brand-wordmark');
    await wordmark.waitFor({ state: 'visible', timeout: 20000 });
    const data = await wordmark.evaluate(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const base = el.querySelector('.brand-wordmark-base');
      const ai = el.querySelector('.brand-wordmark-ai');
      const aiStyle = ai ? getComputedStyle(ai) : null;
      const baseStyle = base ? getComputedStyle(base) : null;
      const brand = el.closest('.brand');
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        text: el.textContent,
        fontSize: parseFloat(s.fontSize),
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        whiteSpace: s.whiteSpace,
        baseColor: baseStyle?.color ?? null,
        aiBackgroundImage: aiStyle?.backgroundImage ?? null,
        aiBackgroundClip: aiStyle?.backgroundClip ?? null,
        aiWebkitTextFill: aiStyle?.webkitTextFillColor ?? null,
        imageCount: brand?.querySelectorAll('img').length ?? -1,
        topbarHeight: document.querySelector('.topbar')?.getBoundingClientRect().height ?? null,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    if (data.text !== 'educai') throw new Error(`${label}: unexpected wordmark text ${data.text}`);
    if (data.imageCount !== 0) throw new Error(`${label}: brand still contains an image`);
    const expectedSize = viewport.width <= 620 ? 27 : 30;
    if (Math.abs(data.fontSize - expectedSize) > 1) throw new Error(`${label}: font-size ${data.fontSize}px, expected ${expectedSize}px`);
    if (!data.aiBackgroundImage || data.aiBackgroundImage === 'none') throw new Error(`${label}: ai gradient missing`);
    if (data.aiBackgroundClip !== 'text') throw new Error(`${label}: ai background-clip is ${data.aiBackgroundClip}`);
    if (data.whiteSpace !== 'nowrap') throw new Error(`${label}: wordmark can wrap`);
    if (data.width < 70 || data.width > 150) throw new Error(`${label}: suspicious wordmark width ${data.width}px`);
    if (data.scrollWidth > data.viewportWidth) throw new Error(`${label}: horizontal overflow`);
    if (data.topbarHeight && data.topbarHeight > 70) throw new Error(`${label}: topbar grew unexpectedly to ${data.topbarHeight}px`);
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
