// ABC categorical cells use supplied CCF coordinates and source parcellation IDs.
export function ccfToRas(point,affine){return affine.slice(0,3).map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]+row[3]);}
export function rasToWorld(ras,template){const c=template.display_ras_center_mm,s=template.display_scale_world_units_per_mm;return[(ras[0]-c[0])*s,(ras[2]-c[2])*s,-(ras[1]-c[1])*s];}
export function ccfToVoxel(ccf,affine,template){const ras=ccfToRas(ccf,affine),a=template.preview_affine_ras_mm;return ras.map((x,i)=>(x-a[i][3])/a[i][i]);}
export function aggregateTypes(data,level,values=null){
 const counts=new Map();
 for(const [value,cluster,n] of data.region_cluster_counts){if(values&&!values.has(value))continue;const c=data.clusters[cluster],name=c[level]||'Unassigned',entry=counts.get(name)||{name,color:c[level+'_color']||'#99aabb',count:0};entry.count+=n;counts.set(name,entry);}
 return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}
export function matchingCellIndices(points,clusters,level,type=null,values=null){const result=[];for(let i=0;i<points.length;i++){const p=points[i];if(values&&!values.has(p[5]))continue;if(type&&clusters[p[4]][level]!==type)continue;result.push(i);}return result;}
