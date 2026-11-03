import {filterEpisodes,riskSummary,number as fmt,clock,actionGeometry} from './lab-utils.js';
const $=id=>document.getElementById(id);
let data,selectedEpisode=null,filteredEpisodes=[],listLimit=60,timer=null;
const INK='#17212b',RED='#c52235',GRAY='#98a3ac';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r[key]||0),0);
const titleFor={H1:'На выезде хуже баланс качества моментов',H2:'На выезде хуже реализация собственных ударов',H3:'После неудачной передачи чаще следует удар'};
const metricNames={xg_balance:'xG-баланс',finishing:'Голы − xG',risk_15:'Удар после передачи, %'};
const translated={Pass:'Передача',Shot:'Удар',Duel:'Дуэль','Others on the ball':'Действие с мячом','Save attempt':'Действие вратаря','Free Kick':'Стандарт',Interruption:'Остановка',Foul:'Фол',Offside:'Офсайд'};

function go(tab) {
  if(timer){clearInterval(timer);timer=null;$('play').textContent='Воспроизвести';}
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==tab);
  document.querySelectorAll('.tabs button').forEach(b=>{
    const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
  });
  history.replaceState(null,'','#'+tab);
}
function svg(inner,width=560,height=280,label='График') {
  return '<svg role="img" aria-label="'+escape(label)+'" viewBox="0 0 '+width+' '+height+'">'+inner+'</svg>';
}
function barChart(categories,series,{width=560,height=280,max=null}={}) {
  const vals=series.flatMap(s=>s.values),lo=Math.min(0,...vals),hi=max??Math.max(1,...vals)*1.18;
  const left=50,right=width-15,top=22,bottom=height-45;
  const y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top),base=y(0);
  let s='';
  for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4,yy=y(v);s+='<line x1="'+left+'" y1="'+yy+'" x2="'+right+'" y2="'+yy+'" stroke="#e4e8eb"/><text x="'+(left-10)+'" y="'+(yy+4)+'" text-anchor="end" font-family="Arial" font-size="11" fill="'+GRAY+'">'+fmt(v,1)+'</text>';}
  const group=(right-left)/categories.length,bw=Math.min(65,group/(series.length+1.6));
  categories.forEach((cat,i)=>{
    const center=left+group*(i+.5);
    s+='<text x="'+center+'" y="'+(height-20)+'" text-anchor="middle" font-family="Arial" font-size="12" fill="'+INK+'">'+escape(cat)+'</text>';
    series.forEach((ser,j)=>{
      const val=ser.values[i],x=center+(j-(series.length-1)/2)*bw-bw*.43,yy=y(val);
      s+='<rect x="'+x+'" y="'+Math.min(yy,base)+'" width="'+bw*.86+'" height="'+Math.max(1,Math.abs(base-yy))+'" fill="'+ser.color+'"/>';
      s+='<text x="'+(x+bw*.43)+'" y="'+(val>=0?yy-8:yy+15)+'" text-anchor="middle" font-family="Arial" font-size="12" fill="'+ser.color+'">'+fmt(val,1)+'</text>';
    });
  });
  return svg(s,width,height)+ '<p class="small-note">'+series.map(ser=>'<span style="color:'+ser.color+'">■ '+escape(ser.name)+'</span>').join('　')+'</p>';
}
function effectChart(result,unit) {
  if(result.difference===null)return '<p class="empty">Недостаточно пар для оценки.</p>';
  const {difference:d,low,high}=result;
  const lo=Math.min(0,low)*1.25-.04,hi=Math.max(0,high)*1.25+.04;
  const x=v=>35+(v-lo)/(hi-lo)*430;
  let s='<line x1="'+x(0)+'" y1="12" x2="'+x(0)+'" y2="90" stroke="'+GRAY+'" stroke-dasharray="4 4"/>';
  s+='<line x1="'+x(low)+'" y1="43" x2="'+x(high)+'" y2="43" stroke="'+INK+'" stroke-width="2"/>';
  for(const v of [low,high])s+='<line x1="'+x(v)+'" y1="35" x2="'+x(v)+'" y2="51" stroke="'+INK+'"/>';
  s+='<circle cx="'+x(d)+'" cy="43" r="6" fill="'+RED+'"/>';
  for(const v of [low,0,high])s+='<text x="'+x(v)+'" y="80" text-anchor="middle" font-size="11" font-family="Arial" fill="'+GRAY+'">'+fmt(v)+'</text>';
  return svg(s,500,100,'95% доверительный интервал, '+unit);
}
function overview() {
  const home=data.summary.find(r=>r.home),away=data.summary.find(r=>!r.home);
  $('home-points').textContent=home.points;$('away-points').textContent=away.points;
  const metrics=[
    ['Голы',home.gf+' / '+away.gf,'дома / выезд'],
    ['Пропущенные голы',home.ga+' / '+away.ga,'дома / выезд'],
    ['xG-баланс',fmt(home.npxg-home.npxga,1)+' / '+fmt(away.npxg-away.npxga,1),'непенальтийный, за сезон'],
    ['Проверено гипотез','3','19 пар · поправка Holm']];
  $('key-metrics').innerHTML=metrics.map(([label,value,note])=>'<div class="metric"><small>'+label+'</small><strong>'+value+'</strong><span>'+note+'</span></div>').join('');
  $('balance-chart').innerHTML=barChart(['Дома','Выезд'],[
    {name:'Создано',values:[home.npxg,away.npxg],color:INK},
    {name:'Допущено',values:[home.npxga,away.npxga],color:RED}]);
  $('verdict-summary').innerHTML=data.hypotheses.map(h=>'<div class="verdict-row"><b>'+h.id+'</b><span>'+escape(h.title)+'</span><small class="'+(h.supported?'supported':'')+'">'+(h.supported?'Поддерживается':'Нет убедительной поддержки')+'</small></div>').join('');
  const opponents=[...new Set(data.matches.map(m=>m.opponent_id))];
  const pairs=opponents.map(id=>{const rows=data.matches.filter(m=>m.opponent_id===id);return {home:rows.find(m=>m.home),away:rows.find(m=>!m.home)};}).sort((a,b)=>(a.away.xg_balance-a.home.xg_balance)-(b.away.xg_balance-b.home.xg_balance));
  $('match-table').querySelector('tbody').innerHTML=pairs.map(({home:h,away:a})=>'<tr class="clickable" tabindex="0" data-match="'+a.match_id+'"><td>'+escape(a.opponent)+'</td><td>'+h.points+' / '+a.points+'</td><td>'+fmt(h.xg_balance)+'</td><td>'+fmt(a.xg_balance)+'</td><td class="'+(a.xg_balance-h.xg_balance<0?'negative':'')+'">'+fmt(a.xg_balance-h.xg_balance)+'</td></tr>').join('');
  $('match-table').querySelectorAll('tbody tr').forEach(row=>{
    const select=()=>{$('episode-match').value=row.dataset.match;updateEpisodes();go('episodes');};
    row.onclick=select;row.onkeydown=e=>{if(e.key==='Enter')select();};
  });
}
function hypotheses() {
  $('hypothesis-cards').innerHTML=data.hypotheses.map(h=>{
    const r=h;
    return '<article class="hypothesis"><div><p class="eyebrow">'+h.id+' · ОСНОВНАЯ ПРОВЕРКА</p><h3>'+titleFor[h.id]+'</h3><p>'+escape(h.verdict)+'. Основная проверка: Holm p = '+fmt(h.p_holm,3)+'.</p><span class="effect">'+fmt(r.difference)+'</span> <span class="caption">'+h.unit+'</span><p>95% ДИ ['+fmt(r.low)+'; '+fmt(r.high)+'] · '+r.n+' пар</p></div><div>'+effectChart(r,h.unit)+'<p class="caption">Ноль означает отсутствие среднего различия. Интервал условен относительно выбранной xG-модели.</p><button class="text-button" data-hyp-episodes="true">Открыть реальные эпизоды →</button></div></article>';
  }).join('');
  document.querySelectorAll('[data-hyp-episodes]').forEach(b=>b.onclick=()=>go('episodes'));
  $('model-quality').innerHTML='<table><thead><tr><th>Модель</th><th>Brier</th><th>Log loss</th></tr></thead><tbody>'+data.model.quality.map(q=>'<tr><td>'+escape(q.model)+'</td><td>'+fmt(q.brier,4)+'</td><td>'+fmt(q.log_loss,4)+'</td></tr>').join('')+'</tbody></table><p class="method-note">'+data.model.train_matches+' матчей обучения · '+data.model.test_matches+' отложенных матчей · '+data.model.test_shots+' тестовых ударов.</p>';
  const homes=data.matches.filter(m=>m.home),aways=data.matches.filter(m=>!m.home);
  $('sensitivity-chart').innerHTML=barChart(['10 сек','15 сек','20 сек'],[
    {name:'Дома',color:INK,values:[10,15,20].map(h=>100*sum(homes,'hits_'+h)/sum(homes,'attempts_'+h))},
    {name:'Выезд',color:RED,values:[10,15,20].map(h=>100*sum(aways,'hits_'+h)/sum(aways,'attempts_'+h))}]);
  $('group-table').innerHTML='<table><thead><tr><th>Группа</th><th>Поле</th><th>Матчей</th><th>Очки / матч</th><th>xG-баланс</th><th>Реализация</th></tr></thead><tbody>'+data.groups.map(g=>'<tr><td>'+escape(g.group)+'</td><td>'+(g.home?'Дома':'Выезд')+'</td><td>'+g.n+'</td><td>'+fmt(g.points)+'</td><td>'+fmt(g.xg_balance)+'</td><td>'+fmt(g.finishing)+'</td></tr>').join('')+'</tbody></table>';
  $('method-details').innerHTML='<p>Логистическая регрессия: расстояние, угол ворот, голова/корпус, прямой штрафной. Пенальти и автоголы учитываются отдельно. Все признаки результата удара исключены.</p><p>5000 парных бутстрэп-выборок, seed 42. Интервалы не скорректированы на множественные сравнения, p-value основных проверок скорректированы Holm. Сила соперника вычислена без его матчей с Arsenal.</p><p>Неудачная передача — Pass с tag 1802. Окно прерывается остановкой, сменой тайма или следующим собственным действием с мячом. Дуэли не считаются подтверждённым владением.</p><p>Один матч без корректного события забившего удара исключён из ML; счёт восстановлен по событию вратаря. Ни один матч Arsenal не исключён.</p><p>Версия источника: '+escape(data.source.revision)+'. Лицензия: '+escape(data.source.license)+'.</p>'+data.limits.map(s=>'<p>'+escape(s)+'</p>').join('');
  renderExposure();
}
function tableHTML(headers,rows){
  return '<table><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function renderExposure(){
  const context=$('hypothesis-context').value,mode=$('context-unit').value;
  const keys=mode==='per90'?['xgf_per90','xga_per90','balance_per90']:['xgf','xga'];
  const names=mode==='per90'?['Создано / 90','Допущено / 90','Баланс / 90']:['Создано, сумма','Допущено, сумма'];
  const rows=data.state_exposure.summary.filter(r=>r.context===context).sort((a,b)=>Number(b.home)-Number(a.home));
  $('exposure-table').innerHTML=tableHTML(['Поле','Минуты состояния',...names],rows.map(r=>[r.home?'Дома':'Выезд',fmt(r.minutes,1),...keys.map(k=>fmt(r[k]))]));
  const p=data.state_exposure.effects.find(x=>x.context===context&&x.metric==='balance_per90');
  const alt=data.state_exposure.effects.find(x=>x.context===context&&x.metric==='nominal_balance_per90');
  const pooled=data.state_exposure.pooled_effects.find(x=>x.context===context&&x.metric==='xg_balance_per90');
  const short=data.state_exposure.short_exposure_sensitivity.find(x=>x.context===context);
  $('exposure-effect').textContent='Разница агрегированных интенсивностей / 90: '+fmt(pooled.difference)+'; 95% ДИ ['+fmt(pooled.low)+'; '+fmt(pooled.high)+']. Средняя парная разница баланса / 90: '+fmt(p.difference)+'; 95% ДИ ['+fmt(p.low)+'; '+fmt(p.high)+'], '+p.n+' пар. При приведении таймов к 45 минутам: '+fmt(alt.difference)+'. При минимуме 10 минут состояния в обоих матчах: '+fmt(short.difference)+' ('+short.n+' пар). Короткие экспозиции делают среднее по парам нестабильным. Все оценки разведочные.';
}
function renderReview(){
  const g=data.goal_gap_accounting;
  $('accounting-table').innerHTML=tableHTML(['Компонент','Голы'],[...g.components.map(c=>[c.label,fmt(c.value,2)]),['Итого: непенальтийный разрыв',fmt(g.nonpenalty_goal_difference_gap,0)]]);
  $('accounting-bridge').textContent=fmt(g.nonpenalty_goal_difference_gap,0)+' + '+fmt(g.penalty_gap,0)+' (пенальти) '+(g.own_goal_gap>=0?'+ ':'− ')+fmt(Math.abs(g.own_goal_gap),0)+' (автоголы) = '+fmt(g.actual_goal_difference_gap,0)+' — фактический разрыв разницы голов. Это не разложение потерянных очков.';
  const routes={cross:'Навесы',other:'Без навеса'};
  $('delivery-table').innerHTML=tableHTML(['Маршрут','Поле','Попыток','Возможностей','На 100 возможностей','Успешно, %','С ударом, %','xG / 100 доставок'],data.delivery_mechanism.summary.map(x=>[routes[x.route],x.home?'Дома':'Выезд',fmt(x.attempts,0),fmt(x.opportunities,0),fmt(x.entries_per100_opportunities),fmt(x.completion_pct),fmt(x.shot_pct),fmt(x.xg_per100_entries)]));
  const metrics={entries_per100_opportunities:'Доставки / 100 возможностей',completion_pct:'Успешность, п.п.',shot_pct:'С ударом, п.п.',xg_per100_entries:'xG / 100 доставок',alternative_xg_per100_entries:'xG / 100, модель 2'};
  $('delivery-effects').innerHTML='<h4>Парные различия: выезд минус дом</h4>'+tableHTML(['Маршрут','Показатель','Разница','95% интервал','Пар'],data.delivery_mechanism.effects.map(x=>[routes[x.route],metrics[x.metric],fmt(x.difference),'['+fmt(x.low)+'; '+fmt(x.high)+']',x.n]));
  $('robustness-table').innerHTML=tableHTML(['Модель','Brier','Log loss','ROC AUC'],data.model_robustness.quality.map((x,i)=>[i?'Только расстояние и угол':'Основная: 4 признака',fmt(x.brier,4),fmt(x.log_loss,4),fmt(x.roc_auc,3)]));
  $('robustness-effects').textContent=data.model_robustness.effects.map(x=>(x.metric==='xg_balance'?'Парный xG-баланс':'Реализация')+': основная '+fmt(x.primary_difference)+', альтернативная '+fmt(x.alternative_difference)+'.').join(' ')+' Это чувствительность, новые основные p-value не рассчитываются.';
  $('decision-matrix').innerHTML=tableHTML(['Альтернатива','Данные и неопределённость','Ресурсы: допущение','Как проверить'],data.decision_matrix.map(x=>[x.action,x.evidence+' '+x.uncertainty,x.resources,x.test]));
  $('audit-tasks').innerHTML=tableHTML(['Задача','Где искать в таблицах','Где искать в приложении'],data.decision_audit.tasks.map(x=>[x.task,x.table,x.app]));
  document.querySelectorAll('[data-delivery-route]').forEach(b=>b.onclick=()=>{
    $('episode-kind').value='delivery';$('episode-route').value=b.dataset.deliveryRoute;
    $('episode-match').value='all';$('episode-hit').value='all';$('episode-context').value='all';updateEpisodes();go('episodes');
  });
}
function matchFor(id){return data.matches.find(m=>m.match_id===id);}
function updateEpisodes() {
  if(timer){clearInterval(timer);timer=null;$('play').textContent='Воспроизвести';}
  const kind=$('episode-kind').value;
  $('episode-horizon').disabled=kind!=='turnover';
  if(kind!=='turnover')$('episode-horizon').value='15';
  $('route-filter').hidden=kind!=='delivery';
  const hit=$('episode-hit');hit.options[1].textContent=kind==='arsenal_shot'?'Завершение голом':kind==='delivery'?'С ударом Arsenal':'С ударом соперника';hit.options[2].textContent=kind==='arsenal_shot'?'Без гола':'Без последующего удара';
  const filters={kind,matchId:$('episode-match').value,horizon:$('episode-horizon').value,hit:hit.value,context:$('episode-context').value,route:kind==='delivery'?$('episode-route').value:'all'};
  filteredEpisodes=filterEpisodes(data.episodes,filters);
  const total=riskSummary(filteredEpisodes);
  const rateNote=filters.hit==='all'?' · '+total.hits+(kind==='arsenal_shot'?' голов':' с ударом')+' · '+fmt(total.rate)+'%':' · отфильтровано по исходу; доля риска здесь не оценивается';
  $('episode-count').textContent=total.n+' эпизодов'+rateNote;
  listLimit=60;renderList();
  selectEpisode(filteredEpisodes[0]??null);
}
function renderList() {
  $('episode-list').innerHTML=filteredEpisodes.slice(0,listLimit).map((e,i)=>{
    const m=matchFor(e.match_id);
    const outcome=e.kind==='arsenal_shot'?(e.hit?'Гол Arsenal':'Удар без гола'):e.kind==='delivery'?((e.route==='cross'?'Навес':'Без навеса')+' · '+(e.hit?'Удар Arsenal':'Без удара')):(e.hit?'Удар соперника':'Без удара');
    return '<button class="episode-item" data-index="'+i+'"><strong>'+escape(m.opponent)+' · '+(m.home?'дома':'выезд')+' · '+clock(e.period,e.second)+'</strong><span>'+outcome+' · событие '+e.event_id+'</span></button>';
  }).join('')||'<p class="empty">Нет эпизодов с такими условиями. Измените фильтры.</p>';
  $('episode-list').querySelectorAll('button').forEach(b=>b.onclick=()=>selectEpisode(filteredEpisodes[Number(b.dataset.index)]));
  $('more-episodes').hidden=filteredEpisodes.length<=listLimit;
}
function selectEpisode(e) {
  if(timer){clearInterval(timer);timer=null;$('play').textContent='Воспроизвести';}
  selectedEpisode=e;
  document.querySelectorAll('.episode-item').forEach(b=>b.classList.toggle('active',filteredEpisodes[Number(b.dataset.index)]===e));
  if(!e){$('episode-title').textContent='Нет подходящих эпизодов';$('episode-meta').textContent='';$('episode-result').textContent='';$('pitch-container').innerHTML='<p class="empty">Выберите другие условия.</p>';$('action-details').textContent='';$('shot-explanation').textContent='';$('frame').max=0;$('frame-label').textContent='0 / 0';$('play').disabled=true;return;}
  const m=matchFor(e.match_id);
  $('episode-title').textContent=m.label;
  $('episode-meta').textContent=clock(e.period,e.second)+' · match '+e.match_id+' · event '+e.event_id+' · разница счёта до события: '+(e.score_diff>0?'+':'')+e.score_diff;
  $('episode-result').textContent=e.kind==='arsenal_shot'?((e.hit?'Гол':'Без гола')+' · xG '+fmt(e.xg)):e.kind==='delivery'?((e.hit?'С ударом Arsenal':'Без удара')+' · xG '+fmt(e.xg)):(e.hit?'С ударом':'Без удара');$('episode-result').classList.toggle('positive',e.hit);
  $('frame').max=Math.max(0,e.actions.length-1);$('frame').value=0;$('play').disabled=!e.actions.length;drawFrame();
}
function pitchBase() {
  return '<rect x="12" y="12" width="700" height="454" fill="#f9fafb" stroke="#b8c2ca"/><line x1="362" x2="362" y1="12" y2="466" stroke="#d0d7dc"/><circle cx="362" cy="239" r="61" fill="none" stroke="#d0d7dc"/><rect x="12" y="105" width="110" height="268" fill="none" stroke="#b8c2ca"/><rect x="602" y="105" width="110" height="268" fill="none" stroke="#b8c2ca"/><rect x="12" y="178" width="37" height="122" fill="none" stroke="#b8c2ca"/><rect x="675" y="178" width="37" height="122" fill="none" stroke="#b8c2ca"/><text x="698" y="489" text-anchor="end" fill="#8a969f" font-size="11" font-family="Arial">Направление атаки Arsenal →</text>';
}
function drawFrame() {
  if(!selectedEpisode?.actions.length)return;
  const i=Number($('frame').value),actions=selectedEpisode.actions;
  let s=pitchBase()+'<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="context-stroke"/></marker></defs>';
  s+='<rect class="goal-mouth" x="4" y="214.56" width="8" height="48.88" fill="none" stroke="'+GRAY+'"/><rect class="goal-mouth" x="712" y="214.56" width="8" height="48.88" fill="none" stroke="'+GRAY+'"/>';
  const x=v=>12+v*7,y=v=>12+v*4.54;
  actions.slice(0,i+1).forEach((a,j)=>{
    const geometry=actionGeometry(a),color=a.arsenal?RED:INK,opacity=j===i?1:.18;
    const p=geometry.origin;if(!p)return;
    if(geometry.end){
      const end=geometry.end;
      s+='<line class="'+(geometry.isGoal?'goal-direction':'pass-direction')+'" data-event="'+a.id+'" x1="'+x(p.x)+'" y1="'+y(p.y)+'" x2="'+x(end.x)+'" y2="'+y(end.y)+'" stroke="'+color+'" stroke-width="'+(j===i?2.6:1.5)+'" opacity="'+opacity+'"'+(geometry.isGoal?' stroke-dasharray="5 4"':'')+' marker-end="url(#arrow)"/>';
      if(geometry.isGoal&&j===i)s+='<circle class="goal-ball" cx="'+x(end.x)+'" cy="'+y(end.y)+'" r="4" fill="white" stroke="'+color+'" stroke-width="2"><animate attributeName="cx" from="'+x(p.x)+'" to="'+x(end.x)+'" dur="0.6s" fill="freeze"/><animate attributeName="cy" from="'+y(p.y)+'" to="'+y(end.y)+'" dur="0.6s" fill="freeze"/></circle>';
    }
    s+='<circle class="action-origin" cx="'+x(p.x)+'" cy="'+y(p.y)+'" r="'+(j===i?7:4)+'" fill="'+color+'" opacity="'+opacity+'"/>';
    if(geometry.isShot)s+='<circle class="shot-origin" data-event="'+a.id+'" cx="'+x(p.x)+'" cy="'+y(p.y)+'" r="'+(j===i?12:7)+'" fill="none" stroke="'+color+'" stroke-width="2" opacity="'+opacity+'"/>';
    if(j===i)s+='<text x="'+(x(p.x)+(p.x>65?-10:10))+'" y="'+Math.max(25,y(p.y)-12)+'" text-anchor="'+(p.x>65?'end':'start')+'" fill="'+color+'" font-size="12" font-family="Arial">'+escape(a.player||translated[a.type]||a.type)+'</text>';
  });
  const lastShot=actions.slice(0,i+1).findLast(a=>actionGeometry(a).isShot);
  if(lastShot?.goal)s+='<text class="goal-caption" x="362" y="39" text-anchor="middle" fill="'+(lastShot.arsenal?RED:INK)+'" font-family="Arial" font-size="17" font-weight="bold">'+(lastShot.arsenal?'ГОЛ ARSENAL':'ГОЛ СОПЕРНИКА')+' · '+escape(lastShot.player||'')+'</text>';
  else if(lastShot&&actionGeometry(actions[i]).isShot)s+='<text class="shot-caption" x="362" y="39" text-anchor="middle" fill="'+INK+'" font-family="Arial" font-size="15">УДАР БЕЗ ГОЛА</text>';
  $('pitch-container').innerHTML=svg(s,724,500,'Реальные события выбранного эпизода');
  const a=actions[i];$('frame-label').textContent=(i+1)+' / '+actions.length;
  const geometry=actionGeometry(a);
  $('action-details').textContent=clock(selectedEpisode.period,a.second)+' · '+(a.arsenal?'Arsenal':'Соперник')+' · '+(a.player||'игрок не указан')+' · '+(geometry.isGoal?'Удар — ГОЛ':geometry.isShot?'Удар без гола':translated[a.type]||a.type)+' · event '+a.id;
  $('shot-explanation').textContent=lastShot?.goal?'Пунктир и движение мяча — условное направление к центру ворот. Это схема гола, не измеренная траектория и не точная точка попадания.':geometry.isShot?'Кольцом отмечена точка удара. Направление полёта не показано: вторая координата удара в исходнике служебная.':a.type==='Save attempt'?'Действие вратаря сохранено в последовательности. Служебные координаты этого события на поле не отображаются.':'Сплошные стрелки — зарегистрированные передачи. Дуэли и другие действия показаны точками, без выдуманной траектории мяча.';
}
function recommendations() {
  $('recommendation-list').innerHTML=data.recommendations.map((r,i)=>'<article class="recommendation"><span class="index">0'+(i+1)+'</span><div><span class="label">'+escape(r.support)+'</span><h3>'+escape(r.title)+'</h3><p class="evidence">'+escape(r.evidence)+'</p><p>'+escape(r.caution)+'</p></div><div><h4>Что проверить</h4><p>'+escape(r.action)+'</p><h4>Как оценить результат</h4><p>'+escape(r.test)+'</p></div></article>').join('');
  $('limitations').innerHTML=data.limits.map(s=>'<li>'+escape(s)+'</li>').join('');
}
function downloadCSV() {
  const cols=['opponent','home','points','gf','ga','npxg','npxga','xg_balance','finishing','risk_15'];
  const text='\ufeff'+[cols.join(';'),...data.matches.map(m=>cols.map(k=>'"'+String(m[k]??'').replace(/"/g,'""')+'"').join(';'))].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='arsenal_2017_18.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function start() {
  try {
    const response=await fetch('data/lab.json');if(!response.ok)throw new Error('Не найден файл результатов: HTTP '+response.status);
    data=await response.json();if(data.schema_version!==1)throw new Error('Неподдерживаемая версия данных');
    const picker=$('episode-match');
    data.matches.forEach(m=>{const option=document.createElement('option');option.value=m.match_id;option.textContent=m.date.slice(0,10)+' · '+m.label;picker.append(option);});
    overview();hypotheses();recommendations();renderReview();updateEpisodes();
    $('loading').hidden=true;$('application').hidden=false;
    const tab=location.hash.slice(1);go(['overview','hypotheses','episodes','recommendations'].includes(tab)?tab:'overview');
  }catch(error){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='Не удалось открыть исследование. Запустите локальный сервер по README. '+error.message;}
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('hypothesis-context').onchange=hypotheses;
$('context-unit').onchange=renderExposure;
for(const id of ['episode-kind','episode-route','episode-match','episode-horizon','episode-hit','episode-context'])$(id).onchange=updateEpisodes;
$('more-episodes').onclick=()=>{listLimit+=60;renderList();};
$('frame').oninput=drawFrame;
$('download-csv').onclick=downloadCSV;
$('play').onclick=()=>{
  if(timer){clearInterval(timer);timer=null;$('play').textContent='Воспроизвести';return;}
  if(!selectedEpisode?.actions.length)return;
  if(Number($('frame').value)>=Number($('frame').max))$('frame').value=0;
  $('play').textContent='Пауза';
  timer=setInterval(()=>{const next=Number($('frame').value)+1;
    if(next>Number($('frame').max)){clearInterval(timer);timer=null;$('play').textContent='Воспроизвести';return;}
    $('frame').value=next;drawFrame();
  },800);
};
start();
