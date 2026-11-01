import { guideRole, guideSteps, guideDialogSteps } from './guide-steps.js';

const PREFS='fivefold-guide-preferences-v1',PROGRESS='fivefold-guide-progress-v1';
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const make=(tag,cls='')=>{const element=document.createElement(tag);element.className=cls;return element;};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Optional, non-modal help. Navigation never executes the highlighted action. */
export class GuidedHelp {
  constructor({getState,scene}) {
    Object.assign(this,{getState,scene});this.active=false;this.index=0;this.role='';this.frame=0;
    this.preferences=read(PREFS);this.saved=read(PROGRESS);this.opened=new Set();this.positions=new Map();
    const nav=document.querySelector('.crew-header nav');
    this.button=make('button','outline-button');this.button.id='guided-mode-button';this.button.type='button';
    this.readability=make('button','text-button');this.readability.id='readability-button';this.readability.type='button';
    nav.append(this.button,this.readability);
    this.focus=make('div','guide-focus');this.focus.hidden=true;this.focus.setAttribute('aria-hidden','true');
    this.arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');this.arrow.classList.add('guide-arrow');
    this.arrow.setAttribute('aria-hidden','true');this.arrow.toggleAttribute('hidden',true);
    this.line=document.createElementNS('http://www.w3.org/2000/svg','path');this.line.classList.add('guide-arrow-line');
    this.head=document.createElementNS('http://www.w3.org/2000/svg','polygon');this.head.classList.add('guide-arrow-head');
    this.arrow.append(this.line,this.head);
    this.card=make('section','guide-card');this.card.id='guided-help-card';this.card.hidden=true;this.card.setAttribute('role','dialog');
    this.button.setAttribute('aria-haspopup','dialog');this.button.setAttribute('aria-controls',this.card.id);this.button.setAttribute('aria-expanded','false');
    this.card.setAttribute('aria-modal','false');this.card.setAttribute('aria-labelledby','guide-title');this.card.setAttribute('aria-describedby','guide-description');
    this.card.innerHTML=`<p class="guide-progress" id="guide-progress" role="status" aria-live="polite"></p>
      <h2 class="guide-title" id="guide-title" tabindex="-1"></h2><p class="guide-description" id="guide-description"></p>
      <p class="guide-target-note">Follow the arrow. Next only explains; you choose when to use the control.</p>
      <div class="guide-actions"><button type="button" id="guide-back">Back</button><button type="button" id="guide-show">Show control ↗</button><button type="button" id="guide-next">OK, next →</button><button type="button" id="guide-skip">Skip guide</button></div>
      <div class="guide-settings"><label><input id="guide-still" type="checkbox"> Still arrows</label><button type="button" id="guide-readability" aria-pressed="false">Readable mode: off</button><button type="button" id="guide-restart">Restart</button></div>`;
    document.body.append(this.focus,this.arrow,this.card);
    for(const dialog of document.querySelectorAll('dialog')){
      const button=make('button','text-button dialog-guide-button');button.type='button';button.textContent='Guide this window';
      button.addEventListener('click',()=>this.active?this.showStep(true):this.start());
      const header=dialog.querySelector('.dialog-top,.lounge-header,.chamber-header');
      if(header)header.append(button);else dialog.prepend(button);
    }
    this.q=selector=>this.card.querySelector(selector);
    this.button.addEventListener('click',()=>this.active?this.showStep(true):this.start());
    this.readability.addEventListener('click',()=>this.setReadable(!this.preferences.readable));
    this.q('#guide-readability').addEventListener('click',()=>this.setReadable(!this.preferences.readable));
    this.q('#guide-still').checked=this.preferences.still!==false;
    this.q('#guide-still').addEventListener('change',()=>{this.preferences.still=this.q('#guide-still').checked;write(PREFS,this.preferences);this.syncMotion();});
    this.q('#guide-back').addEventListener('click',()=>this.move(-1));
    this.q('#guide-next').addEventListener('click',()=>this.index===this.steps.length-1?this.stop(true):this.move(1));
    this.q('#guide-skip').addEventListener('click',()=>this.stop(false));
    this.q('#guide-restart').addEventListener('click',()=>{this.index=0;this.showStep(true);});
    this.q('#guide-show').addEventListener('click',()=>this.showControl());
    this.onLayout=()=>{if(this.active&&this.context!==this.currentContext().key)this.update();else this.scheduleLayout();};
    window.addEventListener('resize',this.onLayout);
    window.visualViewport?.addEventListener('resize',this.onLayout);
    document.addEventListener('scroll',this.onLayout,{capture:true,passive:true});
    document.addEventListener('toggle',this.onLayout,true);
    document.addEventListener('click',this.onLayout);
    this.scene.motionQuery.addEventListener('change',()=>this.syncMotion());
    document.addEventListener('keydown',event=>{
      if(!this.active)return;
      if(event.key==='Escape'&&(!document.querySelector('dialog[open]')||this.card.contains(document.activeElement))){event.preventDefault();this.stop(false);}
      if(event.key==='F6'){event.preventDefault();this.card.contains(document.activeElement)?this.showControl():this.q('#guide-title').focus({preventScroll:true});}
    });
    this.setReadable(Boolean(this.preferences.readable),false);this.update();
  }

