export const planes={
  coronal:{axis:1,u:0,v:2,labels:['S','L','R','I'],coordinate:'Anterior'},
  horizontal:{axis:2,u:0,v:1,labels:['A','L','R','P'],coordinate:'Superior'},
  sagittal:{axis:0,u:1,v:2,labels:['S','P','A','I'],coordinate:'Right'}
};
export function voxelOffset(point,shape){
  if(point.some((n,i)=>!Number.isInteger(n)||n<0||n>=shape[i]))return -1;
  return (point[0]*shape[1]+point[1])*shape[2]+point[2];
}
// Canvas object-fit:contain can add letterboxing. Reject clicks in those margins.
export function slicePixelToVoxel(clientX,clientY,rect,shape,plane,index){
  const view=planes[plane],width=shape[view.u],height=shape[view.v];
  const scale=Math.min(rect.width/width,rect.height/height);
  const left=rect.left+(rect.width-width*scale)/2,top=rect.top+(rect.height-height*scale)/2;
  const x=(clientX-left)/scale,y=(clientY-top)/scale;
  if(x<0||y<0||x>=width||y>=height)return null;
  const point=[0,0,0];point[view.axis]=index;point[view.u]=Math.floor(x);point[view.v]=height-1-Math.floor(y);
  return point;
}
export function regionValues(region){return new Set([region.value,...region.descendant_values].filter(value=>value>0));}
