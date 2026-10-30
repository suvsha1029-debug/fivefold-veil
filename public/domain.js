const VERTEX = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT = `precision mediump float;
varying vec2 uv;
uniform float time, world, urgency, pulse, verdict;
uniform vec2 resolution;
uniform vec3 tintA, tintB;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float cloud(vec2 p){return noise(p)*.57+noise(p*2.1)*.28+noise(p*4.3)*.15;}
void main(){
  vec2 p=uv; float t=time*.07;
  float w=cloud(vec2(p.x*3.+t,p.y*1.4-t*.15));
  float line=.72+sin(p.x*5.+t)*.1+(w-.5)*.2;
  float band=exp(-abs(p.y-line)*8.)*.37;
  float rays=pow(noise(vec2(p.x*40.+t,p.y*.6)),2.)*.75+.2;
  float curtain=band*rays*smoothstep(.25,.6,p.y);
  float second=exp(-abs(p.y-(.83+sin(p.x*4.-t*.8)*.08))*15.)*.15;
  vec3 tint=mix(tintA,tintB,p.x);
  vec3 color=vec3(0.);
  if(world<.5){
    color=tint*(curtain+second);
    vec2 snow=p*vec2(55.,34.)+vec2(time*.2,time*.38);
    color+=vec3(.65,.85,.92)*step(.989,hash(floor(snow)))*exp(-length(fract(snow)-.5)*22.)*.48;
  }else if(world<1.5){
    float nebula=cloud(p*vec2(3.,2.)+vec2(t,-t*.6));
    color=tint*pow(nebula,3.)*.42;
    float fracture=pow(max(0.,sin(p.x*26.+noise(vec2(p.y*12.,t))*7.)),32.);
    color+=tintA*fracture*.045;
  }else if(world<2.5){
    float water=(.5+.5*sin(p.y*95.+sin(p.x*12.+time*.3)*2.-time*.9));
    float reflection=exp(-abs(p.x-.22)*11.);
    color=mix(tintA,tintB,water)*water*reflection*.22*(1.-smoothstep(.1,.54,p.y));
    color+=tintB*curtain*.08;
  }else if(world<3.5){
    vec2 embers=p*vec2(38.,23.)-vec2(sin(time*.18)*.3,time*.55);
    float spark=step(.978,hash(floor(embers)))*exp(-length(fract(embers)-.5)*19.);
    color=tintA*spark*.8+tintB*cloud(p*3.+vec2(t,-t))*.09;
    color+=tintA*pow(max(0.,.3-p.y),2.)*.6;
  }else if(world<4.5){
    float mist=cloud(vec2(p.x*5.+t,p.y*3.))*pow(max(0.,.8-p.y),2.);
    color=tint*mist*.18;
    vec2 dust=p*vec2(58.,32.)+vec2(time*.3,time*.1);
    color+=tint*step(.989,hash(floor(dust)))*exp(-length(fract(dust)-.5)*23.)*.4;
  }else{
    float swell=.5+.5*sin(p.y*80.+sin(p.x*9.+time*.16)*3.-time*.4);
    color=tint*swell*.07*(1.-smoothstep(.0,.46,p.y));
    color+=tintB*pow(cloud(p*3.+vec2(t*.4,0.)),4.)*.12;
  }
  vec2 grid=p*vec2(70.,45.); vec2 cell=floor(grid);vec2 local=fract(grid)-.5;
  float star=step(.982,hash(cell))*exp(-length(local)*25.);
  color+=vec3(.64,.8,.85)*star*(.5+.2*sin(time*.5+hash(cell)*6.));
  vec2 centered=(p-.5)*vec2(resolution.x/resolution.y,1.);
  float radius=length(centered);
  float ring=exp(-abs(radius-pulse*.5)*80.)*(1.-pulse)*step(.001,pulse);
  color+=mix(vec3(.85,.18,.23),vec3(.31,.95,.7),step(0.,verdict))*ring*.5;
  color+=vec3(.43,.07,.1)*urgency*.2*pow(max(0.,radius-.18),2.);
  float alpha=clamp(max(max(color.r,color.g),color.b),0.,.72);
  gl_FragColor=vec4(color,alpha);
}`;

