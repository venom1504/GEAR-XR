export function revealParcels(parcels){for(const mesh of parcels)mesh.visible=true;}
export function pointerCoordinates(event,rect){return {x:(event.clientX-rect.left)/rect.width*2-1,y:-(event.clientY-rect.top)/rect.height*2+1};}
export function disposeChildren(group){
 while(group.children.length){const child=group.children[0];child.traverse(x=>{x.geometry?.dispose();for(const material of (Array.isArray(x.material)?x.material:x.material?[x.material]:[]))material.dispose();});child.removeFromParent();}
}