  currentContext() {
    const state=this.getState(),role=guideRole(state),dialog=document.querySelector('dialog[open]');
    const candidates=dialog?guideDialogSteps(dialog.id,state):guideSteps(state);
    const steps=candidates.filter(step=>{
      const target=dialog?(dialog.matches(step.target)?dialog:dialog.querySelector(step.target)):document.querySelector(step.target);
      return target&&!target.closest('[hidden]')&&(target.getClientRects().length||target.closest('details:not([open])'));
    });
    return {role,dialog,key:`${role}:${dialog?.id||'main'}`,steps:steps.length?steps:[{id:'window',target:`#${dialog.id}`,title:'Explore this window',text:'Read the controls in this window. Close the window to return to the main guide. Next does not activate a control.'}]};
  }

  place(context) {
    this.dialog=context.dialog;this.context=context.key;
    const parent=context.dialog||document.body;
    for(const element of [this.focus,this.arrow,this.card])if(element.parentElement!==parent)parent.append(element);
  }

  anchor() {
    if(!this.target)return null;
    if(this.target.matches('details'))return this.target.querySelector('summary')||this.target;
    if(this.target.getBoundingClientRect().height>280){
      const control=[...this.target.querySelectorAll('input,select,button,summary')].find(element=>element.getClientRects().length);
      if(control)return control;
    }
    return this.target;
  }

