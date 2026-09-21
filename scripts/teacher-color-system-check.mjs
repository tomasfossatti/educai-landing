import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/teacher-colors';
await fs.mkdir(out, { recursive: true });
const failures = [];
const results = [];

const RGB = {
  surface1: 'rgb(16, 23, 38)',
  surface2: 'rgb(21, 30, 50)',
  surfaceSecondary: 'rgb(13, 19, 34)',
  borderSubtle: 'rgb(32, 42, 61)',
  borderStrong: 'rgb(50, 68, 107)',
  primary: 'rgb(120, 150, 238)',
  primaryHover: 'rgb(139, 167, 246)',
  primaryMuted: 'rgb(23, 33, 59)',
  primaryBorder: 'rgb(52, 73, 125)',
  textPrimary: 'rgb(241, 244, 251)',
  textSecondary: 'rgb(167, 177, 198)',
  textTertiary: 'rgb(142, 153, 176)',
  eyebrow: 'rgb(130, 157, 232)',
  success: 'rgb(81, 198, 165)',
  neutralBg: 'rgb(21, 27, 41)',
  neutralBorder: 'rgb(42, 52, 72)',
  neutralText: 'rgb(170, 180, 199)',
  privacyText: 'rgb(148, 160, 184)'
};

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

function eq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
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
    await page.locator('.teacher-dashboard').waitFor({ state: 'visible', timeout: 20000 });
    if (await page.locator('.teacher-course-card').count() < 2) throw new Error(`${label}: expected seeded teacher cards`);

    const data = await page.evaluate(() => {
      const style = (sel, pseudo = null) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const s = getComputedStyle(el, pseudo);
        return { color:s.color, backgroundColor:s.backgroundColor, backgroundImage:s.backgroundImage, borderColor:s.borderColor, boxShadow:s.boxShadow };
      };
      return {
        body: style('body'), topbar: style('.topbar'), userMenu: style('.user-menu-summary'), eyebrow: style('.teacher-dashboard-header .eyebrow'),
        h1: style('.teacher-dashboard-header h1'), intro: style('.teacher-dashboard-header p'), create: style('.teacher-create-course'),
        card: style('.teacher-course-card'), evidenceCard: style('.teacher-course-card.has-evidence'), neutralBadge: style('.teacher-status-badge.neutral'),
        evidenceBadge: style('.teacher-status-badge.evidence'), desc: style('.teacher-course-description'), meta: style('.teacher-course-meta'),
        cta: style('.teacher-course-cta'), privacy: style('.teacher-dashboard-privacy'), privacyDot: style('.teacher-dashboard-privacy','::before'),
        viewport: { width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth }
      };
    });

    if (data.viewport.scrollWidth > data.viewport.width) throw new Error(`${label}: horizontal overflow`);
    if (!data.body.backgroundImage.includes('radial-gradient')) throw new Error(`${label}: controlled radial canvas missing`);
    if (data.card.backgroundImage !== 'none' || data.evidenceCard.backgroundImage !== 'none') throw new Error(`${label}: course card gradient remains`);
    eq(data.card.backgroundColor, RGB.surface1, `${label}: card surface`);
    eq(data.evidenceCard.backgroundColor, RGB.surface1, `${label}: evidence surface`);
    eq(data.card.borderColor, RGB.borderSubtle, `${label}: card border`);
    eq(data.evidenceCard.borderColor, RGB.primaryBorder, `${label}: evidence border`);
    eq(data.create.backgroundColor, RGB.primary, `${label}: create bg`);
    eq(data.create.borderColor, RGB.primaryHover, `${label}: create border`);
    eq(data.cta.backgroundColor, RGB.primaryMuted, `${label}: workspace CTA bg`);
    eq(data.neutralBadge.backgroundColor, RGB.neutralBg, `${label}: neutral badge bg`);
    eq(data.neutralBadge.borderColor, RGB.neutralBorder, `${label}: neutral badge border`);
    eq(data.neutralBadge.color, RGB.neutralText, `${label}: neutral badge text`);
    eq(data.evidenceBadge.backgroundColor, RGB.primaryMuted, `${label}: evidence badge bg`);
    eq(data.evidenceBadge.borderColor, RGB.primaryBorder, `${label}: evidence badge border`);
    eq(data.evidenceBadge.color, RGB.primaryHover, `${label}: evidence badge text`);
    eq(data.desc.color, RGB.textSecondary, `${label}: description`);
    eq(data.meta.color, RGB.textTertiary, `${label}: metadata`);
    eq(data.eyebrow.color, RGB.eyebrow, `${label}: eyebrow`);
    eq(data.privacy.backgroundColor, RGB.surfaceSecondary, `${label}: privacy bg`);
    eq(data.privacy.borderColor, RGB.borderSubtle, `${label}: privacy border`);
    eq(data.privacy.color, RGB.privacyText, `${label}: privacy text`);
    eq(data.privacyDot.backgroundColor, RGB.success, `${label}: privacy success dot`);
    eq(data.userMenu.borderColor, RGB.borderSubtle, `${label}: user selector border`);
    eq(data.h1.color, RGB.textPrimary, `${label}: H1`);
    eq(data.intro.color, RGB.textSecondary, `${label}: intro`);
    if (data.card.boxShadow !== 'none' || data.evidenceCard.boxShadow !== 'none') throw new Error(`${label}: course card glow/shadow remains`);

    const card = page.locator('.teacher-course-card').first();
    await card.hover();
    await page.waitForTimeout(320);
    const hover = await card.evaluate(el => { const s=getComputedStyle(el); return {backgroundColor:s.backgroundColor,borderColor:s.borderColor,boxShadow:s.boxShadow}; });
    eq(hover.backgroundColor, RGB.surface2, `${label}: card hover bg`);
    eq(hover.borderColor, RGB.borderStrong, `${label}: card hover border`);
    if (hover.boxShadow !== 'none') throw new Error(`${label}: hover glow/shadow remains`);

    if (consoleErrors.length || pageErrors.length) throw new Error(`${label}: browser errors ${JSON.stringify({consoleErrors,pageErrors})}`);
    results.push({ label, data, hover });
    await page.screenshot({ path:`${out}/${label}.png`, fullPage:true });
  } catch (e) {
    failures.push(`${label}: ${e?.stack || e}`);
    await page.screenshot({ path:`${out}/${label}-failure.png`, fullPage:true }).catch(()=>{});
  } finally { await context.close(); }
}

const browser = await chromium.launch({ headless:true });
await inspect(browser, 'teacher-colors-1440', {width:1440,height:1000});
await inspect(browser, 'teacher-colors-390', {width:390,height:844});
await browser.close();
await fs.writeFile(`${out}/report.json`, JSON.stringify({results,failures}, null, 2));
console.log(JSON.stringify({checked:results.map(r=>r.label),failures}, null, 2));
if (failures.length) process.exit(1);
