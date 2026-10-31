export function sampleEntry(coverage,gene,study,area,expected){
  const row=coverage?.genes?.[gene]?.studies?.[study]?.[area.toLowerCase()];
  return row?.matchesSavedValue&&Number.isFinite(expected)&&Math.abs(row.displayedMean-expected)<.051?row:null;
}
export function coverageForRecord(coverage,gene,study,record){
  return (record?.values||[]).map(value=>({area:value.area,nTPM:value.nTPM,evidence:sampleEntry(coverage,gene,study,value.area,value.nTPM)}));
}
export function coverageLabel(entries){
  if(!entries.length)return 'Sample counts not verified';
  if(entries.length===1){const n=entries[0].evidence?.sampleCount;return n===undefined?'Sample count not verified':`Source n = ${n} ${n===1?'sample · limited sampling':'samples · independent donor count unknown'}`;}
  return 'Samples per source entry: '+entries.map(e=>e.evidence?.sampleCount??'not verified').join(' / ')+' · not a donor total';
}
