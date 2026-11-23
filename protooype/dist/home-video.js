const demo=document.getElementById('homeDemoVideo');
const playButton=document.getElementById('playDemoButton');
const playbackStatus=document.getElementById('demoPlaybackStatus');
function syncPlayback(){
  const playing=!demo.paused&&!demo.ended;
  playButton.textContent=playing?'Ⅱ Pause demo':'▶ Play demo with audio';
  playButton.setAttribute('aria-pressed',String(playing));
}
playButton.addEventListener('click',async()=>{
  playbackStatus.textContent='';
  if(!demo.paused){demo.pause();return;}
  try{await demo.play();}catch{playbackStatus.textContent='Use the video’s play control to start playback.';}
});
for(const event of ['play','pause','ended'])demo.addEventListener(event,syncPlayback);
demo.addEventListener('error',()=>{playbackStatus.textContent='The video could not load. You can download it using the video link.';});
