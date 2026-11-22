// Exact Allen structure-ID matches only; no parent fallback or experiment pooling.
export function measurement(experiment,identifier){
  const row=experiment?.stats?.[identifier];
  if(!row||!Number.isFinite(row.expression_energy)||!Number.isFinite(row.expression_density)||!(row.sum_pixels>0))return null;
  return row;
}
export function energyMaximum(experiment,regions){
  return Math.max(0,...regions.map(r=>measurement(experiment,r.identifier)?.expression_energy??0));
}
export function energyColor(value,maximum){
  if(!Number.isFinite(value))return '#53626c';
  const t=maximum>0?Math.sqrt(Math.max(0,Math.min(1,value/maximum))):0;
  const a=[27,48,74],b=[255,206,99];
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
