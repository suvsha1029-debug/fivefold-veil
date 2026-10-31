import * as T from './vendor/three.module.js';
import {makeFir} from './tree.js';
import {addAlpineGarden} from './shrubs.js';
import {skyVertex,skyFragment,windGLSL} from './shaders.js';
const $=id=>document.getElementById(id),canvas=$('scene');
let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});}catch(e){$('error').hidden=false;parent.postMessage({type:'veil-sanctuary-error'},location.origin);throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?.75:1));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new T.Scene();scene.background=new T.Color('#081322');scene.fog=new T.FogExp2('#162c45',.013);
const camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.15,300);
const uniforms={time:{value:0},wind:{value:.25},aurora:{value:2.4},palette:{value:0},snowCover:{value:1}};
const snowObjects=[];let snowEnabled=true;
try{snowEnabled=localStorage.getItem('lunar-domain-snow')!=='off';}catch{}
const moonDir=new T.Vector3(.34,.31,-.89).normalize();
const sky=new T.Mesh(new T.SphereGeometry(220,40,24),new T.ShaderMaterial({vertexShader:skyVertex,fragmentShader:skyFragment,uniforms:{uTime:uniforms.time,uAurora:uniforms.aurora,uPalette:uniforms.palette,uMoon:{value:moonDir}},side:T.BackSide,depthWrite:false,fog:false}));sky.renderOrder=-10;scene.add(sky);
const hemi=new T.HemisphereLight('#9ebbdc','#354964',1.85);scene.add(hemi);
const moon=new T.DirectionalLight('#bfd6ff',3.1);moon.position.copy(moonDir).multiplyScalar(35);moon.target.position.set(0,0,-5);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.1,far:90});moon.shadow.normalBias=.04;moon.shadow.bias=-.0002;moon.shadow.radius=3;scene.add(moon,moon.target);
const auroraLight=new T.DirectionalLight('#6ae6c0',.7);auroraLight.position.set(-12,15,-20);scene.add(auroraLight);
const front=new T.DirectionalLight('#7797be',.85);front.position.set(5,8,16);scene.add(front);
let seed=2904;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pathX=z=>Math.sin((z+3)*.145)*2.25;
function groundY(x,z){let rolling=.14*Math.sin(x*.23)*Math.cos(z*.18)+.10*Math.sin(z*.42+x*.13);let path=Math.exp(-Math.pow((x-pathX(z))/1.22,4))*.19;let base=.25+rolling-path;let pondRadius=Math.pow((x-5.8)/3.25,2)+Math.pow((z-2.8)/2.4,2);let carve=1-T.MathUtils.smoothstep(pondRadius,.8,1.35);return T.MathUtils.lerp(base,-.13,carve);}
const snowMat=new T.MeshStandardMaterial({color:'#c4d7e8',roughness:.86,metalness:0});
function snowShader(shader,ground=false){shader.uniforms.uTime=uniforms.time;shader.uniforms.uSnowCover=uniforms.snowCover;shader.vertexShader='varying vec3 vSnowPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSnowPosition=position;');shader.fragmentShader='uniform float uSnowCover;varying vec3 vSnowPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=fract(sin(dot(floor(vSnowPosition.xz*125.),vec2(127.1,311.7)))*43758.5453);diffuseColor.rgb*=.94+grain*.06;`);
shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float glint=pow(fract(sin(dot(floor(vSnowPosition.xz*185.),vec2(12.9898,78.233)))*43758.5453),125.);outgoingLight+=vec3(.06,.09,.13)*uSnowCover*glint*pow(max(dot(normal,normalize(vViewPosition)),0.),4.);\n#include <opaque_fragment>`);
if(ground){shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float pathX=sin((vSnowPosition.z+3.)*.145)*2.25;float trail=exp(-pow(abs(vSnowPosition.x-pathX)/1.12,4.));diffuseColor.rgb*=1.-trail*.12;
float moss=.5+.5*sin(vSnowPosition.x*1.6+sin(vSnowPosition.z*1.2))*sin(vSnowPosition.z*1.9);
float earthNoise=fract(sin(dot(floor(vSnowPosition.xz*42.),vec2(12.98,78.23)))*43758.5453);
vec3 tundra=mix(vec3(.045,.072,.055),vec3(.11,.14,.075),moss)*(.82+earthNoise*.23);
tundra=mix(tundra,vec3(.13,.115,.10),trail*.6);
diffuseColor.rgb=mix(tundra,diffuseColor.rgb,uSnowCover);`);}}
snowMat.onBeforeCompile=s=>snowShader(s);
const groundMat=snowMat.clone();groundMat.onBeforeCompile=s=>snowShader(s,true);
const groundGeo=new T.PlaneGeometry(180,180,200,200);groundGeo.rotateX(-Math.PI/2);let gp=groundGeo.attributes.position;for(let i=0;i<gp.count;i++)gp.setY(i,groundY(gp.getX(i),gp.getZ(i)));groundGeo.computeVertexNormals();const ground=new T.Mesh(groundGeo,groundMat);ground.receiveShadow=true;scene.add(ground);
// Wide, shallow snowdrifts over buried garden rocks.
const driftGeo=new T.IcosahedronGeometry(1,2),drifts=new T.InstancedMesh(driftGeo,snowMat,68),dummy=new T.Object3D();for(let i=0;i<68;i++){let x=(random()-.5)*47,z=(random()-.5)*60-10;if(Math.abs(x-pathX(z))<2)x+=x>0?3:-3;if(Math.pow((x-5.8)/4,2)+Math.pow((z-2.8)/3,2)<1)x+=7;dummy.position.set(x,groundY(x,z)-.03,z);dummy.scale.set(.4+random()*1.7,.16+random()*.32,.5+random()*1.3);dummy.rotation.set(0,random()*6.28,0);dummy.updateMatrix();drifts.setMatrixAt(i,dummy.matrix);}drifts.receiveShadow=true;drifts.castShadow=true;scene.add(drifts);
function addWind(shader,leaves=false){Object.assign(shader.uniforms,{uTime:uniforms.time,uWind:uniforms.wind,uSnowCover:uniforms.snowCover});shader.vertexShader=windGLSL+'\nvarying vec3 vTreePosition;varying vec3 vTreeNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTreePosition=position;vTreeNormal=normal;transformed=windPosition(transformed);');if(leaves){shader.fragmentShader='uniform float uSnowCover;varying vec3 vTreePosition;varying vec3 vTreeNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float outer=clamp(length(vTreePosition.xz)/(2.2*pow(max(.035,1.-vTreePosition.y/8.),.86)),0.,1.);diffuseColor.rgb*=mix(.5,1.,smoothstep(.03,.9,outer));float frost=fract(sin(dot(floor(vTreePosition*21.),vec3(12.98,78.23,42.3)))*43758.5453);float coating=smoothstep(.48,.87,frost)*.65*uSnowCover;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.43,.58,.69),coating);`);}}
const leafMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.79,side:T.DoubleSide});leafMat.onBeforeCompile=s=>addWind(s,true);
const barkMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1});barkMat.onBeforeCompile=s=>addWind(s);
const depthMat=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});depthMat.onBeforeCompile=s=>addWind(s);
const capGeo=new T.SphereGeometry(1,9,5);const capPos=capGeo.attributes.position;for(let i=0;i<capPos.count;i++){let x=capPos.getX(i),y=capPos.getY(i),z=capPos.getZ(i),w=1+.08*Math.sin(x*8+z*3)*Math.sin(y*6);capPos.setXYZ(i,x*w,y,z*w);}capGeo.computeVertexNormals();
const trees=[];const detailed=makeFir(951,.68),distant=makeFir(752,.13);
function plant(x,z,size,rot,high=false){let data=high?detailed:distant,group=new T.Group();group.position.set(x,groundY(x,z)-.02,z);group.scale.setScalar(size);group.rotation.y=rot;
let leaves=new T.Mesh(data.foliage,leafMat),wood=new T.Mesh(data.wood,barkMat);for(let m of [leaves,wood]){m.castShadow=high;m.receiveShadow=true;m.customDepthMaterial=depthMat;group.add(m);}
const caps=new T.InstancedMesh(capGeo,snowMat,data.snowCaps.length);data.snowCaps.forEach((c,i)=>{dummy.position.fromArray(c.p);dummy.scale.set(c.length,c.height,c.width);dummy.rotation.set(0,-c.angle,0);dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);});caps.castShadow=high;caps.receiveShadow=true;group.add(caps);snowObjects.push(caps);scene.add(group);trees.push(group);}
plant(-5,-2,1.27,.3,true);plant(5.9,-8,1.12,1.8,true);
[[-9,-12,1.6],[10,-17,1.65],[-12,2,1.3],[13,2,1.45],[-5,-19,1.35],[1,-24,1.7],[-15,-25,1.6],[18,-29,1.8],[-23,-34,2],[27,-42,2.2],[-19,12,1.5],[22,10,1.6]].forEach(([x,z,s])=>plant(x,z,s,random()*6));
// Distant snow-covered evergreen silhouettes, softened by atmospheric fog.
const backgroundMat=new T.MeshStandardMaterial({color:'#506b80',roughness:1});for(let i=0;i<43;i++){let x=(random()-.5)*150,z=-45-random()*45,h=8+random()*10;const forest=new T.Group();for(let j=0;j<5;j++){let mesh=new T.Mesh(new T.ConeGeometry(h*.22*(1-j/6),h*.39,7),backgroundMat);mesh.position.set(x,h*(.20+j*.135),z);forest.add(mesh);}scene.add(forest);}
// A frozen garden pond. The surrounding snowbank hides its thin edge.
const pondCenter=new T.Vector3(5.8,.37,2.8);const pondGroup=new T.Group();pondGroup.position.copy(pondCenter);pondGroup.rotation.y=-.15;
const iceGeo=new T.CircleGeometry(1,100);iceGeo.rotateX(-Math.PI/2);const iceMat=new T.MeshStandardMaterial({color:'#33577a',metalness:.5,roughness:.2,transparent:false});iceMat.onBeforeCompile=s=>{s.uniforms.uTime=uniforms.time;s.uniforms.uSnowCover=uniforms.snowCover;s.vertexShader='varying vec3 vIce;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIce=position;');s.fragmentShader='uniform float uSnowCover;varying vec3 vIce;uniform float uTime;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float fissure=pow(1.-abs(sin(vIce.x*39.+sin(vIce.z*18.)*1.8)),38.)*uSnowCover;float deep=sin(vIce.x*4.+vIce.z*6.)*.5+.5;diffuseColor.rgb=mix(vec3(.035,.095,.17),vec3(.13,.25,.34),deep*.45+fissure*.18);`);s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`float glimmer=exp(-pow((vIce.x-.15)*7.,2.))*exp(-pow((vIce.z+.3)*1.7,2.));float ripple=.6+.4*sin(vIce.z*160.+sin(vIce.x*60.)+(1.-uSnowCover)*uTime*.6);outgoingLight+=vec3(.18,.28,.4)*glimmer*ripple;\n#include <opaque_fragment>`);};let pond=new T.Mesh(iceGeo,iceMat);pond.scale.set(3.2,1,2.3);pond.receiveShadow=true;pondGroup.add(pond);
const banks=new T.InstancedMesh(driftGeo,snowMat,40);for(let i=0;i<40;i++){let a=i/40*Math.PI*2;dummy.position.set(Math.cos(a)*3.22,.02,Math.sin(a)*2.33);dummy.scale.set(.43,.19+random()*.08,.38);dummy.rotation.set(0,a,0);dummy.updateMatrix();banks.setMatrixAt(i,dummy.matrix);}banks.receiveShadow=true;pondGroup.add(banks);scene.add(pondGroup);
// Warm pools of light on a winding, slightly sunken snow path.
const darkMetal=new T.MeshStandardMaterial({color:'#14222b',roughness:.7,metalness:.7});const stone=new T.MeshStandardMaterial({color:'#758291',roughness:.95});
function mesh(geo,mat,x,y,z,parent=scene){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;let ctx=glowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,222,167,0.8)');grad.addColorStop(.14,'rgba(255,178,93,0.3)');grad.addColorStop(1,'rgba(255,151,58,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const glowTex=new T.CanvasTexture(glowCanvas);
const lanternBulb=new T.MeshBasicMaterial({color:'#ffdfad'});const haloMat=new T.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.8});
for(let i=0;i<10;i++){let z=13-i*3.7,x=pathX(z)+(i%2===0?-1:1)*1.6,y=groundY(x,z);const lantern=new T.Group();lantern.position.set(x,y,z);scene.add(lantern);mesh(new T.CylinderGeometry(.14,.19,.16,8),stone,0,.04,0,lantern);mesh(new T.CylinderGeometry(.035,.05,.75,6),darkMetal,0,.42,0,lantern);mesh(new T.BoxGeometry(.24,.33,.24),lanternBulb,0,.93,0,lantern);for(let sx of [-1,1])for(let sz of [-1,1])mesh(new T.BoxGeometry(.025,.38,.025),darkMetal,sx*.13,.93,sz*.13,lantern);let roof=mesh(new T.ConeGeometry(.25,.16,4),darkMetal,0,1.17,0,lantern);roof.rotation.y=Math.PI/4;let cap=mesh(new T.SphereGeometry(.22,8,5),snowMat,0,1.25,0,lantern);cap.scale.set(1,.3,1);snowObjects.push(cap);let halo=new T.Sprite(haloMat);halo.position.y=.95;halo.scale.set(1.5,1.5,1);lantern.add(halo);if(i<6){let lamp=new T.PointLight('#ffc887',3.2,4,2);lamp.position.set(0,1.03,0);lantern.add(lamp);}}
// A snow-covered bench beside the pond.
const bench=new T.Group();bench.position.set(9.5,groundY(9.5,6),6);bench.rotation.y=-.5;scene.add(bench);for(let x of [-.9,.9]){mesh(new T.BoxGeometry(.17,.65,.6),darkMetal,x,.34,0,bench);mesh(new T.BoxGeometry(.1,.9,.12),darkMetal,x,.87,-.26,bench);}const timber=new T.MeshStandardMaterial({color:'#493d37',roughness:.88});for(let z of [-.22,0,.22])mesh(new T.BoxGeometry(2.4,.1,.18),timber,0,.7,z,bench);for(let y of [.96,1.18])mesh(new T.BoxGeometry(2.4,.18,.1),timber,0,y,-.29,bench);let seatSnow=mesh(new T.SphereGeometry(1,16,8),snowMat,0,.80,0,bench);seatSnow.scale.set(1.24,.13,.4);let topSnow=mesh(new T.SphereGeometry(1,12,6),snowMat,0,1.30,-.29,bench);topSnow.scale.set(1.22,.07,.12);snowObjects.push(seatSnow,topSnow);
const alpine=addAlpineGarden(scene,groundY,uniforms,snowMat,snowObjects);
const exposedRockMat=new T.MeshStandardMaterial({color:'#53615c',roughness:.96});
// Snow is shaded as soft round particles rather than square sprites.
const snowCount=800,snowPositions=new Float32Array(snowCount*3),snowBase=[],sizes=new Float32Array(snowCount);for(let i=0;i<snowCount;i++){let p=[(random()-.5)*62,random()*25,(random()-.5)*62-6, .35+random()*.55];snowBase.push(p);snowPositions.set(p.slice(0,3),i*3);sizes[i]=.035+random()*.06;}
const snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.BufferAttribute(snowPositions,3));snowGeo.setAttribute('aSize',new T.BufferAttribute(sizes,1));const snowfallUniform={value:.55};
const snowfallMat=new T.ShaderMaterial({uniforms:{uOpacity:snowfallUniform,uPixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`attribute float aSize;uniform float uPixelRatio;varying float vDepth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_PointSize=clamp(aSize*420.*uPixelRatio/max(1.,-mv.z),1.,7.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float uOpacity;varying float vDepth;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float alpha=pow(1.-d*d,2.)*.64*smoothstep(.4,2.,vDepth)*(1.-smoothstep(25.,60.,vDepth));gl_FragColor=vec4(.8,.9,1.,alpha*uOpacity);}`,transparent:true,depthWrite:false});const snowfall=new T.Points(snowGeo,snowfallMat);snowfall.frustumCulled=false;scene.add(snowfall);
let paused=true,auto=false,time=0,lastTime=performance.now(),fpsTime=0,frames=0;
let yaw=.13,pitch=.01,distance=27,target=new T.Vector3(0,4.6,-5),desiredTarget=target.clone();let pointers=new Map(),pointer=null,pinch=0;
function updateCamera(dt){target.lerp(desiredTarget,Math.min(1,dt*3));camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);sky.position.copy(camera.position);}
function setAuto(v){auto=v;$('auto').setAttribute('aria-pressed',String(v));$('auto').querySelector('span').textContent=v?'ON':'OFF';}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pointer={x:e.clientX,y:e.clientY};setAuto(false);if(pointers.size===2){let a=[...pointers.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){let a=[...pointers.values()],d=Math.max(1,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y));distance=T.MathUtils.clamp(distance*pinch/d,8,47);pinch=d;}else if(pointer){yaw-=(e.clientX-pointer.x)*.0035;pitch=T.MathUtils.clamp(pitch+(e.clientY-pointer.y)*.003,-.12,.65);}pointer={x:e.clientX,y:e.clientY};});
function endPointer(e){pointers.delete(e.pointerId);pointer=pointers.size?[...pointers.values()][0]:null;}canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance*Math.exp(e.deltaY*.0008),8,47);setAuto(false);},{passive:false});
function setView(name){if(name==='garden'){desiredTarget.set(0,4.6,-5);yaw=innerWidth<800?-.12:.13;pitch=.01;distance=innerWidth<800?34:27;}if(name==='pond'){desiredTarget.set(4.5,2.2,0);yaw=.28;pitch=.19;distance=17;}if(name==='sky'){desiredTarget.set(0,10,-13);yaw=-.08;pitch=-.10;distance=22;}setAuto(false);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('aurora').oninput=e=>{uniforms.aurora.value=+e.target.value*.03;$('auroraValue').value=e.target.value+'%';auroraLight.intensity=+e.target.value*.009;};$('snow').oninput=e=>{let amount=+e.target.value/100;snowfallUniform.value=amount===0?0:.35+amount*.45;snowGeo.setDrawRange(0,Math.floor(snowCount*amount));$('snowValue').value=!snowEnabled?'Snow disabled':amount===0?'Clear':amount<.3?'A few flakes':amount<.7?'Soft flurries':'Heavy snowfall';};$('wind').oninput=e=>{uniforms.wind.value=+e.target.value/100;$('windValue').value=+e.target.value===0?'Still':+e.target.value<45?'Gentle':+e.target.value<75?'Breezy':'Blustery';};
function preset(name){document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));uniforms.palette.value=name==='violet'?1:0;$('aurora').value=name==='quiet'?12:name==='violet'?95:80;$('aurora').oninput({target:$('aurora')});$('snow').value=name==='quiet'?20:55;$('snow').oninput({target:$('snow')});auroraLight.color.set(name==='violet'?'#b79aef':'#6ae6c0');}document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.preset));
function pause(){paused=!paused;$('pause').innerHTML=paused?'<span>▷</span> Resume scene':'<span>Ⅱ</span> Pause scene';$('pause').setAttribute('aria-pressed',String(paused));}$('pause').onclick=pause;$('auto').onclick=()=>setAuto(!auto);$('reset').onclick=()=>setView('garden');
let hideTimer,iconTimer;
function armHide(){clearTimeout(hideTimer);if(!document.body.classList.contains('clean'))hideTimer=setTimeout(()=>clean(true),15000);}
function clean(v){document.body.classList.toggle('clean',v);$('show').hidden=!v;clearTimeout(hideTimer);if(v){$('show').classList.remove('idle');clearTimeout(iconTimer);iconTimer=setTimeout(()=>$('show').classList.add('idle'),2600);}else armHide();}
document.addEventListener('pointermove',()=>{if(document.body.classList.contains('clean')){$('show').classList.remove('idle');clearTimeout(iconTimer);iconTimer=setTimeout(()=>$('show').classList.add('idle'),1800);}else armHide();},{passive:true});
document.addEventListener('pointerdown',()=>{if(document.body.classList.contains('clean')){$('show').classList.remove('idle');clearTimeout(iconTimer);iconTimer=setTimeout(()=>$('show').classList.add('idle'),2600);}},{passive:true});
document.addEventListener('focusin',()=>{clearTimeout(hideTimer);});
function applySnow(enabled){snowEnabled=enabled;uniforms.snowCover.value=enabled?1:0;snowObjects.forEach(o=>o.visible=enabled);snowfall.visible=enabled;drifts.material=enabled?snowMat:exposedRockMat;banks.material=enabled?snowMat:stone;backgroundMat.color.set(enabled?'#506b80':'#203e39');$('snowToggle').setAttribute('aria-checked',String(enabled));$('snowToggle').querySelector('span').textContent=enabled?'ON':'OFF';$('snow').disabled=!enabled;$('snow').oninput({target:$('snow')});try{localStorage.setItem('lunar-domain-snow',enabled?'on':'off');}catch{}}
$('snowToggle').onclick=()=>{applySnow(!snowEnabled);armHide();};
$('hide').onclick=()=>clean(true);$('show').onclick=()=>clean(false);
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();requestDraw();});
renderer.debug.onShaderError=(gl,p,vs,fs)=>{console.error('Shader error',gl.getShaderInfoLog(vs),gl.getShaderInfoLog(fs));$('error').hidden=false;parent.postMessage({type:'veil-sanctuary-error'},location.origin);};
preset('boreal');setView('garden');applySnow(snowEnabled);clean(true);

