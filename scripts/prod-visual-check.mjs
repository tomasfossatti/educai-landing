import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/prod-visual';
await fs.mkdir(out, { recursive: true });
const results = [];
function record(label, data = {}) { results.push({ label, ...data }); }

async function inspect(page, label) {
  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText.slice(0, 1200),
  }));
  record(label, state);
  if (state.overflowX) throw new Error(`${label}: horizontal overflow ${state.scrollWidth}px > ${state.width}px`);
}

async function login(page, email) {
  const destination = email.startsWith('docente') ? '/teacher' : '/student';
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('educai-demo');
  await Promise.all([
    page.waitForURL(`${BASE}${destination}`, { timeout: 120000 }),
    page.getByRole('button', { name: 'Ingresar' }).click(),
  ]);
  await page.waitForLoadState('networkidle');
}

async function demoTeacherCourse(page) {
  const demo = page.getByRole('link').filter({ hasText: 'Sociología I · Demo' }).first();
  const href = await demo.getAttribute('href');
  if (href) return href.split('?')[0];
  const hrefs = await page.locator('a[href^="/teacher/courses/"]').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  const fallback = hrefs.find((value) => value && value !== '/teacher/courses/new');
  return fallback?.split('?')[0] ?? null;
}

const browser = await chromium.launch({ headless: true });
const failures = [];
async function scenario(name, viewport, fn) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  try {
    await fn(page);
    if (consoleErrors.length || pageErrors.length) throw new Error(`${name}: browser errors ${JSON.stringify({ consoleErrors, pageErrors })}`);
    record(`${name}-errors`, { consoleErrors, pageErrors });
  } catch (error) {
    failures.push(`${name}: ${error?.stack || error}`);
  } finally { await context.close(); }
}

await scenario('public-desktop', { width: 1440, height: 1000 }, async (page) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'login-1440');
  await page.screenshot({ path: `${out}/login-1440.png`, fullPage: true });
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'register-1440');
  await page.screenshot({ path: `${out}/register-1440.png`, fullPage: true });
});

await scenario('student-390', { width: 390, height: 844 }, async (page) => {
  await login(page, 'estudiante1@educai.demo');
  await inspect(page, 'student-home-390');
  await page.screenshot({ path: `${out}/student-home-390.png`, fullPage: true });

  const courseLink = page.getByRole('link', { name: /Abrir curso/ }).first();
  await Promise.all([
    page.waitForURL(/\/student\/courses\/[^/?#]+$/, { timeout: 120000 }),
    courseLink.click(),
  ]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-course-390');
  await page.screenshot({ path: `${out}/student-course-390.png`, fullPage: true });

  const activity = page.locator('a[href^="/student/chat/"]').first();
  if (await activity.count() !== 1) throw new Error('student chat link not found');
  await Promise.all([
    page.waitForURL(/\/student\/chat\/[^/?#]+$/, { timeout: 120000 }),
    activity.click(),
  ]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-chat-390');
  const composer = page.locator('.composer-wrap');
  const box = await composer.boundingBox();
  record('student-chat-composer-390', { box, viewport: page.viewportSize() });
  if (!box) throw new Error('student chat composer not found');
  const textarea = page.getByLabel('Tu mensaje');
  if (!(await textarea.isVisible())) throw new Error('student chat textarea not visible');
  await page.screenshot({ path: `${out}/student-chat-390.png`, fullPage: false });
});

await scenario('student-320', { width: 320, height: 700 }, async (page) => {
  await login(page, 'estudiante2@educai.demo');
  const courseLink = page.getByRole('link', { name: /Abrir curso/ }).first();
  await Promise.all([
    page.waitForURL(/\/student\/courses\/[^/?#]+$/, { timeout: 120000 }),
    courseLink.click(),
  ]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-course-320');
  await page.screenshot({ path: `${out}/student-course-320.png`, fullPage: false });
});

await scenario('teacher-1440', { width: 1440, height: 1000 }, async (page) => {
  await login(page, 'docente@educai.demo');
  await inspect(page, 'teacher-home-1440');
  await page.screenshot({ path: `${out}/teacher-home-1440.png`, fullPage: true });
  const target = await demoTeacherCourse(page);
  if (!target) throw new Error('teacher demo course link not found');

  const views = [
    ['summary', 'teacher-summary-1440'],
    ['content', 'teacher-content-1440'],
    ['activities', 'teacher-activities-1440'],
    ['insights', 'teacher-insights-1440'],
    ['classes', 'teacher-classes-1440'],
    ['settings', 'teacher-settings-1440'],
  ];
  for (const [view, label] of views) {
    await page.goto(`${BASE}${target}?view=${view}`, { waitUntil: 'networkidle', timeout: 120000 });
    await inspect(page, label);
    const current = page.locator('.course-nav [aria-current="page"]');
    if (await current.count() !== 1) throw new Error(`teacher ${view}: expected one aria-current nav item`);
    await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
  }
});

await scenario('teacher-375', { width: 375, height: 812 }, async (page) => {
  await login(page, 'docente@educai.demo');
  const target = await demoTeacherCourse(page);
  if (!target) throw new Error('teacher demo course link not found');
  await page.goto(`${BASE}${target}?view=summary`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'teacher-course-375');
  const nav = page.locator('.course-nav');
  if (await nav.count() !== 1) throw new Error('mobile course nav not found');
  record('teacher-mobile-nav-375', { text: await nav.innerText() });
  const current = page.locator('.course-nav [aria-current="page"]');
  if (await current.count() !== 1) throw new Error('mobile current nav item not found');
  await page.screenshot({ path: `${out}/teacher-course-375.png`, fullPage: false });
});

await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
await browser.close();
console.log(JSON.stringify({ checked: results.map((r) => r.label), failures }, null, 2));
if (failures.length) process.exit(1);
