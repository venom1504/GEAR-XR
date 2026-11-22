export function regionSummary(data,parcelId,probe,donorId){
 const mapping=data.mapping[parcelId];if(!mapping||!probe)return null;
 const ids=new Set(mapping.source_structure_ids),rows=[];
 data.samples.forEach((sample,i)=>{const value=probe.expression_level[i];if(sample.donor.id===Number(donorId)&&ids.has(sample.structure.id)&&Number.isFinite(value))rows.push({well:sample.sample.well,structure:sample.structure.name,value,index:i});});
 if(!rows.length)return null;
 const values=rows.map(r=>r.value);
 return {mean:values.reduce((a,b)=>a+b,0)/values.length,n:values.length,min:Math.min(...values),max:Math.max(...values),rows};
}
export function expressionColor(value,min,max){
 if(!Number.isFinite(value))return '#59636c';
 const t=max>min?Math.max(0,Math.min(1,(value-min)/(max-min))):.5;
 const a=[44,74,111],b=[253,204,97];return '#'+a.map((x,i)=>Math.round(x+(b[i]-x)*t).toString(16).padStart(2,'0')).join('');
}
export function summaryScale(summaries){const values=summaries.filter(Boolean).map(s=>s.mean);return values.length?[Math.min(...values),Math.max(...values)]:[0,0];}
