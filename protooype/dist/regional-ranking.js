// Ranked candidates are built from preserved source rows, never from mesh size.
export function rankedRegion(data, ranking, name, category='all') {
  const records=data.regions[name]?.records||[];
  return (ranking.regions[name]?.top||[]).filter(row=>category==='all'||(category==='unlisted'?!data.genes[row.gene].inPaperTable:Boolean(data.genes[row.gene].pathways[category]))).map(row=>({...records.find(r=>r.gene===row.gene),...row}));
}
