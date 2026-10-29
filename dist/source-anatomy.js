const $=id=>document.getElementById(id);

// Each image uses its own original section coordinates. The grid is a majority
// annotation summary, not a segmentation of a reconstructed fetal brain.
export class SourceAnatomy{
  constructor(data,regions,onRegion){
    Object.assign(this,{data,regions,onRegion,sample:data.samples[0],sources:[],broad:false,active:false});
    this.canvas=$('tissueCanvas');this.context=this.canvas.getContext('2d');
    for(const sample of data.samples){const o=document.createElement('option');o.value=sample.section;o.textContent=sample.section+' · '+sample.ageGW+' GW';$('sectionSelect').append(o);}
    $('sectionSelect').onchange=()=>{this.sample=data.samples.find(s=>s.section===$('sectionSelect').value);this.draw();};
    this.canvas.onclick=e=>{
      const [x,y]=this.canvasPoint(e);
      this.selectAt(x,y);
    };
    this.canvas.onpointermove=e=>{
      const [x,y]=this.canvasPoint(e);
      const gx=Math.floor((x-this.offsetX)/this.scale),gy=Math.floor((y-this.offsetY)/this.scale),category=this.lookup.get(gx+this.sample.gridWidth*gy);
      const name=gx>=0&&gx<this.sample.gridWidth&&gy>=0&&gy<this.sample.gridHeight&&category!==undefined?this.sample.categories[category]:null;
      $('tissueHover').textContent=name?(this.regions[name]?.label||'Unassigned cells'):'Click an annotated tissue area to list detected susceptibility genes';
      this.canvas.style.cursor=name&&this.sample.selectable[category]?'pointer':'default';
    };
    window.addEventListener('resize',()=>{if(this.active&&!this.vr)this.draw();});
  }
  selectAt(x,y){
    const gx=Math.floor((x-this.offsetX)/this.scale),gy=Math.floor((y-this.offsetY)/this.scale),category=this.lookup.get(gx+this.sample.gridWidth*gy);
    if(gx>=0&&gx<this.sample.gridWidth&&gy>=0&&gy<this.sample.gridHeight&&category!==undefined&&this.sample.selectable[category]){this.keepSampleOnce=true;this.onRegion(this.sample.categories[category]);}
  }
  canvasPoint(e){
    const r=this.canvas.getBoundingClientRect(),k=Math.min(r.width/this.canvas.width,r.height/this.canvas.height);
    return [(e.clientX-r.left-(r.width-this.canvas.width*k)/2)/k,(e.clientY-r.top-(r.height-this.canvas.height*k)/2)/k];
  }
  setHighlights(sources,broad=false){
    this.sources=sources;this.broad=broad;
    const target=sources[0],preferred=this.data.bestSectionByRegion[target]?.section;
    if(preferred&&!this.keepSampleOnce)this.sample=this.data.samples.find(s=>s.section===preferred);
    this.keepSampleOnce=false;
    this.draw();
  }
  show(value){this.active=value;$('tissueView').hidden=!value;if(value)this.draw();}
  draw(){
    const s=this.sample,c=this.canvas,ctx=this.context,box=c.getBoundingClientRect();c.width=1000;c.height=!this.vr&&box.width&&box.height?Math.max(240,Math.round(1000*box.height/box.width)):760;
    this.scale=Math.min(960/s.gridWidth,(c.height-40)/s.gridHeight);this.offsetX=(c.width-s.gridWidth*this.scale)/2;this.offsetY=(c.height-s.gridHeight*this.scale)/2;
    ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#09151d';ctx.fillRect(0,0,c.width,c.height);
    this.lookup=new Map();
    const selected=[];
    for(let i=0;i<s.points.length;i+=3){
      const x=s.points[i],y=s.points[i+1],category=s.points[i+2],name=s.categories[category];
      this.lookup.set(x+s.gridWidth*y,category);
      const active=s.selectable[category]&&(this.broad||this.sources.includes(name));
      ctx.fillStyle=s.selectable[category]?'#3a5662':'#172a33';
      ctx.fillRect(this.offsetX+x*this.scale,this.offsetY+y*this.scale,this.scale+.2,this.scale+.2);
      if(active)selected.push([x,y]);
    }
    // Paint selected bins last so adjacent context does not cover thin zones.
    ctx.fillStyle='#a5f4d6';
    for(const [x,y] of selected){const size=Math.max(3,this.scale);ctx.fillRect(this.offsetX+(x+.5)*this.scale-size/2,this.offsetY+(y+.5)*this.scale-size/2,size,size);}
    $('sectionSelect').value=s.section;
    $('tissueDescription').textContent=`${s.donor} · ${s.ageGW} gestational weeks · ${s.cellCount.toLocaleString()} source cells`;
    const found=this.sources.filter(name=>s.regions[name]);
    $('tissueHover').textContent=found.length?found.map(name=>this.regions[name]?.label||name).join(' / '):this.sources.length?'Selected area is not sampled in this section. Choose another section.':'Click an annotated tissue area to list detected susceptibility genes';
    c.setAttribute('aria-label','Prenatal tissue annotation map, '+s.section+'. '+$('tissueHover').textContent);
    this.onDraw?.();
  }
}
