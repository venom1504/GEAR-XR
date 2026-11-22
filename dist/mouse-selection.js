// Select original triangles only; parent selections use the union of descendant labels.
export function selectedSurfaceIndices(parts,indices,values){
 const chosen=parts.filter(p=>values.has(p.value));
 const result=new Uint32Array(chosen.reduce((sum,p)=>sum+p.index_count,0));let offset=0;
 for(const part of chosen){result.set(indices.subarray(part.index_start,part.index_start+part.index_count),offset);offset+=part.index_count;}
 return result;
}
// Borders surround the selected union, not every internal anatomical subdivision.
export function isSelectionBorder(mask,width,height,x,y){
 const i=y*width+x;if(!mask[i])return false;
 return x===0||y===0||x===width-1||y===height-1||!mask[i-1]||!mask[i+1]||!mask[i-width]||!mask[i+width];
}
