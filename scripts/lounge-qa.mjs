import assert from 'node:assert/strict';
import { chromium } from '../artifacts/qa-tooling/node_modules/playwright-core/index.mjs';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4193';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Run lounge QA against a local preview.');
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const errors = [];
const domainNames = {
  taiga: 'Taiga / Tundra', corrupted: 'Corrupted Universe', lunar: 'Lunar Waters',
  fire: 'Temple of Fire', frontier: 'Frozen Frontier', 'star-sea': 'Dark Sea of Stars',
};

async function createSeat(mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? {width:390, height:844} : {width:1440, height:1000},
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    window.__audioQA = {created:0, resumes:0, suspends:0, contexts:[]};
    const NativeAudioContext = window.AudioContext;
    if (!NativeAudioContext) return;
    window.AudioContext = new Proxy(NativeAudioContext, {
      construct(Target, args) {
        const context = new Target(...args);
        window.__audioQA.created++;
        window.__audioQA.contexts.push(context);
        const resume = context.resume.bind(context);
        const suspend = context.suspend.bind(context);
        context.resume = (...parameters) => {
          window.__audioQA.resumes++;
          return resume(...parameters);
        };
        context.suspend = (...parameters) => {
          window.__audioQA.suspends++;
          return suspend(...parameters);
        };
        return context;
      },
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('/api/')) {
      errors.push(response.status()+' '+response.url());
    }
  });
  return page;
}

async function waitText(page, selector, text) {
  await page.waitForFunction(([selector, text]) => document.querySelector(selector)?.textContent.includes(text), [selector, text]);
}

async function postFromClick(page, selector, endpoint = '/lounge') {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === 'POST'),
    page.locator(selector).click(),
  ]);
  assert.ok(response.ok(), endpoint+' returned HTTP '+response.status()+' '+(response.ok() ? '' : await response.text()));
}

async function visit(page, domain) {
  await page.locator('.lounge-domains [data-domain="'+domain+'"]').click();
  assert.equal(await page.locator('#domain-lounge').getAttribute('data-domain'), domain);
  await waitText(page, '#lounge-title', domainNames[domain]);
}

async function openLounge(page, domain) {
  await page.locator('#enter-lounge').click();
  await page.locator('#domain-lounge[open]').waitFor();
  await visit(page, domain);
}

async function send(page, text) {
  await page.locator('#lounge-message').fill(text);
  await postFromClick(page, '.lounge-compose button[type="submit"]');
  await waitText(page, '.lounge-chat-log', text);
}

async function assertSilent(page) {
  await page.waitForFunction(() => window.__audioQA.contexts.every(context => context.state !== 'running'));
  assert.equal(await page.locator('.lounge-sound').getAttribute('aria-pressed'), 'false');
}

