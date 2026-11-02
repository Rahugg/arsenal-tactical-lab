import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.env.RUNTIME_NODE_MODULES ??= path.join(ROOT,'node_modules');
const SKILL=process.env.ARSENAL_SLIDES_SKILL_DIR||'/Users/rahug/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const RUNTIME=process.env.ARSENAL_RUNTIME_PYTHON||'/Users/rahug/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const {finalizePresentation,applyPresentationChartFont}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')));
const r=JSON.parse(await fs.readFile(path.join(ROOT,'output/results.json'),'utf8'));
const home=r.summary.find(x=>x.home),away=r.summary.find(x=>!x.home);
const [h1,h2,h3]=r.hypotheses;
const f=(v,n=2)=>Number(v).toLocaleString('ru-RU',{minimumFractionDigits:n,maximumFractionDigits:n});
const RED='#C52235',INK='#17212B',GRAY='#6A7580',LINE='#DEE4E8';
const pres=Presentation.create({slideSize:{width:1280,height:720}});
const sources='Источник: Wyscout / Pappalardo et al. (2019), CC BY 4.0. '+r.source.repository+'\nRevision '+r.source.revision+'\nВсе числа: output/results.json; расчёты: Arsenal_Tactical_Lab.ipynb.';
const notes=[];

function text(slide,value,x,y,w,h,size=28,color=INK,bold=false) {
  const shape=slide.shapes.add({geometry:'textbox',name:'text-'+slide.shapes.items.length,
    position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  shape.text=value;
  shape.text.style={fontSize:size,typeface:'Arial',color,bold,verticalAlignment:'top',
    autoFit:'none',insets:{left:0,right:0,top:0,bottom:0}};
  return shape;
}
function slide(title,label='ИССЛЕДОВАНИЕ',note='',seconds=50,hidden=false) {
  const s=pres.slides.add();s.background.fill='#FFFFFF';s.hidden=hidden;
  const n=pres.slides.items.length;
  text(s,label,72,35,1000,24,15,GRAY);
  text(s,title,72,86,1136,112,44,INK,true);
  text(s,'ARSENAL LAB · AAI-2501M',72,672,600,22,14,GRAY);
  text(s,hidden?'Р'+String(n-11):String(n===14?12:n).padStart(2,'0'),1165,672,45,22,14,GRAY);
  s.speakerNotes.text=note+'\n\nОриентир времени: '+seconds+' сек.\n'+sources;
  notes.push({slide:n,title,seconds,hidden,text:note});
  return s;
}
function chart(s,categories,series,{x=72,y=230,w=1136,h=370,type='bar',direction='column',legend=true}={}) {
  const small=Math.max(...series.flatMap(q=>q.values))<1;
  const format=small?'0.0000':'0.0';
  const c=s.charts.add(type,{
    position:{left:x,top:y,width:w,height:h},categories,
    series:series.map((q,i)=>({name:q.name,values:q.values.map(v=>Number(v.toPrecision(12))),fill:q.color||(i?RED:INK),
      ...(type==='line'?{line:{fill:q.color||(i?RED:INK),width:3},marker:{symbol:'circle',size:6}}:{})})),
    barOptions:{direction,grouping:'clustered',gapWidth:70},
    hasLegend:legend,legend:{position:'bottom',overlay:false,textStyle:{fontSize:21,fill:GRAY}},
    xAxis:{textStyle:{fontSize:22,fill:INK},line:{fill:LINE,width:1}},
    yAxis:{min:0,textStyle:{fontSize:19,fill:GRAY},majorGridlines:{fill:LINE,width:1},
      numberFormatCode:small?'0.00':'0.0'},
    dataLabels:{showValue:type==='bar',position:'outEnd',numberFormatCode:format,
      textStyle:{fontSize:23,fill:INK}},
    chartFill:'#FFFFFF',plotAreaFill:'#FFFFFF'
  });
  applyPresentationChartFont(c,{fontFamily:'Arial'});return c;
}
function table(s,values,{x=72,y=240,w=1136,h=280,widths=null,size=24}={}) {
  const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,
    values,...(widths?{columnWidths:widths}:{})});
  t.borders.assign({fill:LINE,width:.7,style:'solid'});
  for(let row=0;row<values.length;row++)for(let col=0;col<values[row].length;col++){
    const cell=t.getCell(row,col);
    cell.fill=row===0?'#F3F5F7':'#FFFFFF';
    cell.text.style={fontSize:size,typeface:'Arial',color:INK,bold:row===0};
  }
  return t;
}
function body(s,items,{x=72,y=235,w=1110,size=29,gap=110}={}) {
  items.forEach((item,i)=>text(s,item,x,y+i*gap,w,gap-15,size));
}
function noteBelow(s,value){text(s,value,72,615,1136,40,20,GRAY);}

