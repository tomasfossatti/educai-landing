import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/obsidian-prod';
await fs.mkdir(out, { recursive: true });

const results = [];
const failures = [];
const record = (label, data = {}) => results.push({ label, ...data });

async function inspect(page, label) {
  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyBg: getComputedStyle(document.body).backgroundImage,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  record(label, state);
  if (state.overflowX) throw new Error(`${label}: horizontal overflow ${state.scrollWidth}px > ${state.width}px`);
  if (!state.bodyBg || state.bodyBg === 'none') throw new Error(`${label}: Obsidian background missing`);
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

async function openSpotlight(page, label) {
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Navegación rápida' });
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  record(`${label}-spotlight`, { text: (await dialog.innerText()).slice(0, 500) });
  await page.screenshot({ path: `${out}/${label}-spotlight.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
}

async function firstTeacherCoursePath(page) {
  const hrefs = await page.locator('a[href^="/teacher/courses/"]').evaluateAll((els) => els.map((a) => a.getAttribute('href')).filter(Boolean));
  const href = hrefs.find((value) => value !== '/teacher/courses/new');
  return href ? new URL(href, BASE).pathname : null;
}

async function scenario(name, viewport, fn) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  try {
    await fn(page);
    if (consoleErrors.length || pageErrors.length) throw new Error(`${name}: browser errors ${JSON.stringify({ consoleErrors, pageErrors })}`);
    record(`${name}-errors`, { consoleErrors, pageErrors });
  } catch (error) {
    failures.push(`${name}: ${error?.stack || error}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });

await scenario('public-1440', { width: 1440, height: 1000 }, async (page) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'login-1440');
  if (await page.locator('.obsidian-dotted-grid').count() !== 1) throw new Error('dotted grid missing on login');
  if (await page.locator('.obsidian-scroll-rail').count() !== 1) throw new Error('scroll rail missing on login');
  if (await page.locator('.obsidian-text-reveal').count() !== 1) throw new Error('text reveal missing on login');
  if (await page.locator('.obsidian-arrow-fill-btn').count() < 1) throw new Error('arrow fill button missing on login');
  await page.screenshot({ path: `${out}/login-1440.png`, fullPage: true });
  await openSpotlight(page, 'login-1440');

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'register-1440');
  const tabs = page.locator('.obsidian-magnet-tabs');
  if (await tabs.count() !== 1) throw new Error('magnet tabs missing on register');
  await page.getByRole('tab', { name: 'Docente' }).click();
  const role = await page.locator('input[name="role"]').inputValue();
  if (role !== 'TEACHER') throw new Error(`register role did not change: ${role}`);
  await page.screenshot({ path: `${out}/register-1440.png`, fullPage: true });
});

await scenario('student-390', { width: 390, height: 844 }, async (page) => {
  await login(page, 'estudiante1@educai.demo');
  await inspect(page, 'student-home-390');
  if (await page.locator('.obsidian-command-trigger').count() !== 1) throw new Error('command trigger missing');
  const slots = page.locator('.course-code-slot input');
  if (await slots.count() !== 8) throw new Error(`expected 8 course code slots, got ${await slots.count()}`);
  await slots.first().fill('DEMO2026');
  const hiddenCode = await page.locator('input[type="hidden"][name="joinCode"]').inputValue();
  if (hiddenCode !== 'DEMO2026') throw new Error(`segmented course code failed: ${hiddenCode}`);
  await page.screenshot({ path: `${out}/student-home-390.png`, fullPage: true });
  await openSpotlight(page, 'student-home-390');

  const courseLink = page.locator('a[href^="/student/courses/"]').first();
  if (await courseLink.count() !== 1) throw new Error('student course link missing');
  await Promise.all([
    page.waitForURL(/\/student\/courses\/[^/?#]+/, { timeout: 120000 }),
    courseLink.click(),
  ]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-course-390');
  await page.screenshot({ path: `${out}/student-course-390.png`, fullPage: true });

  const chatLink = page.locator('a[href^="/student/chat/"]').first();
  if (await chatLink.count() !== 1) throw new Error('student chat link missing');
  await Promise.all([
    page.waitForURL(/\/student\/chat\/[^/?#]+/, { timeout: 120000 }),
    chatLink.click(),
  ]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-chat-390');
  const composer = page.locator('.composer-wrap');
  if (await composer.count() !== 1) throw new Error('chat composer missing');
  if (await composer.locator('.obsidian-arrow-fill-btn').count() !== 1) throw new Error('Obsidian chat submit missing');
  const box = await composer.boundingBox();
  record('student-chat-composer-390', { box, viewport: page.viewportSize() });
  if (!box) throw new Error('chat composer bounding box missing');
  await page.screenshot({ path: `${out}/student-chat-390.png`, fullPage: false });
});

await scenario('student-320', { width: 320, height: 700 }, async (page) => {
  await login(page, 'estudiante2@educai.demo');
  await inspect(page, 'student-home-320');
  const slots = page.locator('.course-code-slot input');
  if (await slots.count() !== 8) throw new Error('course code slots missing at 320px');
  await page.screenshot({ path: `${out}/student-home-320.png`, fullPage: false });
});

await scenario('teacher-1440', { width: 1440, height: 1000 }, async (page) => {
  await login(page, 'docente@educai.demo');
  await inspect(page, 'teacher-home-1440');
  await page.screenshot({ path: `${out}/teacher-home-1440.png`, fullPage: true });
  await openSpotlight(page, 'teacher-home-1440');
  const path = await firstTeacherCoursePath(page);
  if (!path) throw new Error('teacher course link missing');

  const views = ['summary', 'content', 'activities', 'insights', 'classes', 'settings'];
  for (const view of views) {
    await page.goto(`${BASE}${path}?view=${view}`, { waitUntil: 'networkidle', timeout: 120000 });
    await inspect(page, `teacher-${view}-1440`);
    const active = page.locator('.course-nav-link[aria-current="page"]');
    if (await active.count() !== 1) throw new Error(`teacher ${view}: active nav missing`);
    if (view === 'insights' || view === 'classes') await page.screenshot({ path: `${out}/teacher-${view}-1440.png`, fullPage: true });
  }
});

await scenario('teacher-375', { width: 375, height: 812 }, async (page) => {
  await login(page, 'docente@educai.demo');
  const path = await firstTeacherCoursePath(page);
  if (!path) throw new Error('teacher course link missing on mobile');
  await page.goto(`${BASE}${path}?view=summary`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'teacher-summary-375');
  const nav = page.locator('.course-nav');
  if (await nav.count() !== 1) throw new Error('teacher mobile nav missing');
  if (await nav.locator('[aria-current="page"]').count() !== 1) throw new Error('teacher mobile active state missing');
  await page.screenshot({ path: `${out}/teacher-summary-375.png`, fullPage: false });
});

await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
await browser.close();
console.log(JSON.stringify({ checked: results.map((item) => item.label), failures }, null, 2));
if (failures.length) process.exit(1);
