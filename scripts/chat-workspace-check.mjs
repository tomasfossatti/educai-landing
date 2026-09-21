import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://educai-mvp.onrender.com';
const out = 'artifacts/chat-workspace';
await fs.mkdir(out, { recursive: true });
const results = [];
const failures = [];
const record = (label, data = {}) => results.push({ label, ...data });

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByLabel('Email').fill('estudiante1@educai.demo');
  await page.getByLabel('Contraseña').fill('educai-demo');
  await Promise.all([
    page.waitForURL(`${BASE}/student`, { timeout: 120000 }),
    page.getByRole('button', { name: 'Ingresar' }).click(),
  ]);
  await page.waitForLoadState('networkidle');
}

async function openCurrentChat(page) {
  const href = await page.locator('.continue-card').getAttribute('href');
  if (!href) throw new Error('current conversation link missing');
  await page.goto(new URL(href, BASE).toString(), { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.chat-window').waitFor({ state: 'visible' });
  await page.locator('.chat-window').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(150);
}

async function checkViewport(name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  try {
    await login(page);
    await openCurrentChat(page);

    const metrics = await page.evaluate(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
      };
      const viewportEl = document.querySelector('.chat-window');
      const composerEl = document.querySelector('.composer');
      const inputShell = document.querySelector('.composer-input-shell');
      const assistant = document.querySelector('.message.assistant');
      const student = document.querySelector('.message.student');
      const title = document.querySelector('.tutor-header h1');
      const send = document.querySelector('.composer-send');
      return {
        documentWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        header: box('.tutor-header'),
        chat: box('.chat'),
        chatViewport: box('.chat-window'),
        composer: box('.composer'),
        inputShell: box('.composer-input-shell'),
        latest: box('.message-row:last-child'),
        assistant: box('.message.assistant'),
        student: box('.message.student'),
        titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : null,
        composerBorder: composerEl ? getComputedStyle(composerEl).borderTopWidth : null,
        inputBorder: inputShell ? getComputedStyle(inputShell).borderTopWidth : null,
        sendDisabled: send ? send.disabled : null,
        chatDistanceFromBottom: viewportEl ? viewportEl.scrollHeight - viewportEl.scrollTop - viewportEl.clientHeight : null,
        privacyIconCount: document.querySelectorAll('.privacy-disclosure summary svg').length,
        tutorAvatarCount: document.querySelectorAll('.tutor-avatar').length,
      };
    });

    if (metrics.scrollWidth > metrics.documentWidth) throw new Error(`${name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.documentWidth}`);
    if (!metrics.header || !metrics.chat || !metrics.chatViewport || !metrics.composer || !metrics.inputShell) throw new Error(`${name}: essential geometry missing`);
    if (Math.abs(metrics.header.x - metrics.chat.x) > 2 || Math.abs(metrics.header.x - metrics.composer.x) > 2) throw new Error(`${name}: header/chat/composer x-axis mismatch`);
    if (Math.abs(metrics.header.width - metrics.chat.width) > 2 || Math.abs(metrics.header.width - metrics.composer.width) > 2) throw new Error(`${name}: header/chat/composer width mismatch`);
    if (metrics.chatViewport.bottom > metrics.composer.y + 1) throw new Error(`${name}: chat viewport overlaps composer`);
    if (metrics.latest && metrics.latest.bottom > metrics.chatViewport.bottom + 1) throw new Error(`${name}: latest message ends behind viewport/composer`);
    if (metrics.composer.height > 82) throw new Error(`${name}: composer too tall at rest: ${metrics.composer.height}px`);
    if (metrics.inputShell.height < 56 || metrics.inputShell.height > 66) throw new Error(`${name}: input shell initial height unexpected: ${metrics.inputShell.height}px`);
    if (metrics.composerBorder !== '0px') throw new Error(`${name}: outer composer still has a border`);
    if (metrics.inputBorder === '0px') throw new Error(`${name}: composer input shell lost its single border`);
    if (metrics.assistant && metrics.assistant.width > 740) throw new Error(`${name}: tutor reading width too wide: ${metrics.assistant.width}px`);
    if (metrics.student && metrics.student.width > metrics.chat.width * (viewport.width < 768 ? .92 : .72)) throw new Error(`${name}: student bubble too wide`);
    if (metrics.titleSize && metrics.titleSize > (viewport.width < 768 ? 33 : 37)) throw new Error(`${name}: title too large: ${metrics.titleSize}px`);
    if (metrics.privacyIconCount !== 1) throw new Error(`${name}: vector privacy icon missing`);
    if (metrics.tutorAvatarCount < 1) throw new Error(`${name}: tutor identity avatar missing`);
    if (metrics.sendDisabled !== true) throw new Error(`${name}: empty composer send button should be disabled`);
    if (metrics.chatDistanceFromBottom !== null && metrics.chatDistanceFromBottom > 3) throw new Error(`${name}: chat did not reach latest message`);

    const textarea = page.locator('#chat-message');
    await textarea.fill('Una pregunta de prueba que no se enviará.');
    if (await page.locator('.composer-send').isDisabled()) throw new Error(`${name}: send should enable after valid text`);
    const initialHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);
    await textarea.fill('Línea de prueba '.repeat(80));
    const grownHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);
    if (grownHeight < initialHeight) throw new Error(`${name}: textarea did not auto-grow`);
    if (grownHeight > 146) throw new Error(`${name}: textarea exceeded max auto-grow height: ${grownHeight}px`);
    await textarea.fill('prueba');
    await textarea.press('Shift+Enter');
    const valueAfterShiftEnter = await textarea.inputValue();
    if (!valueAfterShiftEnter.includes('\n')) throw new Error(`${name}: Shift+Enter no longer inserts a newline`);
    await textarea.fill('');
    if (!(await page.locator('.composer-send').isDisabled())) throw new Error(`${name}: send did not return to disabled state`);

    if (consoleErrors.length || pageErrors.length) throw new Error(`${name}: browser errors ${JSON.stringify({ consoleErrors, pageErrors })}`);
    record(name, { ...metrics, initialTextareaHeight: initialHeight, grownTextareaHeight: grownHeight, consoleErrors, pageErrors });
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  } catch (error) {
    failures.push(`${name}: ${error?.stack || error}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
await checkViewport('chat-1440', { width: 1440, height: 1000 });
await checkViewport('chat-1024', { width: 1024, height: 800 });
await checkViewport('chat-390', { width: 390, height: 844 });
await checkViewport('chat-320', { width: 320, height: 700 });
await browser.close();
await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures }, null, 2));
console.log(JSON.stringify({ results, failures }, null, 2));
if (failures.length) process.exit(1);