// 01: приветствие, тема и действительные имена.
{
 const s=slide('Arsenal 2017/18\nРазличия дома и на выезде','ЗДРАВСТВУЙТЕ! · AI FOOTBALL INTELLIGENCE',
  'Представить команду AAI-2501M и тему. Это историческая тактическая лаборатория по сценарию №4. Пользователь — тренерский штаб; задача — выбрать следующую обоснованную проверку. В докладе 10 минут 15 секунд, демонстрация 3 минуты. Финальный слайд вопросов не предполагает дополнительного трёхминутного выступления.',20);
 text(s,'Тактическая лаборатория · сценарий №4',72,225,1100,45,28,GRAY);
 text(s,r.team.group,72,290,1100,60,42,RED);
 r.team.members.forEach((name,i)=>text(s,name,72+(i%2)*570,390+Math.floor(i/2)*65,540,50,30,INK));
 noteBelow(s,'Рассказ: 10 минут 15 секунд. Демонстрация: 3 минуты.');
}
// 02: постановка и источник.
{
 const s=slide('Задача тренера: выбрать следующую проверку','ВОПРОС И ДАННЫЕ',
  'Arsenal: 47 очков дома, 16 на выезде. Изучаем, какие различия связаны с этим разрывом. Использованы все 380 матчей АПЛ 2017/18, 643150 событий, 38 матчей Arsenal и 19 пар соперников. Проверены координаты, игроки по составам, порядок, пенальти, автоголы, удаления и счёт. Один неполный гол Chelsea–Manchester City восстановлен по вратарскому событию для счёта, матч исключён из ML. Зарплаты и трансферы не нужны выбранному сценарию. Данные исторические, не описание современного Arsenal.',45);
 chart(s,['Дома','На выезде'],[{name:'Очки',values:[home.points,away.points],color:RED}],{x:72,y:240,w:690,h:330,legend:false});
 text(s,'380 матчей лиги\n38 матчей Arsenal\n19 пар соперников',835,275,365,180,32);
 noteBelow(s,'Wyscout · 2017/18 · исходники, revision и SHA-256 сохранены');
}
// 03: метод и измеренное качество.
{
 const q=[r.model.quality[0],r.model_robustness.quality[0],r.model_robustness.quality[1]];
 const s=slide('Качество удара: простая проверенная модель','МЕТОД И ВАЛИДАЦИЯ',
  'Цепочка: события → аудит → предударные признаки → вероятность гола → парные сравнения → проверяемые эпизоды → решение. Основная логистическая регрессия: расстояние, угол, голова/корпус, прямой штрафной. Без гола, сейва или попадания в створ во входах. Arsenal исключён. Первые 80% остальных матчей обучающие, поздние 20% тестовые; после исключения неполного матча 272/69 матчей, 6295/1522 ударов. Стандартизация только по обучению. Константа обучающей вероятности служит базой. Вторая спецификация только с расстоянием и углом проверяет устойчивость, не заменяет основную. Brier: '+q.map(x=>f(x.brier,4)).join(' / ')+'. Log loss: '+q.map(x=>f(x.log_loss,4)).join(' / ')+'. Калибровка обеих моделей в notebook. Выбрали регрессию ради объяснимости и проверяемости; более сложная модель требует доказанного улучшения.',70);
 chart(s,['Константа','4 признака','2 признака'],[{name:'Brier score',values:q.map(x=>x.brier)}],{x:72,y:235,w:530,h:330,legend:false});
 chart(s,['Константа','4 признака','2 признака'],[{name:'Log loss',values:q.map(x=>x.log_loss),color:RED}],{x:670,y:235,w:530,h:330,legend:false});
 text(s,'Brier score',230,575,310,30,23,GRAY);text(s,'Log loss',840,575,310,30,23,GRAY);
 noteBelow(s,'Arsenal исключён · временной тест · меньше Brier и log loss — лучше');
}
// 04: полное тождество.
{
 const g=r.goal_gap_accounting;
 const s=slide('Полный разрыв: 41 непенальтийный гол','БУХГАЛТЕРСКОЕ РАЗЛОЖЕНИЕ',
  'Домашняя непенальтийная разница голов 32, выездная -9: разрыв 41. Четыре компонента — '+g.components.map(x=>x.label+': '+f(x.value)).join('; ')+'. Их сумма ровно 41. Самая большая составляющая — собственная реализация относительно xG: 18,38. Не ограничиваем объяснение только снижением созданного xG 14,62. Пенальти дают ещё +5 к разрыву, автоголы -1: фактический разрыв разницы голов 45 (домашняя 34, выездная -11). Это модельное тождество, не причинные вклады и не распределение 31 потерянного очка.',75);
 chart(s,['Создание\nArsenal','Допущенные\nмоменты','Реализация\nArsenal','Реализация\nсоперников'],[{name:'Компонент разрыва',values:g.components.map(x=>x.value),color:RED}],{x:72,y:235,w:1136,h:310,legend:false});
 text(s,f(g.nonpenalty_goal_difference_gap,0)+' + '+g.penalty_gap+' (пенальти) − '+Math.abs(g.own_goal_gap)+' (автоголы) = '+f(g.actual_goal_difference_gap,0),72,565,1136,40,29);
 noteBelow(s,'Дом минус выезд · модельное тождество, без причинной интерпретации');
}
// 05: конкретный механизм, выбранный после расчётов.
{
 const own=route=>r.delivery_mechanism.summary.find(x=>x.route===route&&x.home);
 const travel=route=>r.delivery_mechanism.summary.find(x=>x.route===route&&!x.home);
 const e=r.delivery_mechanism.effects.find(x=>x.route==='other'&&x.metric==='shot_pct');
 const xg=r.delivery_mechanism.effects.find(x=>x.route==='other'&&x.metric==='xg_per100_entries');
 const alt=r.delivery_mechanism.effects.find(x=>x.route==='other'&&x.metric==='alternative_xg_per100_entries');
 const s=slide('На выезде после доставок без навеса\nреже следует удар','РАЗВЕДОЧНЫЙ МЕХАНИЗМ',
  'Определение: Pass Arsenal из атакующей трети, начало вне штрафной, конец внутри штрафной 16.5×40.32 м на поле 105×68. Знаменатель возможностей — все передачи из выбранной зоны, а не только ударные атаки. Все попытки включены; неудачный конец не устанавливает намерение. Без навеса дома '+own('other').attempts+' доставок и '+f(own('other').shot_pct,2)+'% с ударом, на выезде '+travel('other').attempts+' и '+f(travel('other').shot_pct,2)+'%. Средняя парная разница '+f(e.difference)+' п.п., 95% ДИ ['+f(e.low)+'; '+f(e.high)+'], 19 пар. xG на 100 доставок: Δ '+f(xg.difference)+', в геометрической модели '+f(alt.difference)+'. Частота доставок имеет неопределённое различие; нельзя заключать, что нужно просто больше таких передач. Окно 15 секунд, один тайм, без остановки или подтверждённого контроля соперника, удар относится к последней доставке. Навесы: 18 полных пар для долей, одна пара без попытки исключена. Много разведочных сравнений, интервалы не скорректированы. Давление и выбор маршрута могут смешивать наблюдение.',75);
 chart(s,['Без навеса','Навесы'],[{name:'Дома',values:['other','cross'].map(x=>own(x).shot_pct)},{name:'Выезд',values:['other','cross'].map(x=>travel(x).shot_pct)}],{h:310});
 text(s,'Без навеса: Δ '+f(e.difference)+' п.п.  ·  95% ДИ ['+f(e.low)+'; '+f(e.high)+']',72,565,1136,40,27);
 noteBelow(s,'Доля доставок с ударом, % · разведочно · причинность не установлена');
}
// 06: исходные проверки не переписаны после нового результата.
{
 const s=slide('Основные гипотезы после Holm не подтверждены','ПРОВЕРКА ГИПОТЕЗ',
  'H1 — непенальтийный xG-баланс, H2 — собственные непенальтийные голы минус xG, H3 — доля неудачных передач с ударом соперника за 15 секунд. Все — выезд минус дом, 19 пар одних соперников. Бутстрэп пар 5000, seed42; двусторонняя смена знаков 19999 и Holm по трём тестам. Все три p после Holm выше0.05. Обычные 95% интервалы не скорректированы, поэтому H1/H2 могут не включать0, это не противоречие. Отсутствие значимости не доказывает нулевой эффект. Новые разведочные результаты доставки не заменяют исходные гипотезы.',60);
 table(s,[['Проверка','Выезд − дом','95% интервал','Holm p'],...r.hypotheses.map(h=>[h.id+(h.id==='H3'?' (п.п.)':' / матч'),f(h.difference),'['+f(h.low)+'; '+f(h.high)+']',f(h.p_holm,3)])],{widths:[270,230,380,256],h:270,size:26});
 noteBelow(s,'19 пар · 5000 бутстрэп-повторений · интервалы без поправки · Holm для p-value');
}
// 07: знаменатель и его ограничение.
{
 const rows=[true,false].map(home=>r.state_exposure.summary.find(x=>x.context==='level'&&x.home===home));
 const p=r.state_exposure.pooled_effects.find(x=>x.context==='level'&&x.metric==='xg_balance_per90');
 const equal=r.state_exposure.effects.find(x=>x.context==='level'&&x.metric==='balance_per90');
 const short=r.state_exposure.short_exposure_sensitivity.find(x=>x.context==='level');
 const s=slide('Равный счёт: сравниваем xG на минуты состояния','ЭКСПОЗИЦИЯ И УСТОЙЧИВОСТЬ',
  'При равном счёте и11×11 дома '+f(rows[0].minutes,1)+' минуты, на выезде '+f(rows[1].minutes,1)+'. Поэтому одинаковые суммы не означали бы одинаковую интенсивность. Агрегированный xG-баланс/90 '+f(rows[0].balance_per90)+' против '+f(rows[1].balance_per90)+'. Разница агрегированных интенсивностей '+f(p.difference)+', 95% ДИ ['+f(p.low)+'; '+f(p.high)+'], бутстрэп тех же пар. Средняя индивидуальных парных скоростей другая: '+f(equal.difference)+'; некоторые состояния короче3минут. При минимуме10минут в обоих матчах '+short.n+' пар и Δ '+f(short.difference)+'. Показываем это в приложении и резерве, не прячем различие оценок. Конец тайма max45мин и последнего события, остановки включены, перерыв исключён. Нормировка не устанавливает причинный эффект счёта. Основные Holm p не применяются к новым разрезам.',65);
 table(s,[['Поле','Минуты','Создано / 90','Допущено / 90','Баланс / 90'],...rows.map(x=>[x.home?'Дома':'Выезд',f(x.minutes,1),f(x.xgf_per90),f(x.xga_per90),f(x.balance_per90)])],{widths:[180,180,255,270,251],h:210,size:26});
 text(s,'Δ агрегированных интенсивностей: '+f(p.difference)+'  ·  95% ДИ ['+f(p.low)+'; '+f(p.high)+']',72,495,1136,65,27);
 noteBelow(s,'Матчевые часы с остановками · разные оценки по-разному взвешивают короткие состояния');
}
// 08: выделенное демо.
{
 const s=slide('Демонстрация лаборатории: 3 минуты','ОТ ВЫВОДА ДО ИСХОДНОГО СОБЫТИЯ',
  '0:00–0:35 обзор, четыре компонента и таблица пар. 0:35–1:10 исходные гипотезы, затем равный счёт и переключение сумм/90. 1:10–2:20 доставки без навеса, один эпизод с ударом и один без, исходные match/event IDs, воспроизведение и ручной шаг. 2:20–3:00 матрица альтернатив и границы аудита агента. Показать, что события реальны, а линии между ними условны; позиции остальных игроков отсутствуют. Не утверждать, что интерфейс уже помог реальным тренерам или сэкономил людям время. Работает локально без внешних запросов.',180);
 const buf=await fs.readFile(path.join(ROOT,'output/figures/04_shot_maps.png'));
 s.images.add({blob:buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),contentType:'image/png',alt:'Реальные удары Arsenal дома и на выезде',fit:'contain',position:{left:72,top:230,width:1136,height:345}});
 noteBelow(s,'Контекст → маршрут доставки → эпизод и контрпример → варианты решения');
}
// 09: сравнение действий.
{
 const s=slide('Что проверить тренеру и почему','ПОДДЕРЖКА РЕШЕНИЙ',
  r.decision_matrix.map(x=>x.action+'\nДанные: '+x.evidence+'\nНеопределённость: '+x.uncertainty+'\nРесурсы: '+x.resources+'\nПроверка: '+x.test+'\n'+x.benefit).join('\n\n')+'\nПрактическое предложение: разбор приёма и следующего решения после доставки без навеса, затем упражнение с одинаковыми зонами, составами и давлением. Конкретное следующее действие выбирается после видео. Это переносимый аналитический процесс, а не доказанная тактическая поправка для современного Arsenal.',70);
 table(s,[['Альтернатива','Поддержка','Проверка'],['Приём и решение\nпосле доставки','С ударом: Δ −12 п.п.\nРазведочный результат','Одинаковые зоны\nи давление'],['Завершение','18,4 гола: остаток модели\nH2 Holm p '+f(r.hypotheses[1].p_holm,3),'Одинаковые серии\nРешение отдельно от исхода'],['Дополнительное видео','Нет трекинга\nПричинность не установлена','Разметить давление\nи варианты передачи']],{widths:[380,390,366],h:320,size:24});
 noteBelow(s,'Ресурсы — плановые допущения. Дополнительные победы от вмешательства не оценены.');
}
// 10: все пять пунктов AI-disclosure из §8.
{
 const s=slide('Где использован AI и как проверялся результат','AI-DISCLOSURE',
  '§8 задания. Для каких задач: Codex помогал выбирать тему, формулировать гипотезы, писать и отлаживать код, строить графики, интерфейс и презентацию. Входы: полный TXT задания, пользовательский план, открытые Wyscout, исходное ревью. Проверка: закреплённый источник и SHA256, восстановление380 результатов, граничные тесты, чистый kernel, независимый поздний тест модели, константа, калибровка, интервалы и чувствительность, browser tests. Обнаруженные риски: ошибка разметки гола, утечка результата, короткие экспозиции, множественные сравнения, причинное преувеличение и неподтверждённый совет о коротких комбинациях. Исправлены учётом источника, разбиением, нормировкой и ограничением утверждений. Проверки выполнены агентом; личные человеческие проверки не заявляются. В продукте AI — вероятностная модель удара, а DSS — контекст, конкурирующие объяснения, эпизоды и сравнение действий. LLM при разработке и интеллект продукта — разные вещи. Проценты использования AI не выдумывались: перечислены реальные этапы.',60);
 table(s,[['Где','Вход','Проверка'],['Codex: постановка, код,\nотладка и материалы','TXT, план, Wyscout,\nревью и результаты запуска','Исходники, граничные тесты,\nчистый запуск'],['AI внутри продукта','Предударные признаки\nбез результата удара','Поздний тест и константа,\nкалибровка и устойчивость'],['DSS: выбор проверки','Гипотезы, контексты,\nэпизоды и альтернативы','Шесть задач агента.\nТест с людьми не проведён']],{widths:[390,360,386],h:305,size:24});
 noteBelow(s,'Выполненные проверки — агентом. Самостоятельные человеческие проверки не заявляются.');
}
// 11: ответ, ограничения и следующий шаг.
{
 const s=slide('Следующий шаг: проверка продолжения после доставки','ВЫВОД И ОГРАНИЧЕНИЯ',
  'Ответ на исследовательский вопрос: разрыв связан с созданием моментов и реализацией; самое большое бухгалтерское слагаемое — собственный остаток голы-xG. Новый конкретный кандидат для проверки — продолжение после доставок без навеса. При этом H1–H3 после Holm не подтверждены. Ограничения:19пар, исторический сезон, нет трекинга/давления, модель не учитывает всех обстоятельств удара, интервалы условны относительно модели, новые сравнения разведочные, минуты приближённые, короткие состояния нестабильны, нет испытания тактики и пользовательского эксперимента. Следующий шаг — видеоразбор в сопоставимых условиях и контролируемое упражнение. Дополнительные данные: трекинг, давление, видео, независимые сезоны. Сильная сторона проекта — проверяемость и связь вывода с событием, а не обещание причинности или новой победы.',65);
 table(s,[['Что известно','Что остаётся проверить'],['Разрыв качества и реализации\nМаршрут доставки связан с продолжением','Причинный механизм\nЭффект конкретного упражнения'],['19 пар, исторические события\nБез трекинга и давления','Независимые матчи и видео\nРабота без мяча'],['Приложение проходит задачи агента','Пользу и удобство для людей']],{widths:[568,568],h:315,size:26});
 noteBelow(s,'Рекомендация — обоснованная проверка. Эффект на очки и победы не установлен.');
}
// 12 и 13: резерв скрыт, основной показ завершится физическим слайдом 14.
{
 const s=slide('Признаки, коэффициенты и защита от утечки','РЕЗЕРВ 1 · МОДЕЛЬ',
  'Открыть только по вопросу. Коэффициенты основной модели в стандартизованном пространстве. StandardScaler обучен только на train. C=1, max_iter1000, seed42. Поле105×68м. Дополнительная спецификация distance/angle использует тот же train/test. Не включены goal,save,on-target,результат матча. Исторический аудит применяет модель ко всему сезону Arsenal, это не имитация real-time прогноза. Пенальти и автоголы вне модели.',0,true);
 table(s,[['Признак','Стандартизованный коэффициент'],...['Расстояние','Угол ворот','Голова / корпус','Прямой штрафной'].map((label,i)=>[label,f(r.model.coefficients[i],3)])],{widths:[500,636],h:300,size:26});
 noteBelow(s,'272 / 69 матчей · 6295 / 1522 удара · Arsenal исключён');
}
{
 const level=r.state_exposure.short_exposure_sensitivity.find(x=>x.context==='level');
 const s=slide('Разные оценки и чувствительность','РЕЗЕРВ 2 · СТАТИСТИКА',
  'Бутстрэп5000 по парам, seed42. Агрегированная интенсивность — отношение суммарного xG и минут; среднее парных скоростей даёт одинаковый вес матчам с разной экспозицией. Поэтому оценки различаются. Короткие периоды создают большую вариативность. Минимум10минут — отдельная чувствительность, не новый основной анализ. Обе спецификации сохраняют отрицательное направление H1/H2; исходные Holm p не меняются. Ни нормировка, ни фильтр не рандомизируют домашнее поле или счёт.',0,true);
 table(s,[['Оценка','Разница баланса / 90','Пар'],...['all','eleven','level'].map(c=>{const x=r.state_exposure.pooled_effects.find(x=>x.context===c&&x.metric==='xg_balance_per90');return [{all:'Все состояния',eleven:'11 × 11',level:'Равный счёт, 11 × 11'}[c],f(x.difference),String(x.n)];}),['Равный счёт, минимум 10 минут\nСреднее парных скоростей',f(level.difference),String(level.n)]],{widths:[570,360,206],h:310,size:24});
 noteBelow(s,'Агрегированные интенсивности в первых трёх строках; последняя — другая оценка');
}
// 14: последний видимый слайд = 12-й в основном показе.
{
 const s=slide('','СПАСИБО ЗА ВНИМАНИЕ',
  'Завершить основной показ и предложить вопросы. Готовиться объяснить алгоритм, изменить параметр, показать реальный эпизод, рассказать о методе проверки и сильнейшем ограничении. Два предыдущих резервных слайда скрыты в режиме показа, доступны по номеру12 и13. Сумма основных времён с демонстрацией795секунд (13:15).',10);
 text(s,'Any questions?',72,185,1136,120,76,INK,true);
 text(s,r.team.group,76,385,1100,60,36,RED);
 text(s,r.team.members.join('  ·  '),76,465,1120,65,23,GRAY);
 text(s,'github.com/Rahugg/arsenal-tactical-lab',76,550,1120,45,26,INK);
}

