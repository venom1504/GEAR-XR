export function mappingContext(data,name){
 const region=data.regions[name];
 if(!region?.dataset)return null;
 const key=r=>r.dataset+'|'+[...r.areas].sort().join('|');
 return {match:region.match,areas:region.areas,peers:Object.entries(data.regions).filter(([id,r])=>id!==name&&r.dataset&&key(r)===key(region)).map(([id])=>id)};
}
