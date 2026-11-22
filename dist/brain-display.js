// Rendering only: opacity changes never alter coordinates or label boundaries.
export function applyBrainOpacity(material,percent){
 const opacity=Math.max(.2,Math.min(1,Number(percent)/100));
 const transparent=opacity<1;
 if(material.transparent!==transparent||material.alphaHash)material.needsUpdate=true;
 material.alphaHash=false;material.transparent=transparent;material.opacity=opacity;material.depthWrite=true;
}