// The lounge loads this scene on request. No animation survives a closed or hidden lounge.
let active = true;
let frame = 0;
let lastDraw = -Infinity;
const frameInterval = 1000 / 24;
function canDraw() { return active && !document.hidden; }
function requestDraw() {
  if (!canDraw() || frame) return;
  frame = requestAnimationFrame(renderFrame);
}
function stopDrawing() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}
function renderFrame(now) {
  frame = 0;
  if (!canDraw()) return;
  if (!paused && now - lastDraw < frameInterval) {
    requestDraw();
    return;
  }
  const dt = paused ? 0 : Math.min((now-lastTime)/1000,.06);
  lastTime = now;
  lastDraw = now;
  if (!paused) {
    time += dt;
    uniforms.time.value = time;
    if (auto) yaw += dt*.012;
    for (let i=0;i<snowCount;i++) {
      const p=snowBase[i];
      snowPositions[i*3]=p[0]+Math.sin(time*.3+i*1.7)*.25+Math.sin(time*.09)*uniforms.wind.value*4;
      snowPositions[i*3+1]=((p[1]-time*p[3])%25+25)%25;
      snowPositions[i*3+2]=p[2]+Math.cos(time*.24+i)*.35;
    }
    snowGeo.attributes.position.needsUpdate=true;
  }
  // Resolve a parent-selected viewpoint in a single still frame.
  if (paused) target.copy(desiredTarget);
  updateCamera(dt);
  renderer.render(scene,camera);
  if (!paused) requestDraw();
}
canvas.addEventListener('pointermove',()=>{if(pointers.size)requestDraw();});
canvas.addEventListener('wheel',requestDraw,{passive:true});
document.addEventListener('visibilitychange',()=>{
  stopDrawing();
  lastTime=performance.now();
  requestDraw();
});
window.addEventListener('message',event=>{
  if(event.source!==parent || event.origin!==location.origin) return;
  const config=event.data;
  if(!config || config.type!=='veil-sanctuary') return;
  active=config.active===true;
  paused=config.motion!==true;
  if(config.domain==='taiga' || config.domain==='lunar') {
    preset(config.domain==='taiga'?'boreal':'quiet');
    applySnow(config.domain==='taiga');
  }
  if(['garden','pond','sky'].includes(config.view)) setView(config.view);
  stopDrawing();
  lastTime=performance.now();
  requestDraw();
});
window.addEventListener('pagehide',stopDrawing);
requestDraw();
parent.postMessage({type:'veil-sanctuary-ready'},location.origin);
