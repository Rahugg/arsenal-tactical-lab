import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const results=JSON.parse(await fs.readFile(path.join(ROOT,'output/results.json'),'utf8'));
const browser=await chromium.launch({headless:true,
  ...(process.env.ARSENAL_CHROMIUM_EXECUTABLE?{executablePath:process.env.ARSENAL_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const external=[],errors=[];
const auditChecks=[];
const f=(n,d=2)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const task=id=>results.decision_audit.tasks.find(t=>t.id===id);
function record(id,observed){auditChecks.push({task_id:id,passed:true,observed,expected:task(id).answer});}
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
  external.push(url.href);return route.abort();
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:8765',{waitUntil:'networkidle'});
  await page.locator('#application').waitFor({state:'visible'});
  assert.equal(await page.locator('#home-points').textContent(),'47');
  assert.equal(await page.locator('#away-points').textContent(),'16');
  assert.equal(await page.locator('#match-table tbody tr').count(),19);
  record('points',{home:47,away:16});
  assert.equal(await page.locator('#match-table tbody tr').first().locator('td').first().textContent(),task('pair').answer.opponent);
  assert.equal(await page.locator('#match-table tbody tr').first().locator('td').last().textContent(),f(task('pair').answer.difference));
  record('pair',task('pair').answer);
  assert.equal(await page.locator('#accounting-table tbody tr').count(),5);
  assert.match(await page.locator('#accounting-bridge').textContent(),/41 \+ 5.*1.*45/);
  record('accounting',{nonpenalty:41,actual:45});
  await page.screenshot({path:path.join(ROOT,'output/app-overview.png'),fullPage:true});
  await page.locator('[data-tab="hypotheses"]').click();
  await page.selectOption('#hypothesis-context','level');
  assert.equal(await page.locator('.hypothesis').count(),3);
  assert.match(await page.locator('#hypothesis-cards').textContent(),/ОСНОВНАЯ ПРОВЕРКА/);
  assert.match(await page.locator('.hypothesis').nth(2).textContent(),new RegExp(f(task('holm').answer,3)));
  record('holm',task('holm').answer);
  assert.match(await page.locator('#exposure-effect').textContent(),new RegExp(f(task('exposure').answer.difference)));
  assert.equal(await page.locator('#exposure-table tbody tr').count(),2);
  const levelHome=results.state_exposure.summary.find(x=>x.context==='level'&&x.home);
  assert.equal(await page.locator('#exposure-table tbody tr').first().locator('td').nth(4).textContent(),f(levelHome.balance_per90));
  await page.selectOption('#context-unit','total');
  assert.equal(await page.locator('#exposure-table tbody tr').first().locator('td').nth(2).textContent(),f(levelHome.xgf));
  await page.selectOption('#context-unit','per90');
  record('exposure',task('exposure').answer);
  await page.locator('#exposure-table').screenshot({path:path.join(ROOT,'output/app-exposure.png')});
  await page.locator('#delivery-table').screenshot({path:path.join(ROOT,'output/app-delivery.png')});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(ROOT,'output/app-hypotheses.png'),fullPage:true});
  await page.locator('[data-delivery-route="other"]').click();
  assert.equal(await page.locator('#episode-kind').inputValue(),'delivery');
  assert.equal(await page.locator('#episode-route').inputValue(),'other');
  assert.equal(await page.locator('#episode-horizon').isDisabled(),true);
  await page.selectOption('#episode-route','cross');
  assert.match(await page.locator('.episode-item').first().textContent(),/Навес/);
  const counter=task('counterexample').answer;
  const counterRow=results.episodes.find(e=>e.kind==='delivery'&&e.event_id===counter.event_id);
  await page.selectOption('#episode-match',String(counter.match_id));
  await page.selectOption('#episode-route',counterRow.route);
  await page.selectOption('#episode-hit','no');
  await page.locator('.episode-item').filter({hasText:String(counter.event_id)}).click();
  assert.match(await page.locator('#episode-meta').textContent(),new RegExp(String(counter.event_id)));
  assert.match(await page.locator('#episode-result').textContent(),/Без удара/);
  record('counterexample',counter);
  await page.selectOption('#episode-match','all');
  await page.selectOption('#episode-hit','all');
  await page.locator('[data-tab="episodes"]').click();
  await page.selectOption('#episode-kind','arsenal_shot');
  assert.equal(await page.locator('#episode-horizon').isDisabled(),true);
  await page.selectOption('#episode-hit','yes');
  await page.locator('.episode-item').first().click();
  await page.locator('#play').click();
  await page.waitForTimeout(1800);
  const max=Number(await page.locator('#frame').getAttribute('max'));
  assert.ok(Number(await page.locator('#frame').inputValue())>0||max===0);
  await page.locator('#play').click();
  // Regression: Welbeck's goal must not use the raw (0,0) shot placeholder.
  await page.selectOption('#episode-match','2499719');
  await page.selectOption('#episode-context','all');
  await page.locator('.episode-item').filter({hasText:'177960130'}).click();
  await page.locator('#frame').evaluate(input=>{
    input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#pitch-container line[x1="656"][y1="239"][x2="12"][y2="12"]').count(),0,
    'Welbeck goal incorrectly points to raw (0,0) placeholder');
  assert.equal(await page.locator('#pitch-container .goal-direction').last().getAttribute('x2'),'712');
  assert.match(await page.locator('#shot-explanation').textContent(),/условное/);
  assert.match(await page.locator('#pitch-container .goal-caption').textContent(),/ГОЛ ARSENAL/);
  assert.equal(await page.locator('#animation-version').textContent(),'Анимация v2');
  await page.waitForTimeout(700);
  await page.setViewportSize({width:1440,height:1800});
  await page.locator('.episode-view').screenshot({path:path.join(ROOT,'output/app-goal.png')});
  await page.setViewportSize({width:1440,height:1100});
  await page.screenshot({path:path.join(ROOT,'output/app-episodes.png'),fullPage:true});
  // The user's second report concerns Lacazette's opening goal, not Welbeck.
  await page.locator('.episode-item').filter({hasText:'177959212'}).click();
  await page.locator('#frame').evaluate(input=>{
    input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#pitch-container .goal-direction[data-event="177959212"]').getAttribute('x2'),'712');
  assert.equal(await page.locator('#pitch-container .goal-direction[data-event="177959212"]').getAttribute('y2'),'239');
  assert.equal(await page.locator('#pitch-container line[x2="12"][y2="12"]').count(),0);
  assert.match(await page.locator('#pitch-container .goal-caption').textContent(),/ГОЛ ARSENAL.*Lacazette/);
  await page.waitForTimeout(700);
  await page.setViewportSize({width:1440,height:1800});
  await page.locator('.episode-view').screenshot({path:path.join(ROOT,'output/app-lacazette-goal.png')});
  await page.setViewportSize({width:1440,height:1100});
  await page.selectOption('#episode-hit','no');
  await page.locator('.episode-item').first().click();
  await page.locator('#frame').evaluate(input=>{
    input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#pitch-container .goal-direction').count(),0);
  assert.equal(await page.locator('#pitch-container .shot-origin').count()>0,true);
  assert.match(await page.locator('#shot-explanation').textContent(),/точка удара/);
  await page.selectOption('#episode-kind','turnover');
  await page.selectOption('#episode-hit','yes');
  await page.selectOption('#episode-horizon','15');
  await page.locator('.episode-item').filter({hasText:'177959768'}).click();
  await page.locator('#frame').evaluate(input=>{
    input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#pitch-container .goal-direction').last().getAttribute('x2'),'12');
  assert.match(await page.locator('#pitch-container .goal-caption').textContent(),/ГОЛ СОПЕРНИКА/);
  await page.selectOption('#episode-kind','delivery');
  await page.selectOption('#episode-route','other');
  await page.selectOption('#episode-match','2499899');
  await page.locator('.episode-item').filter({hasText:'216905500'}).click();
  await page.locator('#frame').evaluate(input=>{
    input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#pitch-container .goal-direction').count(),1);
  assert.match(await page.locator('#pitch-container .goal-caption').textContent(),/ГОЛ ARSENAL/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.setViewportSize({width:1440,height:1100});
  await page.selectOption('#episode-kind','arsenal_shot');
  const empty=results.matches.find(m=>!results.episodes.some(e=>e.kind==='arsenal_shot'&&e.match_id===m.match_id&&e.hit&&e.eleven_v_eleven&&e.score_diff===0));
  assert.ok(empty);
  await page.selectOption('#episode-match',String(empty.match_id));
  await page.selectOption('#episode-context','level');
  assert.equal(await page.locator('.episode-item').count(),0);
  assert.match(await page.locator('#episode-list').textContent(),/Нет эпизодов/);
  assert.equal(await page.locator('#play').isDisabled(),true);
  await page.selectOption('#episode-kind','turnover');
  await page.selectOption('#episode-match','all');
  await page.selectOption('#episode-hit','all');
  await page.selectOption('#episode-context','all');
  await page.selectOption('#episode-horizon','20');
  assert.ok(await page.locator('.episode-item').count()>0);
  await page.locator('[data-tab="recommendations"]').click();
  assert.equal(await page.locator('.recommendation').count(),3);
  assert.match(await page.locator('#recommendation-list').textContent(),/после доставки без навеса/);
  assert.equal(await page.locator('#decision-matrix tbody tr').count(),3);
  assert.equal(await page.locator('#audit-tasks tbody tr').count(),6);
  await page.locator('#decision-matrix').screenshot({path:path.join(ROOT,'output/app-decisions.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-tab="overview"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:path.join(ROOT,'output/app-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  const report={passed:true,browser:'Chromium',external_requests:external.length,
    javascript_errors:errors,checks:['47/16','19 opponents','context filters','shot episodes',
      'playback','shot placeholders ignored','Welbeck goal right','Lacazette goal right','animation v2 marker','Vardy goal left',
      'non-goal shot origin only','delivery keeper duplicate not a second goal',
      'empty result','10/15/20 windows','recommendations','390px layout','390px goal layout'],
    network_policy:'all non-loopback requests blocked'};
  await fs.writeFile(path.join(ROOT,'output/browser_checks.json'),JSON.stringify(report,null,2));
  const tableAvailability=[];
  for(const t of results.decision_audit.tasks){
    const filename=t.table.split(':')[0];
    const contents=await fs.readFile(path.join(ROOT,'output',filename),'utf8');
    assert.ok(contents.split('\n').length>1);
    tableAvailability.push({task_id:t.id,file:filename,readable:true});
  }
  const audit={kind:'Аудит агента',passed:auditChecks.length===6,human_participants:0,
    human_study_performed:false,human_time_saving_measured:false,
    method:'Автоматизированные задачи в браузере и проверка доступности соответствующих CSV; ответы сверены с аналитическим экспортом.',
    checks:auditChecks,table_availability:tableAvailability,
    limitation:'Не пользовательский эксперимент. Точность самостоятельного аналитического расчёта проверяется отдельно.'};
  assert.equal(audit.passed,true);
  await fs.writeFile(path.join(ROOT,'output/decision_audit_checks.json'),JSON.stringify(audit,null,2));
  console.log(JSON.stringify(report));
}finally{await browser.close();}
