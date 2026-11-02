import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
