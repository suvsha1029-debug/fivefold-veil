import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { chromium } from '../artifacts/qa-tooling/node_modules/playwright-core/index.mjs';
const base=process.env.QA_ORIGIN || 'http://127.0.0.1:4180';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use a local QA server');
const browser=await chromium.launch({executablePath:process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[];
async function seat(mobile=false){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:860},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))errors.push(r.status()+' '+r.url());});
  page.setDefaultTimeout(11000);
  return page;
}
const click=(page,selector)=>page.locator(selector).click();
const waitText=(page,selector,part)=>page.waitForFunction(([s,t])=>document.querySelector(s)?.textContent.includes(t),[selector,part]);
async function submit(page,selector,endpoint){
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().method()==='POST'),click(page,selector)]);
  assert.ok(response.ok(),endpoint+' '+response.status()+' '+(response.ok()?'':await response.text()));
}
try{
  const host=await seat();
  await host.goto(base+'/');
  await click(host,'#start-button');await click(host,'#test-button');await host.locator('#evidence-body tr').first().waitFor();
  await host.reload();await host.locator('#evidence-body tr').first().waitFor();console.log('PASS solo experiment and recovery');
  await host.goto(base+'/teams/');await host.locator('#room-title').fill('QA isolated rehearsal');
  await submit(host,'#create-form button[type=submit]','/api/rooms');await host.locator('#room-code').waitFor();const code=await host.locator('#room-code').innerText();
  assert.match(code,/^[A-Z2-9]{7}$/);
  await click(host,'#invite-button');const invite=await host.locator('#invite-url').inputValue();assert.equal(new URL(invite).search,'?room='+code);await host.locator('#invite-dialog [data-close]').click();
  const watch=await seat(true);await watch.goto(base+'/teams/?room='+code+'&view=watch');await waitText(watch,'#expedition-title','QA isolated');assert.ok(!await watch.locator('#host-start').isVisible());
  assert.ok(await watch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile spectator horizontal overflow');
  const join=async(name,team,mobile)=>{const p=await seat(mobile);await p.goto(invite+'&team='+team);await p.locator('#join-name').fill(name);await submit(p,'#join-form button[type=submit]','/join');await waitText(p,'#my-name',name);return p;};
  const a=await join('QA North','crown',true);const b=await join('QA Moon','dusk',false);
  // Use a simulated broadcaster in this isolated browser. All Twitch traffic stays mocked.
  await host.route('https://id.twitch.tv/**',route=>route.fulfill({json:{user_id:'123',login:'qalab',client_id:'qa-public-client',scopes:['user:read:chat']}}));
  await host.route('https://api.twitch.tv/**',route=>route.request().url().includes('/channels?')
    ?route.fulfill({json:{data:[{broadcaster_id:'123',game_name:'Chess',title:'QA finals'}]}})
    :route.fulfill({status:202,json:{data:[]}}));
  await host.routeWebSocket('wss://eventsub.wss.twitch.tv/**',socket=>socket.send(JSON.stringify({metadata:{message_type:'session_welcome'},payload:{session:{id:'qa-session',keepalive_timeout_seconds:600}}})));
  await host.evaluate(()=>{
    sessionStorage.setItem('signal-lab-client-id','qa-public-client');
    sessionStorage.setItem('signal-lab-oauth-state',JSON.stringify({state:'qa-state',createdAt:Date.now()}));
  });
  const callback=host.url()+'#access_token=local-test-only&state=qa-state';
  await host.goto('about:blank');await host.goto(callback);
  await waitText(watch,'#room-source','Chess · QA finals');
  console.log('PASS simulated Twitch sign-in and public channel game/title propagation');
  await a.reload();await waitText(a,'#my-name','QA North');
  await click(a,'#choose-domain');await click(a,'#domain-gallery [data-world=lunar]');await submit(a,'#domain-vote-button','/domain');await waitText(a,'#realm-name','Lunar Waters');
  await click(a,'#enter-chamber');for(const id of ['taiga','corrupted','lunar','fire','frontier','star-sea']){await click(a,'#chamber-portals [data-domain='+id+']');assert.equal(await a.locator('#chamber-landmarks button').count(),3);}
  await submit(a,'#chamber-tune','/chamber');await click(a,'#chamber-close');console.log('PASS create, join, watch, invite, seat restore and all six chambers');
  await host.locator('#host-desk summary').click();await click(host,'#open-puzzle-editor');await host.locator('#editor-eye').selectOption('heart');await submit(host,'#publish-puzzle','/control');
  await submit(host,'#host-start','/control');await submit(a,'#send-signal','/command');await watch.locator('#room-evidence tr').first().waitFor();
  await submit(a,'#request-hint','/hint-request');await submit(host,'#host-start','/control');
  await submit(host,'.witness-toggle','/witness');console.log('PASS puzzle editor, experiment propagation, hint, host clock and Witness control');
  await click(host,'.council-setup summary');
  for(const [team,name] of [['Crown','QA North'],['Dusk','QA Moon']]){
    const select=host.getByLabel(team+' captain',{exact:true});const id=await select.locator('option').filter({hasText:name}).getAttribute('value');
    const [r]=await Promise.all([host.waitForResponse(r=>r.url().endsWith('/council')&&r.request().method()==='POST'),select.selectOption(id)]);assert.ok(r.ok());
  }
  await host.locator('.council-open [name=kind]').selectOption('meme');
  await host.locator('.council-open [name=title]').fill('QA live stage');
  await submit(host,'.council-open button','/council');
  for(const [page,caption] of [[a,'North discovery'],[b,'Moon discovery']]){
    if(page===a){
      await page.locator('.council-meme [type=file]').setInputFiles(fileURLToPath(new URL('../public/assets/sigils/lunar.webp',import.meta.url)));
      await waitText(page,'.council-upload-status','Image ready');
    }
    await page.locator('.council-meme textarea').fill(caption);await submit(page,'.council-meme button','/council');
  }
  await submit(a,'.council-back button','/council');await waitText(host,'.council-gallery','Moon discovery');
  assert.ok(!(await watch.locator('body').innerText()).includes('North discovery'));
  for(let i=0;i<2;i++){const approve=host.getByRole('button',{name:'Approve',exact:true}).first();await Promise.all([host.waitForResponse(r=>r.url().endsWith('/council')&&r.request().method()==='POST'),approve.click()]);}
  await submit(host,'.council-host-actions button:first-child','/council');
  for(let i=0;i<2;i++){await host.getByRole('button',{name:'Show on live stage',exact:true}).first().click();await watch.locator('.council-stage:not([hidden])').waitFor();if(i===0)await waitText(watch,'.council-stage','North discovery');}
  await host.getByRole('button',{name:'Open 60-second vote'}).click();
  await a.getByRole('button',{name:'Vote M1',exact:true}).click();await waitText(a,'.council-personal','M1');
  console.log('PASS captain appointment, prediction, moderation privacy, live meme stage and vote');
  await watch.route('**/api/rooms/'+code,r=>r.abort());await watch.locator('#room-banner:not([hidden])').waitFor();await watch.unroute('**/api/rooms/'+code);await watch.locator('#room-banner').waitFor({state:'hidden'});await waitText(watch,'#room-code',code);
  await watch.screenshot({path:'artifacts/qa-mobile-spectator.png'});
  await watch.goto(base+'/teams/?room=ZZZZZZZ&view=watch');await waitText(watch,'#room-load-error','new invite');
  assert.deepEqual(errors,[]);console.log('PASS dropped network, reconnection, missing invite, no uncaught UI errors or failed assets');
} finally {await browser.close();}
