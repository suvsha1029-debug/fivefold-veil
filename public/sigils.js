// Small, decorative DOM layer: no canvas, timers, random spawning or game state.
const layer=document.createElement('div');
layer.className='sigil-atmosphere';layer.setAttribute('aria-hidden','true');
for(const name of ['north','south']){
  const mark=document.createElement('span');mark.className=`ambient-sigil ambient-sigil-${name}`;layer.append(mark);
}
for(let i=0;i<18;i++){
  const mote=document.createElement('i');mote.className='sigil-mote';
  mote.style.setProperty('--x',`${(i*37+7)%100}%`);
  mote.style.setProperty('--y',`${(i*23+19)%90+5}%`);
  mote.style.setProperty('--drift',`${(i%5-2)*14}px`);
  mote.style.setProperty('--life',`${7+i%6}s`);
  mote.style.setProperty('--delay',`${-i*1.7}s`);
  mote.style.setProperty('--size',`${i%4===0?3:1.5}px`);
  layer.append(mote);
}
document.body.prepend(layer);
const chamber=document.querySelector('.chamber-map');
if(chamber){
  const dust=document.createElement('div');dust.className='sigil-map-dust';dust.setAttribute('aria-hidden','true');
  for(const mote of [...layer.querySelectorAll('.sigil-mote')].slice(0,8))dust.append(mote.cloneNode());
  chamber.append(dust);
}
const syncVisibility=()=>document.body.classList.toggle('sigils-sleeping',document.hidden);
document.addEventListener('visibilitychange',syncVisibility);syncVisibility();
