export function sampleEntry(coverage,gene,study,area,expected){
 const row=coverage?.genes?.[gene]?.studies?.[study]?.[area.toLowerCase()];
 return row?.matchesSavedValue&&Number.isFinite(expected)&&Math.abs(row.displayedMean-expected)<.051?row:null;
}
export function coverageForRecord(coverage,gene,study,record){
 return (record?.values||[]).map(value=>({area:value.area,nTPM:value.nTPM,evidence:sampleEntry(coverage,gene,study,value.area,value.nTPM)}));
}
export function sampleSummary(entries){
 const verified=entries.length>0&&entries.every(e=>e.evidence?.samples?.length>0&&e.evidence.sampleCount===e.evidence.samples.length);
 const samples=entries.flatMap(e=>e.evidence?.samples||[]);
 return {verified,limited:entries.length===1&&entries[0].evidence?.sampleCount===1,sourceCount:entries.length,tissueSamples:verified?new Set(samples.map(s=>s.id)).size:null,range:verified?[Math.min(...samples.map(s=>s.nTPM)),Math.max(...samples.map(s=>s.nTPM))]:null,independentDonors:verified&&samples.length===1?1:null};
}
export function coverageLabel(entries){
 const s=sampleSummary(entries);
 if(!s.verified)return 'Sample counts not verified for every source entry';
 if(s.sourceCount===1)return `Source n = ${s.tissueSamples} ${s.tissueSamples===1?'sample · limited sampling':'tissue samples · donors not verified'}`;
 return `${s.tissueSamples} tissue samples across ${s.sourceCount} source entries · not a donor total`;
}
