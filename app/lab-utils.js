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
