const $=id=>document.getElementById(id);
let mouseModule;
const mouse=()=>mouseModule??=import('./mouse-atlas.js?v=full-cells-2');
function openAtlas(value){
  const atlas=['human','mouse'].includes(value)?value:'home';
  document.body.dataset.atlas=atlas;
  $('atlasSelect').value=atlas;
  $('mouseAtlas').hidden=atlas!=='mouse';
  $('atlasChooser').hidden=atlas!=='home';
  document.title=atlas==='human'?'GEAR-XR — Human Autism Gene Expression':atlas==='mouse'?'GEAR-XR — Allen CCF Mouse Brain':'GEAR-XR — Choose your atlas';
  if(atlas==='mouse')mouse().then(module=>{if(document.body.dataset.atlas==='mouse')module.showMouse();});
  else if(mouseModule)mouseModule.then(module=>module.hideMouse());
  if(atlas==='human')window.dispatchEvent(new Event('resize'));
  const target=atlas==='home'?$('atlasChooserTitle'):atlas==='mouse'?$('mouseAtlasTitle'):$('search');
  target.focus({preventScroll:true});
}
function navigate(atlas){const hash=atlas==='home'?'#atlases':'#'+atlas;if(location.hash===hash)openAtlas(atlas);else location.hash=hash;}
$('atlasSelect').onchange=event=>navigate(event.target.value);
$('atlasHome').onclick=()=>navigate('home');
document.querySelectorAll('[data-open-atlas]').forEach(button=>button.onclick=()=>navigate(button.dataset.openAtlas));
window.addEventListener('hashchange',()=>openAtlas(location.hash.slice(1)));
openAtlas(location.hash.slice(1));