  scrollAnchor() {
    const anchor=this.anchor();if(!anchor)return;
    const vh=window.visualViewport?.height||window.innerHeight;
    this.card.style.maxHeight=`${Math.max(160,vh*.62)}px`;
    anchor.scrollIntoView({block:'start',behavior:'instant'});
    const box=anchor.getBoundingClientRect(),space=vh-this.card.offsetHeight-28;
    const desired=clamp((space-Math.min(box.height,80))/2,16,110);
    let scroller=anchor.parentElement;
    while(scroller&&scroller!==document.body){
      if(scroller.scrollHeight>scroller.clientHeight&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY))break;
      scroller=scroller.parentElement;
    }
    if(scroller&&scroller!==document.body)scroller.scrollBy({top:box.top-desired,behavior:'instant'});
    else window.scrollBy({top:box.top-desired,behavior:'instant'});
  }

  setReadable(enabled,persist=true) {
    this.preferences.readable=enabled;
    if(persist)write(PREFS,this.preferences);
    document.body.classList.toggle('readable-mode',enabled);
    this.readability.textContent=`Readable mode: ${enabled?'on':'off'}`;
    this.readability.setAttribute('aria-pressed',String(enabled));
    this.q('#guide-readability').textContent=this.readability.textContent;
    this.q('#guide-readability').setAttribute('aria-pressed',String(enabled));
    this.scene.setEnabled(enabled?false:this.scene.preferredEffects(),{persist:false});
    this.syncMotion();this.scheduleLayout();
  }

  syncMotion() {
    const still=this.q('#guide-still').checked||this.scene.motionQuery.matches||this.preferences.readable;
    document.body.classList.toggle('guide-motion',this.active&&!still);
  }

  update() {
    const context=this.currentContext(),{role,steps}=context;
    if(!this.active){this.button.textContent=this.saved.context===context.key&&!this.saved.done?'Resume guide':'Guided mode';return;}
    const previous=this.steps?.[this.index]?.id;
    const changed=context.key!==this.context;
    if(changed&&this.context)this.positions.set(this.context,this.index);
    this.role=role;this.steps=steps;this.place(context);
    this.index=changed?clamp(this.positions.get(context.key)||0,0,steps.length-1):Math.max(0,steps.findIndex(step=>step.id===previous));
    const signature=JSON.stringify([role,this.index,steps[this.index]]);
    if(signature!==this.signature)this.showStep(changed);
    else this.scheduleLayout();
  }

  start() {
    this.returnFocus=document.activeElement;
    const context=this.currentContext();this.role=context.role;this.steps=context.steps;this.place(context);
    this.index=this.saved.role===this.role&&this.saved.context===this.context&&!this.saved.done?clamp(Number(this.saved.index)||0,0,this.steps.length-1):0;
    this.active=true;this.button.textContent='Return to guide';this.button.setAttribute('aria-expanded','true');this.syncMotion();this.showStep(true);
  }

  move(direction) {this.index=clamp(this.index+direction,0,this.steps.length-1);this.showStep(true);}

  clearTarget() {
    if(!this.target)return;
    if(this.oldDescription===null)this.target.removeAttribute('aria-describedby');else this.target.setAttribute('aria-describedby',this.oldDescription);
    if(this.addedTabIndex)this.target.removeAttribute('tabindex');
    this.target=null;this.addedTabIndex=false;
  }

  showStep(focus) {
    if(!this.active)return;
    const step=this.steps[this.index];if(!step){this.stop(true);return;}
    this.clearTarget();this.target=this.dialog?(this.dialog.matches(step.target)?this.dialog:this.dialog.querySelector(step.target)):document.querySelector(step.target);
    if(this.target){
      for(let current=this.target;current;current=current.parentElement)if(current.matches('details')&&!current.open){current.open=true;this.opened.add(current);}
      this.oldDescription=this.target.getAttribute('aria-describedby');
      this.target.setAttribute('aria-describedby',[this.oldDescription,'guide-description'].filter(Boolean).join(' '));
    }
    const roleNames={lobby:'Getting started',host:'Streamer guide',viewer:'Viewer guide',spectator:'Watching guide'};
    this.q('#guide-progress').textContent=`${this.dialog?'Window guide':roleNames[this.role]} · Step ${this.index+1} of ${this.steps.length}`;
    this.q('#guide-title').textContent=step.title;this.q('#guide-description').textContent=step.text;
    this.q('#guide-back').disabled=this.index===0;this.q('#guide-next').textContent=this.index===this.steps.length-1?'Finish guide ✓':'OK, next →';
    this.signature=JSON.stringify([this.role,this.index,step]);
    this.saved={role:this.role,context:this.context,index:this.index,done:false};write(PROGRESS,this.saved);
    this.card.hidden=false;
    if(focus){
      this.scrollAnchor();
      this.q('#guide-title').focus({preventScroll:true});
    }
    this.layout();
  }

  showControl() {
    if(!this.target)return;
    this.scrollAnchor();
    let control=this.target.matches('button,a,input,select,textarea,summary')?this.target:this.target.querySelector('button:not(:disabled):not([hidden]),input:not(:disabled),select:not(:disabled),summary,a[href]');
    if(control?.disabled||!control?.getClientRects().length)control=null;
    if(!control){control=this.target;if(!control.hasAttribute('tabindex')){control.setAttribute('tabindex','-1');this.addedTabIndex=true;}}
    control.focus({preventScroll:true});this.scheduleLayout();
  }

  scheduleLayout() {
    if(!this.active||this.frame)return;
    this.frame=requestAnimationFrame(()=>{this.frame=0;this.layout();});
  }

  layout() {
    if(!this.active)return;
    this.card.hidden=false;this.focus.hidden=false;this.arrow.toggleAttribute('hidden',false);
    const vw=document.documentElement.clientWidth,vh=window.visualViewport?.height||window.innerHeight;
    const width=Math.min(360,vw-24);this.card.style.width=`${width}px`;this.card.style.bottom='auto';this.card.style.maxHeight=`${Math.max(160,vh*.62)}px`;
    const anchor=this.anchor(),box=anchor?.getBoundingClientRect(),visible=box&&anchor.getClientRects().length&&box.width>0&&box.height>0;
    this.q('#guide-show').disabled=!visible||this.target.matches(':disabled');
    if(!visible){this.focus.hidden=true;this.arrow.toggleAttribute('hidden',true);this.card.style.left=`${Math.max(12,vw-width-16)}px`;this.card.style.top=`${Math.max(12,vh-this.card.offsetHeight-16)}px`;return;}
    const inView=box.bottom>0&&box.top<vh&&box.right>0&&box.left<vw;
    this.q('.guide-target-note').textContent=inView?'Follow the arrow. Next only explains; you choose when to use the control.':'The control is off screen. Use Show control to bring it back.';
    const h=Math.min(this.card.offsetHeight,vh-24),x=clamp(vw-width-16,12,vw-width-12);
    // Keep the card on the other side of the highlighted control where possible.
    const top=box.top+Math.min(box.height,vh)/2>vh/2?12:Math.max(12,vh-h-12);
    this.card.style.left=`${x}px`;this.card.style.top=`${top}px`;
    if(!inView){this.focus.hidden=true;this.arrow.toggleAttribute('hidden',true);return;}
    const left=clamp(box.left-5,4,vw-12),right=clamp(box.right+5,left+8,vw-4);
    const y1=clamp(box.top-5,4,vh-12),y2=clamp(box.bottom+5,y1+8,vh-4);
    Object.assign(this.focus.style,{left:`${left}px`,top:`${y1}px`,width:`${right-left}px`,height:`${y2-y1}px`});
    const cardBox=this.card.getBoundingClientRect(),up=top<(y1+y2)/2;
    const sx=clamp((left+right)/2,cardBox.left+20,cardBox.right-20),sy=up?cardBox.bottom+4:cardBox.top-4;
    const tx=clamp((left+right)/2,8,vw-8),ty=up?y1-2:y2+2;
    this.arrow.setAttribute('viewBox',`0 0 ${vw} ${vh}`);this.arrow.setAttribute('preserveAspectRatio','none');
    this.line.setAttribute('d',`M ${sx} ${sy} Q ${sx} ${(sy+ty)/2} ${tx} ${ty}`);
    const direction=up?1:-1;
    this.head.setAttribute('points',`${tx},${ty} ${tx-6},${ty-10*direction} ${tx+6},${ty-10*direction}`);
    // A label and outline still work if the card overlaps a large container.
    this.arrow.toggleAttribute('hidden',Math.abs(ty-sy)<24||(cardBox.top<y2&&cardBox.bottom>y1&&cardBox.left<right&&cardBox.right>left));
  }

  stop(done) {
    this.active=false;this.button.setAttribute('aria-expanded','false');cancelAnimationFrame(this.frame);this.frame=0;this.clearTarget();
    this.card.hidden=true;this.focus.hidden=true;this.arrow.toggleAttribute('hidden',true);document.body.classList.remove('guide-motion');
    for(const details of this.opened)if(details.isConnected)details.open=false;
    this.opened.clear();this.saved={role:this.role,context:this.context,index:this.index,done};write(PROGRESS,this.saved);this.update();
    const modal=document.querySelector('dialog[open]');
    const returnVisible=this.returnFocus?.isConnected&&this.returnFocus.getClientRects().length&&(!modal||modal.contains(this.returnFocus));
    const focus=returnVisible?this.returnFocus:modal?.querySelector('.dialog-guide-button,button:not(:disabled)')||this.button;
    focus.focus({preventScroll:true});
  }
}
