// ABC categorical cells use supplied CCF coordinates and source parcellation IDs.
// Preserve packed arrays: do not allocate a million record arrays or round uint128 IDs.
export function decodeCellPoints(buffer,metadata){
 if(!(buffer instanceof ArrayBuffer))throw Error('Cell payload must be an ArrayBuffer.');
 if(metadata.point_format!=='typed-arrays-v1')throw Error('Unsupported cell record format.');
 const n=metadata.rendered_cells;
 if(!Number.isSafeInteger(n)||n<1||buffer.byteLength!==metadata.uncompressed_bytes)throw Error('Cell payload length does not match metadata.');
 const schema={positions:[Float32Array,3,'float32'],clusters:[Uint16Array,1,'uint16'],regions:[Uint16Array,1,'uint16'],sections:[Uint16Array,1,'uint16'],confidence:[Float32Array,2,'float32'],quality:[Uint8Array,1,'uint8'],ids:[Uint8Array,16,'uint8']},points={length:n},ranges=[];
 // The file is little endian. Typed arrays on current supported browsers are little endian.
 if(new Uint8Array(new Uint16Array([1]).buffer)[0]!==1)throw Error('This cell format requires a little-endian browser.');
 for(const [name,[Ctor,width,dtype]] of Object.entries(schema)){
  const spec=metadata.point_layout?.[name],bytes=n*width*Ctor.BYTES_PER_ELEMENT;
  if(!spec||spec.dtype!==dtype||!Number.isSafeInteger(spec.offset)||spec.offset<0||spec.offset%Ctor.BYTES_PER_ELEMENT||spec.bytes!==bytes||spec.offset+bytes>buffer.byteLength)throw Error(`Invalid cell array layout: ${name}.`);
  ranges.push([spec.offset,spec.offset+bytes]);points[name]=new Ctor(buffer,spec.offset,n*width);
 }
 ranges.sort((a,b)=>a[0]-b[0]);
 if(ranges.some((r,i)=>i&&r[0]<ranges[i-1][1]))throw Error('Overlapping cell arrays.');
 for(let i=0;i<n;i++){
  if(points.clusters[i]>=metadata.clusters.length||points.sections[i]>=metadata.sections.length||points.quality[i]>1)throw Error(`Invalid categorical cell record at ${i}.`);
  if(!Number.isFinite(points.positions[i*3])||!Number.isFinite(points.positions[i*3+1])||!Number.isFinite(points.positions[i*3+2]))throw Error(`Invalid cell coordinates at ${i}.`);
  if(!(points.confidence[i*2]>=0&&points.confidence[i*2]<=1&&points.confidence[i*2+1]>=0&&points.confidence[i*2+1]<=1))throw Error(`Invalid cell confidence at ${i}.`);
 }
 return points;
}
export function pointAt(points,index){
 if(!Number.isInteger(index)||index<0||index>=points.length)throw RangeError('Cell index out of range.');
 if(Array.isArray(points))return points[index];
 let id=0n;for(let i=index*16;i<(index+1)*16;i++)id=(id<<8n)|BigInt(points.ids[i]);
 return[id.toString(),points.positions[index*3],points.positions[index*3+1],points.positions[index*3+2],points.clusters[index],points.regions[index],points.sections[index],points.confidence[index*2],points.confidence[index*2+1],Boolean(points.quality[index])];
}
export function ccfToRas(point,affine){return affine.slice(0,3).map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]+row[3]);}
export function rasToWorld(ras,template){const c=template.display_ras_center_mm,s=template.display_scale_world_units_per_mm;return[(ras[0]-c[0])*s,(ras[2]-c[2])*s,-(ras[1]-c[1])*s];}
export function ccfToVoxel(ccf,affine,template){const ras=ccfToRas(ccf,affine),a=template.preview_affine_ras_mm;return ras.map((x,i)=>(x-a[i][3])/a[i][i]);}
export function aggregateTypes(data,level,values=null){
 const counts=new Map();
 for(const [value,cluster,n] of data.region_cluster_counts){if(values&&!values.has(value))continue;const c=data.clusters[cluster],name=c[level]||'Unassigned',entry=counts.get(name)||{name,color:c[level+'_color']||'#99aabb',count:0};entry.count+=n;counts.set(name,entry);}
 return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}
export function matchingCellIndices(points,clusters,level,type=null,values=null){
 const result=[],packed=!Array.isArray(points);
 for(let i=0;i<points.length;i++){const region=packed?points.regions[i]:points[i][5],cluster=packed?points.clusters[i]:points[i][4];if(values&&!values.has(region))continue;if(type&&(clusters[cluster][level]||'Unassigned')!==type)continue;result.push(i);}return result;
}