/** Decorative scene only. Game state and timer remain in the game engine. */
export class DomainScene {
  constructor() {
    this.stage = document.getElementById('machine-stage');
    this.canvas = document.getElementById('domain-shader');
    this.emblem = document.getElementById('oracle-emblem');
    this.ring = document.getElementById('ring-progress');
    this.clock = document.getElementById('domain-clock');
    this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    this.enabled = !this.motionQuery.matches;
    this.visible = true;
    this.status = 'idle';
    this.theme = null;
    this.urgency = 0;
    this.pulseAt = -10000;
    this.verdict = 1;
    this.frame = 0;
    this.lastDraw = -100;
    this.lastTick = null;
    this.elapsed = 0;
    this.svgMessage = '';
    this.eyeStates = {};
    this.selectedEye = 'heart';
    this.phase = 'investigation';
    this.onVisibility = () => this.schedule();
    this.onPreference = event => { this.setEnabled(!event.matches); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.motionQuery.addEventListener('change', this.onPreference);
    this.emblem.addEventListener('load', () => { this.svgMessage = ''; this.syncEmblem(); });
    this.intersection = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; this.schedule(); }, { threshold: 0 });
    this.intersection.observe(this.stage);
    this.resize = new ResizeObserver(() => this.resizeCanvas());
    this.resize.observe(this.stage);
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(this.frame); this.frame = 0; this.gl = null; this.stage.dataset.renderer = 'still'; this.setRenderLabel(); });
    this.canvas.addEventListener('webglcontextrestored', () => { this.initialize(); this.schedule(); });
    this.initialize();
    this.setEnabled(this.enabled);
    this.setTheme('taiga');
  }

  initialize() {
    try {
      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
      if (!gl) throw new Error('WebGL unavailable');
      this.gl = gl;
      const makeShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        return shader;
      };
      const vs = makeShader(gl.VERTEX_SHADER, VERTEX), fs = makeShader(gl.FRAGMENT_SHADER, FRAGMENT);
      const program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); throw new Error('Shader unavailable'); }
      this.program = program;
      gl.useProgram(program);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = Object.fromEntries(['time','world','tintA','tintB','urgency','pulse','verdict','resolution'].map(name => [name, gl.getUniformLocation(program, name)]));
      this.stage.dataset.renderer = 'webgl';
      this.resizeCanvas();
    } catch {
      this.gl = null;
      this.stage.dataset.renderer = 'still';
    }
    this.setRenderLabel();
  }

  resizeCanvas() {
    const bounds = this.stage.getBoundingClientRect();
    // One small buffer, capped below 540k pixels, including on high-DPI displays.
    const scale = Math.min(1, 900 / Math.max(bounds.width, 1), 600 / Math.max(bounds.height, 1));
    this.canvas.width = Math.max(1, Math.round(bounds.width * scale));
    this.canvas.height = Math.max(1, Math.round(bounds.height * scale));
    if (this.gl) { this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); this.draw(); }
  }

  setRenderLabel() {
    document.getElementById('render-label').textContent = this.enabled ? 'AMBIENT EFFECTS' : 'STILL SCENE';
    document.getElementById('effects-button').textContent = this.enabled ? 'Effects: on' : 'Effects: still';
    document.getElementById('effects-button').setAttribute('aria-pressed', String(this.enabled));
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.stage.dataset.motion = this.enabled ? 'on' : 'off';
    this.setRenderLabel();
    this.schedule();
    if (!enabled) this.draw();
  }

  setTheme(theme) {
    const id=domainId(theme),domain=getDomain(id);
    if(this.theme===id)return;
    this.theme=id;
    this.stage.dataset.domain = this.theme;
    this.stage.style.setProperty('--domain-image',`url("${domain.asset}")`);
    this.stage.style.setProperty('--domain-accent',domain.accent);
    this.stage.style.setProperty('--guardian-hue',`${domain.hue}deg`);
    document.body.dataset.world=id;
    for(const [key,value]of Object.entries({base:domain.base,panel:domain.panel,raised:domain.raised,paper:domain.paper,ink:domain.ink,accent:domain.accent,art:`url("${domain.asset}")`}))document.body.style.setProperty(`--world-${key}`,value);
    document.getElementById('domain-coordinate').textContent = `DOMAIN 0${domain.mode+1} / ${domain.name.toUpperCase()}`;
    for (const button of document.querySelectorAll('[data-domain].domain-tab')) {
      const selected = domainId(button.dataset.domain) === this.theme;
      button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
    }
    this.updateNarrative();
    this.syncEmblem();this.draw();
  }

  setState(status) {
    this.status = status;
    this.stage.dataset.caseStatus = status;
    this.updateNarrative();
    this.schedule();
  }

  setProgress(eyes, selectedEye, phase) {
    this.eyeStates = Object.fromEntries(eyes.map(eye => [eye.id, eye.sealed]));
    this.selectedEye = selectedEye;
    this.phase = phase;
    this.stage.dataset.sealedCount = String(eyes.filter(eye => eye.sealed).length);
    document.getElementById('oracle-topline').textContent = phase === 'binding' ? 'THE FIVEFOLD BINDING' : `${selectedEye.toUpperCase()} / THE WATCHFUL GUARDIAN`;
    this.syncEmblem();
    this.updateNarrative();
  }

  updateNarrative() {
    const text = this.status === 'won' ? 'Five discoveries. One shared signal. The veil opens.' : this.status === 'lost' ? 'The signal fades. Another mystery is waiting.' : this.status === 'paused' ? 'Time is held. The guardian waits.' : this.phase === 'binding' ? 'One signal must satisfy all five discoveries.' : this.status === 'running' ? `The ${this.selectedEye} eye answers. Compare its evidence.` : getDomain(this.theme).narrative;
    document.getElementById('domain-narrative').textContent = text;
    document.getElementById('domain-state-label').textContent = this.status === 'won' ? 'DOMAIN DECODED' : this.status === 'lost' ? 'CASE CLOSED' : this.status === 'paused' ? 'TIME SUSPENDED' : this.status === 'running' ? 'CHAT IS INVESTIGATING' : 'AWAITING YOUR FIRST SIGNAL';
    document.getElementById('domain-clock-label').textContent = this.status === 'paused' ? 'PAUSED' : ['won','lost'].includes(this.status) ? 'CASE CLOSED' : 'TIME REMAINING';
  }

  updateClock(remainingMs, durationMs, text) {
    this.clock.textContent = text;
    const ratio = Math.max(0, Math.min(1, remainingMs / durationMs));
    this.ring.style.strokeDashoffset = String((1 - ratio) * 100);
    this.urgency = this.status === 'running' ? Math.max(0, 1 - remainingMs / 30000) : 0;
    this.stage.dataset.urgent = String(remainingMs <= 30000 && this.status !== 'idle');
  }

  pulse(accepted) {
    this.pulseAt = this.elapsed;
    this.verdict = accepted ? 1 : -1;
  }

  syncEmblem() {
    // Only public visual flags cross into the sandbox; never rules, tokens, or chat.
    const paused = !this.enabled || document.hidden || !this.visible || ['paused','won','lost'].includes(this.status);
    const message = JSON.stringify({ type: 'signal-lab:scene', paused, eyes: this.eyeStates, focus: this.selectedEye, hue:getDomain(this.theme).hue });
    if (message !== this.svgMessage) {
      this.svgMessage = message;
      this.emblem.contentWindow?.postMessage(JSON.parse(message), '*');
    }
  }

  schedule() {
    this.syncEmblem();
    const active = this.enabled && this.visible && !document.hidden && !['paused','won','lost'].includes(this.status);
    this.stage.dataset.visualActive = String(active);
    if (!active || !this.gl) {
      cancelAnimationFrame(this.frame); this.frame = 0; this.lastTick = null;
      return;
    }
    if (!this.frame) this.frame = requestAnimationFrame(now => this.tick(now));
  }

  tick(now) {
    this.frame = 0;
    if (this.lastTick !== null) this.elapsed += Math.min(100, now - this.lastTick);
    this.lastTick = now;
    if (now - this.lastDraw >= 33) { this.lastDraw = now; this.draw(); }
    this.schedule();
  }

  draw() {
    const gl = this.gl;
    if (!gl || !this.uniforms) return;
    gl.useProgram(this.program);
    const u = this.uniforms;
    gl.uniform1f(u.time, this.elapsed / 1000);
    const domain=getDomain(this.theme);
    gl.uniform1f(u.world, domain.mode);
    gl.uniform3fv(u.tintA,domain.tintA);gl.uniform3fv(u.tintB,domain.tintB);
    gl.uniform1f(u.urgency, this.urgency);
    gl.uniform1f(u.pulse, Math.max(0, Math.min(1, (this.elapsed - this.pulseAt) / 1400)));
    gl.uniform1f(u.verdict, this.verdict);
    gl.uniform2f(u.resolution, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.enabled = false; this.syncEmblem();
    this.resize.disconnect(); this.intersection.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.motionQuery.removeEventListener('change', this.onPreference);
    if (this.gl) { this.gl.deleteBuffer(this.buffer); this.gl.deleteProgram(this.program); }
  }
}
import { getDomain, domainId } from './domains.js';
