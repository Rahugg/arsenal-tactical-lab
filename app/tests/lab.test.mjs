import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actionGeometry} from '../lab-utils.js';

test('гол Welbeck не летит к служебной координате (0,0)',()=>{
  const action={type:'Shot',arsenal:true,goal:true,positions:[{x:92,y:50},{x:0,y:0}]};
  const geometry=actionGeometry(action);
  assert.deepEqual(geometry.origin,{x:92,y:50});
  assert.deepEqual(geometry.end,{x:100,y:50});
  assert.equal(geometry.kind,'goal');
  assert.deepEqual(action.positions[1],{x:0,y:0});
});
test('гол соперника направлен в левые ворота при нормировке Arsenal вправо',()=>{
  assert.deepEqual(actionGeometry({type:'Shot',arsenal:false,goal:true,positions:[{x:8,y:50},{x:100,y:100}]}).end,{x:0,y:50});
});
test('неголевой удар не использует ни одну из служебных конечных координат',()=>{
  for(const end of [{x:0,y:0},{x:100,y:100},{x:70,y:35}]){
    const geometry=actionGeometry({type:'Shot',goal:false,positions:[{x:80,y:40},end]});
    assert.equal(geometry.end,null);
    assert.equal(geometry.isShot,true);
  }
});
test('пенальти и прямой штрафной обрабатываются как удары',()=>{
  for(const subtype of ['Penalty','Free kick shot']){
    assert.equal(actionGeometry({type:'Free Kick',subtype,arsenal:true,goal:true,positions:[{x:89,y:50},{x:0,y:0}]}).kind,'goal');
  }
});
test('передача в реальный угол сохраняет координаты, дуэль не рисует линию',()=>{
  const positions=[{x:80,y:30},{x:0,y:0}];
  assert.deepEqual(actionGeometry({type:'Pass',positions}).end,{x:0,y:0});
  assert.equal(actionGeometry({type:'Duel',positions}).end,null);
});
test('дублирующее гол событие вратаря не становится новым голом и точкой в углу',()=>{
  const geometry=actionGeometry({type:'Save attempt',goal:true,positions:[{x:100,y:100},{x:95,y:40}]});
  assert.equal(geometry.isGoal,false);
  assert.equal(geometry.end,null);
  assert.equal(geometry.origin,null);
});
test('отсутствующие и неверные координаты не попадают в SVG',()=>{
  for(const positions of [[],[{x:NaN,y:50}],[{x:101,y:50}]]){
    assert.equal(actionGeometry({type:'Pass',positions}).origin,null);
  }
});
test('маршрут доставки фильтруется без смешивания навесов и остальных передач',async()=>{
  const {filterEpisodes}=await import('../lab-utils.js');
  const rows=[{kind:'delivery',route:'cross',horizon:15},{kind:'delivery',route:'other',horizon:15}];
  assert.equal(filterEpisodes(rows,{kind:'delivery',route:'cross'}).length,1);
  assert.equal(filterEpisodes(rows,{kind:'delivery',route:'other'})[0].route,'other');
});
test('данные пустой выборки не превращаются в нулевой риск', async()=>{
  assert.ok(fs.existsSync(new URL('../lab-utils.js',import.meta.url)), 'модуль фильтров отсутствует');
  const {filterEpisodes,riskSummary}=await import('../lab-utils.js');
  assert.deepEqual(filterEpisodes([], {horizon:15}), []);
  assert.equal(riskSummary([]).rate,null);
});
test('фильтры сохраняют только выбранный матч, горизонт и игровой контекст',async()=>{
  const {filterEpisodes}=await import('../lab-utils.js');
  const rows=[
    {match_id:1,horizon:15,hit:true,eleven_v_eleven:true,score_diff:0},
    {match_id:1,horizon:10,hit:false,eleven_v_eleven:true,score_diff:0},
    {match_id:2,horizon:15,hit:true,eleven_v_eleven:false,score_diff:0},
    {match_id:1,horizon:15,hit:true,eleven_v_eleven:true,score_diff:1}];
  assert.equal(filterEpisodes(rows,{matchId:'1',horizon:15,hit:'yes',context:'level'}).length,1);
  assert.equal(filterEpisodes(rows,{horizon:15,hit:'no'}).length,0);
  assert.equal(filterEpisodes(rows,{horizon:15,context:'eleven'}).length,2);
});