const buildDir=path.join(ROOT,'.build/deck-final');
const previewDir=path.join(ROOT,'output/slide-previews');
await fs.mkdir(buildDir,{recursive:true});await fs.mkdir(previewDir,{recursive:true});
await fs.writeFile(path.join(ROOT,'presentation/notes.json'),JSON.stringify(notes,null,2));
for(let i=0;i<pres.slides.items.length;i++){
 const png=await pres.export({slide:pres.slides.items[i],format:'png',scale:1.5});
 await fs.writeFile(path.join(previewDir,'slide-'+String(i+1).padStart(2,'0')+'.png'),new Uint8Array(await png.arrayBuffer()));
 console.log('Rendered',i+1);
}
const candidate=path.join(buildDir,'candidate.pptx');
await (await PresentationFile.exportPptx(pres)).save(candidate);
const tables=[6,7,9,10,11,12,13],charts=[2,3,4,5];
const finalPath=path.join(ROOT,'output',process.env.ARSENAL_PPTX_NAME||'Arsenal_Tactical_Lab_final.pptx');
const result=await finalizePresentation({
 workspaceDir:ROOT,candidatePath:candidate,finalPath,pythonExecutable:RUNTIME,
 integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...tables.flatMap(n=>['--require-native-table-slide',String(n)])],
 explicitTotalSlideCount:14,requiredNativeChartOwnerSlides:charts,requiredNativeTableOwnerSlides:tables,
 materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'user_request',families:['Arial']},
 verifyArtifactToolImport:true,receiptPath:path.join(buildDir,'validation.json')
});
console.log(JSON.stringify({finalPath,bytes:result.byteCount,slideCount:14}));
