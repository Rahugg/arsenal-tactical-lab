export function filterEpisodes(rows,{matchId='all',horizon=15,hit='all',context='all',kind='turnover',route='all'}={}) {
  return rows.filter(e =>
    (e.kind??'turnover')===kind &&
    (route==='all'||e.route===route) &&
    (matchId==='all'||String(e.match_id)===String(matchId)) &&
    e.horizon===Number(horizon) &&
    (hit==='all'||e.hit===(hit==='yes')) &&
    (context==='all'||e.eleven_v_eleven) &&
    (context!=='level'||e.score_diff===0));
}
export function riskSummary(rows) {
  const hits=rows.filter(e=>e.hit).length;
  return {n:rows.length,hits,rate:rows.length?100*hits/rows.length:null};
}
export function number(value,digits=2) {
  return value===null||value===undefined||!Number.isFinite(Number(value))?'—':
    Number(value).toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
export function clock(period,second) {
  const offset=period==='2H'?45:0;
  return String(Math.floor(second/60)+offset).padStart(2,'0')+':'+String(Math.floor(second%60)).padStart(2,'0');
}

// Shot positions[1] is a Wyscout placeholder, not a ball destination.
// A goal is shown towards the goal centre only as an explicitly labelled diagram.
export function actionGeometry(action) {
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100;
  const positions=action.positions??[];
  const isShot=action.type==='Shot'||(action.type==='Free Kick'&&['Free kick shot','Penalty'].includes(action.subtype));
  const isGoal=isShot&&action.goal===true;
  const origin=action.type!=='Save attempt'&&valid(positions[0])?positions[0]:null;
  const isPass=action.type==='Pass'||(action.type==='Free Kick'&&!isShot);
  const end=isGoal?{x:action.arsenal?100:0,y:50}:isPass&&valid(positions[1])?positions[1]:null;
  return {origin,end,isShot,isGoal,kind:isGoal?'goal':isPass&&end?'pass':'point'};
}
