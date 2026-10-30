import { readFile, writeFile } from 'node:fs/promises';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Pass the source HTML and output HTML paths.');
let html = await readFile(input, 'utf8');
function replaceOnce(from, to) {
  if (!html.includes(from)) throw new Error('The source artwork changed; inspect it before importing.');
  html = html.replace(from, to);
}
replaceOnce('viewBox="50 180 986 980"', 'viewBox="150 305 790 790"');
replaceOnce("let paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;", 'let paused=true; let animationFrame=0; let lastTick=null, elapsed=0;');
replaceOnce('let lastTick=null, elapsed=0;\n      function watchfulTick', 'function watchfulTick');
replaceOnce("button.setAttribute('aria-label',`${paused?'Play':'Pause'} all animation`);", "button.setAttribute('aria-label',`${paused?'Play':'Pause'} all animation`);\n        if(paused){cancelAnimationFrame(animationFrame);animationFrame=0;lastTick=null;}else if(!animationFrame){animationFrame=requestAnimationFrame(watchfulTick);}");
replaceOnce('function watchfulTick(now) {', 'function watchfulTick(now) {\n        animationFrame=0; if(paused)return;');
replaceOnce('elapsed-lastHeatFrame>48', 'elapsed-lastHeatFrame>90');
replaceOnce('requestAnimationFrame(watchfulTick);\n      }\n      requestAnimationFrame(watchfulTick);', `animationFrame=requestAnimationFrame(watchfulTick);
      }
      window.addEventListener('message',event=>{
        if(event.source!==parent || event.data?.type!=='signal-lab:scene')return;
        paused=event.data.paused!==false;
        const eyes=['crown','dusk','heart','dawn','root'];
        const holders=document.querySelector('#eye-pupils')?.children||[];
        eyes.forEach((id,index)=>{
          const holder=holders[index];if(!holder)return;
          const sealed=event.data.eyes?.[id]===true;
          const hue=Number.isFinite(event.data.hue)?Math.max(0,Math.min(360,event.data.hue)):0;
          holder.style.filter=sealed?'hue-rotate('+(145-hue)+'deg) saturate(.7) drop-shadow(0 0 8px #70e6bf)':'';
          holder.style.opacity=event.data.focus===id||sealed?'1':'.55';
          holder.dataset.sealed=String(sealed);
        });
        sync();
      });
      document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;sync();}});`);
replaceOnce('</head>', `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important;width:100%;height:100%}
#eye-particle-loop{width:100%;height:100%;max-width:none!important;margin:0!important}
#eye-particle-loop .art{max-width:none!important;width:100%!important;height:100%!important;background:transparent!important}
#eye-particle-loop .controls{display:none!important}
</style></head>`);
await writeFile(output, html);
console.log('Imported the original Primordial Shade artwork with isolated styling and parent-controlled animation.');
