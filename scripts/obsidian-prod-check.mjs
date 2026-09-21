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
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyBg: getComputedStyle(document.body).backgroundImage,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  record(label, state);
  if (state.overflowX) throw new Error(`${label}: horizontal overflow ${state.scrollWidth}px > ${state.width}px`);
  if (!state.bodyBg || state.bodyBg === 'none') throw new Error(`${label}: Obsidian background missing`);
  if (!state.colorScheme.includes('dark')) throw new Error(`${label}: dark color scheme missing`);
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

async function openJoinCourse(page) {
  const trigger = page.getByText('+ Unirme a un curso', { exact: true });
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  const slots = page.locator('.course-code-slot input');
  await slots.first().waitFor({ state: 'visible', timeout: 10000 });
  if (await slots.count() !== 8) throw new Error(`expected 8 course code slots, got ${await slots.count()}`);
  return slots;
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
  if (await page.locator('.obsidian-dotted-grid').count() !== 1) throw new Error('dotted grid missing');
  if (await page.locator('.obsidian-scroll-rail').count() !== 0) throw new Error('decorative scroll rail should be removed');
  if (await page.locator('.obsidian-command-trigger').count() !== 0) throw new Error('global command trigger should be removed');
  await page.screenshot({ path: `${out}/login-1440.png`, fullPage: true });
});

await scenario('student-390', { width: 390, height: 844 }, async (page) => {
  await login(page, 'estudiante1@educai.demo');
  await inspect(page, 'student-home-390');
  if (await page.locator('.user-menu').count() !== 1) throw new Error('user menu missing');
  if (await page.getByText('Tu próximo paso', { exact: true }).count()) throw new Error('legacy next-step hierarchy still present');
  if (await page.locator('.continue-card').count() > 1) throw new Error('more than one primary continuation card');
  const slots = await openJoinCourse(page);
  await slots.first().fill('DEMO2026');
  const hiddenCode = await page.locator('input[type="hidden"][name="joinCode"]').inputValue();
  if (hiddenCode !== 'DEMO2026') throw new Error(`segmented course code failed: ${hiddenCode}`);
  await page.screenshot({ path: `${out}/student-home-390.png`, fullPage: true });

  const courseLink = page.locator('a[href^="/student/courses/"]').first();
  await Promise.all([page.waitForURL(/\/student\/courses\/[^/?#]+/, { timeout: 120000 }), courseLink.click()]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-course-390');
  if (await page.getByText('Qué hacer a continuación', { exact: true }).count()) throw new Error('duplicated next-step section still present');
  if (await page.getByText('Mis conversaciones', { exact: true }).count()) throw new Error('duplicated conversations section still present');
  if (await page.locator('.student-activity-row').count() < 1) throw new Error('activity rows missing');
  await page.screenshot({ path: `${out}/student-course-390.png`, fullPage: true });

  const chatLink = page.locator('a.activity-hit-area[href^="/student/chat/"]').first();
  await Promise.all([page.waitForURL(/\/student\/chat\/[^/?#]+/, { timeout: 120000 }), chatLink.click()]);
  await page.waitForLoadState('networkidle');
  await inspect(page, 'student-chat-390');
  if (await page.locator('.privacy-disclosure').count() !== 1) throw new Error('compact privacy disclosure missing');
  if (await page.locator('.composer-send').count() !== 1) throw new Error('integrated send button missing');
  if (await page.getByText('Tutor listo para responder', { exact: true }).count()) throw new Error('redundant ready state still visible');
  if (await page.locator('.message.assistant').count()) {
    const assistantText = await page.locator('.message.assistant').last().innerText();
    if (/^##\s/m.test(assistantText) || assistantText.includes('**')) throw new Error(`markdown syntax leaked to UI: ${assistantText.slice(0,160)}`);
  }
  const titleSize = await page.locator('.tutor-header h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  if (titleSize > 44) throw new Error(`tutor title still too large: ${titleSize}px`);
  const composerBox = await page.locator('.composer').boundingBox();
  record('student-chat-composer-390', { composerBox });
  await page.screenshot({ path: `${out}/student-chat-390.png`, fullPage: false });
});

await scenario('student-320', { width: 320, height: 700 }, async (page) => {
  await login(page, 'estudiante2@educai.demo');
  await inspect(page, 'student-home-320');
  await openJoinCourse(page);
  await page.screenshot({ path: `${out}/student-home-320.png`, fullPage: false });
});

await scenario('teacher-1440', { width: 1440, height: 1000 }, async (page) => {
  await login(page, 'docente@educai.demo');
  await inspect(page, 'teacher-home-1440');
  if (await page.locator('.user-menu').count() !== 1) throw new Error('teacher user menu missing');
  await page.screenshot({ path: `${out}/teacher-home-1440.png`, fullPage: true });
  const path = await firstTeacherCoursePath(page);
  if (!path) throw new Error('teacher course link missing');
  for (const view of ['summary','content','activities','insights','classes','settings']) {
    await page.goto(`${BASE}${path}?view=${view}`, { waitUntil: 'networkidle', timeout: 120000 });
    await inspect(page, `teacher-${view}-1440`);
    if (await page.locator('.course-nav-link[aria-current="page"]').count() !== 1) throw new Error(`teacher ${view}: active nav missing`);
  }
  await page.goto(`${BASE}${path}?view=summary`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.screenshot({ path: `${out}/teacher-summary-1440.png`, fullPage: true });
});

await scenario('teacher-375', { width: 375, height: 812 }, async (page) => {
  await login(page, 'docente@educai.demo');
  const path = await firstTeacherCoursePath(page);
  if (!path) throw new Error('teacher course link missing on mobile');
  await page.goto(`${BASE}${path}?view=summary`, { waitUntil: 'networkidle', timeout: 120000 });
  await inspect(page, 'teacher-summary-375');
  if (await page.locator('.course-nav [aria-current="page"]').count() !== 1) throw new Error('teacher mobile active state missing');
  await page.screenshot({ path: `${out}/teacher-summary-375.png`, fullPage: false });
});

await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
await browser.close();
console.log(JSON.stringify({ checked: results.map((item) => item.label), failures }, null, 2));
if (failures.length) process.exit(1);
