import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/teacher-dashboard';
await fs.mkdir(out, { recursive: true });
const results = [];
const failures = [];

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

async function inspectViewport(browser, label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(String(err)));

  try {
    await login(page);
    await page.locator('.teacher-dashboard').waitFor({ state: 'visible', timeout: 20000 });

    const cardCount = await page.locator('.teacher-course-card').count();
    if (cardCount < 1) throw new Error(`${label}: no teacher course cards available for visual validation`);

    const geometry = await page.evaluate(() => {
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
      };
      const cards = [...document.querySelectorAll('.teacher-course-card')];
      const first = cards[0];
      const second = cards[1] || null;
      const parts = (card) => card ? {
        card: rect(card),
        header: rect(card.querySelector('.teacher-course-card-header')),
        description: rect(card.querySelector('.teacher-course-description')),
        divider: rect(card.querySelector('.teacher-course-divider')),
        meta: rect(card.querySelector('.teacher-course-meta')),
        cta: rect(card.querySelector('.teacher-course-cta')),
        badge: rect(card.querySelector('.teacher-status-badge')),
      } : null;
      const h1 = document.querySelector('.teacher-dashboard-header h1');
      const h2 = document.querySelector('.teacher-courses-heading h2');
      const create = document.querySelector('.teacher-create-course');
      const privacy = document.querySelector('.teacher-dashboard-privacy');
      const grid = document.querySelector('.teacher-course-grid');
      return {
        viewport: { width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
        first: parts(first),
        second: parts(second),
        cardCount: cards.length,
        h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
        h2Size: h2 ? parseFloat(getComputedStyle(h2).fontSize) : null,
        create: rect(create),
        privacy: rect(privacy),
        grid: rect(grid),
        neutral: (() => { const el=document.querySelector('.teacher-status-badge.neutral'); return el ? { bg:getComputedStyle(el).backgroundColor, border:getComputedStyle(el).borderColor, color:getComputedStyle(el).color, svg:el.querySelectorAll('svg').length } : null; })(),
        evidence: (() => { const el=document.querySelector('.teacher-status-badge.evidence'); return el ? { bg:getComputedStyle(el).backgroundColor, border:getComputedStyle(el).borderColor, color:getComputedStyle(el).color, svg:el.querySelectorAll('svg').length } : null; })(),
        badgeSvgCounts: cards.map(card => card.querySelectorAll('.teacher-status-badge svg').length),
      };
    });

    if (geometry.viewport.scrollWidth > geometry.viewport.width) throw new Error(`${label}: horizontal overflow ${geometry.viewport.scrollWidth} > ${geometry.viewport.width}`);
    if (!geometry.first?.card || !geometry.first.header || !geometry.first.description || !geometry.first.divider || !geometry.first.meta || !geometry.first.cta) throw new Error(`${label}: first card structure incomplete`);
    if (geometry.first.cta.height < 39.5) throw new Error(`${label}: CTA hit area too small (${geometry.first.cta.height}px)`);
    if (geometry.create && geometry.create.height < 43.5) throw new Error(`${label}: create-course hit area too small (${geometry.create.height}px)`);
    if (geometry.badgeSvgCounts.some(count => count !== 1)) throw new Error(`${label}: a status badge is missing its non-color icon`);

    if (viewport.width >= 1280) {
      if (geometry.h1Size > 38 || geometry.h1Size < 33.5) throw new Error(`${label}: H1 scale outside target (${geometry.h1Size}px)`);
      if (geometry.h2Size < 23.5 || geometry.h2Size > 27) throw new Error(`${label}: H2 scale outside target (${geometry.h2Size}px)`);
      if (geometry.first.card.height > 265) throw new Error(`${label}: first card remains too tall (${geometry.first.card.height}px)`);
      if (geometry.first.description.height < 49) throw new Error(`${label}: description row not reserved (${geometry.first.description.height}px)`);
      if (geometry.second) {
        const deltaHeight = Math.abs(geometry.first.card.height - geometry.second.card.height);
        const deltaDivider = Math.abs((geometry.first.divider.y-geometry.first.card.y) - (geometry.second.divider.y-geometry.second.card.y));
        const deltaMeta = Math.abs((geometry.first.meta.y-geometry.first.card.y) - (geometry.second.meta.y-geometry.second.card.y));
        const deltaCta = Math.abs((geometry.first.cta.y-geometry.first.card.y) - (geometry.second.cta.y-geometry.second.card.y));
        if (deltaHeight > 2) throw new Error(`${label}: card height mismatch ${deltaHeight}px`);
        if (deltaDivider > 2 || deltaMeta > 2 || deltaCta > 2) throw new Error(`${label}: internal rows are not aligned (${JSON.stringify({deltaDivider,deltaMeta,deltaCta})})`);
      }
      if (geometry.neutral && geometry.evidence) {
        if (geometry.neutral.bg === geometry.evidence.bg && geometry.neutral.border === geometry.evidence.border) throw new Error(`${label}: neutral/evidence badges are visually indistinguishable`);
        if (geometry.neutral.svg !== 1 || geometry.evidence.svg !== 1) throw new Error(`${label}: semantic badge icon missing`);
      }
      if (geometry.privacy && geometry.grid) {
        const gap = geometry.privacy.y - geometry.grid.bottom;
        if (gap > 26) throw new Error(`${label}: privacy banner too detached from courses (${gap}px)`);
      }

      const firstCard = page.locator('.teacher-course-card').first();
      const cta = firstCard.locator('.teacher-course-cta');
      const arrow = firstCard.locator('.teacher-course-cta-arrow');
      await firstCard.hover();
      const arrowTransform = await arrow.evaluate(el => getComputedStyle(el).transform);
      if (!arrowTransform || arrowTransform === 'none') throw new Error(`${label}: CTA arrow does not move on hover`);
      await firstCard.focus();
      const focusStyles = await firstCard.evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
      const ctaFocusShadow = await cta.evaluate(el => getComputedStyle(el).boxShadow);
      if (focusStyles.outline === 'none' || focusStyles.width === '0px') throw new Error(`${label}: course card focus-visible ring missing`);
      if (!ctaFocusShadow || ctaFocusShadow === 'none') throw new Error(`${label}: focused card does not reinforce CTA affordance`);
    }

    if (viewport.width <= 520) {
      if (geometry.first.badge.width > geometry.first.card.width - 20) throw new Error(`${label}: badge overflows mobile card`);
      if (geometry.first.header.width > geometry.first.card.width) throw new Error(`${label}: card header overflows mobile card`);
    }

    if (consoleErrors.length || pageErrors.length) throw new Error(`${label}: browser errors ${JSON.stringify({ consoleErrors, pageErrors })}`);

    results.push({ label, ...geometry, consoleErrors, pageErrors });
    await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
  } catch (error) {
    failures.push(`${label}: ${error?.stack || error}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
await inspectViewport(browser, 'teacher-1440', { width: 1440, height: 1000 });
await inspectViewport(browser, 'teacher-1024', { width: 1024, height: 800 });
await inspectViewport(browser, 'teacher-768', { width: 768, height: 900 });
await inspectViewport(browser, 'teacher-390', { width: 390, height: 844 });
await browser.close();

await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
console.log(JSON.stringify({ checked: results.map(r => r.label), failures }, null, 2));
if (failures.length) process.exit(1);
