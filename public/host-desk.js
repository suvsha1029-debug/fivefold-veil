import { EYES, RULE_POOL, authoredPuzzle } from './engine.js';
import { signalEmoji } from './emoji-keyboard.js';

export const CONTROL_MODES={
  community:{label:'Viewers lead',description:'Viewers experiment and vote. Evidence contributors can confirm the leading vote. The host can always pause.'},
  shared:{label:'Shared control',description:'Viewers experiment and vote. The host confirms the leading theory and final signal.'},
  host:{label:'Host-led',description:'Viewers propose experiments for approval and cast advisory votes. The host chooses the theory and final signal.'},
};
const $=id=>document.getElementById(id);
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};

export class HostDesk{
  constructor({getState,isBusy,action,toast}){
    Object.assign(this,{getState,isBusy,action,toast});this.draft=null;this.eyeId='crown';this.signature='';this.mode=null;
    $('save-control-mode').addEventListener('click',async()=>{const r=await action('control',{type:'mode',mode:$('host-control-mode').value});if(r)toast(r.message);});
    $('generate-puzzle').addEventListener('click',async()=>{const r=await action('control',{type:'generatePuzzle'});if(r)toast(r.message);});
    $('withdraw-test').addEventListener('click',async()=>{const r=await action('withdraw-test',{});if(r)toast(r.message);});
    $('open-puzzle-editor').addEventListener('click',()=>{
      const state=getState();if(!state?.authoring)return;
      this.draft=structuredClone(state.authoring);this.eyeId='crown';
      $('editor-eye').replaceChildren(...EYES.map(e=>{const o=el('option',e.name);o.value=e.id;return o;}));
      $('editor-feedback').textContent='Draft only. Your changes reach viewers after validation and publication.';this.renderEditor();$('puzzle-editor').showModal();
    });
    $('editor-eye').addEventListener('change',()=>{this.saveEye();this.eyeId=$('editor-eye').value;this.renderEditor();});
    $('publish-puzzle').addEventListener('click',async()=>{
      this.saveEye();try{authoredPuzzle(this.draft);}catch(error){$('editor-feedback').textContent=error.message;return;}
      const r=await action('control',{type:'publishPuzzle',definition:this.draft});
      if(r){$('puzzle-editor').close();toast(r.message);}else $('editor-feedback').textContent='Publication did not complete. Check the error message; your draft remains here.';
    });
  }
  saveEye(){
    const spec=this.draft?.find(e=>e.id===this.eyeId);if(!spec)return;
    spec.correct=$('editor-correct').value;
    spec.options=[...$('editor-options').children].map(row=>({ruleId:row.querySelector('select').value,label:row.querySelector('input').value}));
  }
  renderEditor(){
    const spec=this.draft.find(e=>e.id===this.eyeId);$('editor-eye').value=this.eyeId;$('editor-correct').value=spec.correct;
    $('editor-options').replaceChildren(...spec.options.map((option,i)=>{
      const row=el('fieldset','','editor-option'),legend=el('legend',`Option ${'ABCD'[i]}`);
      const name=el('label','Your label (optional)'),input=el('input');input.maxLength=48;input.value=option.label||'';input.placeholder='e.g. The ember responds';name.append(input);
      const rule=el('label','Exact signal rule'),select=el('select');
      select.append(...RULE_POOL.map(r=>{const o=el('option',r.description);o.value=r.id;return o;}));select.value=option.ruleId;rule.append(select);row.append(legend,name,rule);return row;
    }));
  }
  render(){
    const state=this.getState();if(!state)return;const mode=CONTROL_MODES[state.controlMode||'shared'],busy=this.isBusy();
    $('control-mode-label').textContent=mode.label;$('control-mode-description').textContent=mode.description;
    $('host-desk').hidden=!state.isHost;
    const pending=state.pendingTests||[];
    $('withdraw-test').hidden=!state.me||!pending.length;$('withdraw-test').disabled=busy;
    if(state.me&&pending.length)$('control-mode-description').textContent=`Your ${signalEmoji(pending[0].signal)} experiment at ${pending[0].eyeId} is waiting for the host. No test or vote has been spent.`;
    if(!state.isHost)return;
    if(document.activeElement!==$('host-control-mode')&&!$('host-control-mode').matches(':focus')){
      if(this.mode!==(state.controlMode||'shared'))$('host-control-mode').value=state.controlMode||'shared';
    }this.mode=state.controlMode||'shared';
    $('save-control-mode').disabled=busy||!['idle','paused'].includes(state.game.status);
    $('open-puzzle-editor').disabled=busy||!state.authoring;$('generate-puzzle').disabled=busy||!state.authoring;
    $('publish-puzzle').disabled=busy||!state.authoring;
    $('editor-availability').textContent=state.authoring?`${state.puzzleType==='authored'?'Your authored puzzle':'Generated puzzle'} · ready to edit before starting.`:'Rules are locked for this round. Start a new round to edit.';
    const signature=pending.map(p=>p.id).join('|')+state.game.status+busy;
    if(signature===this.signature)return;this.signature=signature;
    $('pending-experiments').replaceChildren(el('h3',`Experiment requests · ${pending.length}/24`));
    if(!pending.length)$('pending-experiments').append(el('p','Host-led requests appear here. Approving records the experiment for its viewer; declining spends nothing.'));
    for(const p of pending){
      const row=el('div','','pending-experiment');row.append(el('span',`${p.name} · ${p.eyeId} · ${signalEmoji(p.signal)}`));
      for(const [type,label] of [['approveTest','Approve'],['rejectTest','Decline']]){
        const b=el('button',label,'outline-button');b.type='button';b.disabled=busy||(type==='approveTest'&&state.game.status!=='running');
        b.addEventListener('click',async()=>{const r=await this.action('control',{type,pendingId:p.id});if(r)this.toast(type==='approveTest'?'Experiment approved. The viewer earned evidence.':r.message);});row.append(b);
      }$('pending-experiments').append(row);
    }
  }
}