try {
  const host = await createSeat();
  await host.goto(origin+'/teams');
  await host.locator('#room-title').fill('Lounge QA rehearsal');
  await postFromClick(host, '#create-form button[type="submit"]', '/api/rooms');
  const code = await host.locator('#room-code').innerText();
  assert.match(code, /^[A-Z2-9]{7}$/);
  const member = await createSeat();
  await member.goto(origin+'/teams?room='+code+'&team=heart');
  await member.locator('#join-name').fill('Lounge visitor');
  await postFromClick(member, '#join-form button[type="submit"]', '/join');
  await waitText(member, '#my-name', 'Lounge visitor');

  const spectator = await createSeat(true);
  const loungeInvite = origin+'/teams?room='+code+'&view=watch&lounge=lunar';
  await spectator.goto(loungeInvite);
  await spectator.locator('#domain-lounge[open]').waitFor();
  assert.equal(await spectator.locator('#domain-lounge').getAttribute('data-domain'), 'lunar');
  assert.equal(await spectator.locator('.lounge-compose').isVisible(), false);
  assert.equal(await spectator.locator('.lounge-join').isVisible(), true);
  await openLounge(host, 'lunar');
  await openLounge(member, 'lunar');
  for (const [domain] of Object.entries(domainNames)) await visit(host, domain);
  await visit(host, 'lunar');
  console.log('PASS separate host, member and mobile spectator; deep-linked lounge and all six domains');

  assert.deepEqual(await host.evaluate(() => ({created:window.__audioQA.created, resumes:window.__audioQA.resumes})), {created:0, resumes:0});
  const literal = '<img src=x onerror="window.__loungeXSS=true"> hello moon';
  await send(member, literal);
  await waitText(spectator, '.lounge-chat-log', literal);
  assert.equal(await spectator.locator('.lounge-message img').count(), 0);
  assert.equal(await spectator.evaluate(() => window.__loungeXSS), undefined);
  await postFromClick(member, '.lounge-message button');
  await spectator.locator('.lounge-message').waitFor({state:'detached'});
  await visit(host, 'taiga');
  await send(host, 'Northern campfire');
  assert.ok(!(await spectator.locator('.lounge-chat-log').innerText()).includes('Northern campfire'));
  await visit(spectator, 'taiga');
  await waitText(spectator, '.lounge-chat-log', 'Northern campfire');
  await visit(spectator, 'lunar');
  await visit(host, 'lunar');
  await send(member, 'The moon keeps our reasoning');
  await waitText(spectator, '.lounge-chat-log', 'The moon keeps our reasoning');
  await postFromClick(host, '.lounge-chat-toggle');
  await member.locator('#lounge-message:disabled').waitFor();
  await waitText(member, '.lounge-chat-note', 'paused');
  await postFromClick(host, '.lounge-chat-clear');
  await spectator.locator('.lounge-message').waitFor({state:'detached'});
  await postFromClick(host, '.lounge-chat-toggle');
  await member.locator('#lounge-message:enabled').waitFor();
  await visit(spectator, 'taiga');
  await waitText(spectator, '.lounge-chat-log', 'Northern campfire');
  await visit(spectator, 'lunar');
  console.log('PASS shared chat polling, safe literal text, author removal, host pause/clear/reopen and domain isolation');

  await host.locator('.lounge-sound').click();
  await host.waitForFunction(() => document.querySelector('.lounge-sound').getAttribute('aria-pressed') === 'true');
  assert.equal(await host.evaluate(() => window.__audioQA.resumes), 1);
  assert.equal(await host.evaluate(() => window.__audioQA.contexts[0].state), 'running');
  await visit(host, 'fire');
  assert.equal(await host.evaluate(() => window.__audioQA.created), 1);
  await host.locator('.lounge-sound').click();
  await assertSilent(host);
  await host.locator('.lounge-sound').click();
  await host.waitForFunction(() => document.querySelector('.lounge-sound').getAttribute('aria-pressed') === 'true');
  await host.locator('.lounge-close').click();
  await assertSilent(host);
  await openLounge(host, 'lunar');
  assert.equal(await host.locator('.lounge-sound').getAttribute('aria-pressed'), 'false');
  assert.equal(await host.evaluate(() => window.__audioQA.created), 1);
  console.log('PASS music starts only by explicit click, reuses one audio context, mutes and suspends on leaving');

  await host.locator('#lounge-memes-tab').click();
  assert.equal(await host.locator('#lounge-chat-panel').isVisible(), false);
  await waitText(host, '.lounge-meme-wall', 'Approved entries');
  await host.locator('#lounge-memes-tab').press('Home');
  assert.equal(await host.locator('#lounge-chat-tab').getAttribute('aria-selected'), 'true');
  await host.screenshot({path:'artifacts/lounge-qa-desktop.png'});
  await spectator.reload();
  await spectator.locator('#domain-lounge[open]').waitFor();
  assert.equal(await spectator.locator('#domain-lounge').getAttribute('data-domain'), 'lunar');
  assert.equal(await spectator.evaluate(() => window.__audioQA.created), 0);
  assert.ok(await spectator.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), 'Mobile page has horizontal overflow');
  assert.ok(await spectator.locator('#domain-lounge').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth+1), 'Mobile lounge has horizontal overflow');
  await spectator.screenshot({path:'artifacts/lounge-qa-mobile.png'});
  assert.deepEqual(errors, []);
  console.log('PASS accessible content tabs, reload/deep link, 390px layout, screenshots, no uncaught errors or failed assets');
} finally {
  await browser.close();
}
