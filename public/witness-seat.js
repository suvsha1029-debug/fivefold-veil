import { makeSigil } from './domain-sigils.js';
import { signalEmoji } from './emoji-keyboard.js';
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};

export class WitnessSeat{
  constructor({getState,isBusy,action,toast}){
    Object.assign(this,{getState,isBusy,action,toast});this.signature='';
    this.root=el('details','','witness-panel');this.root.id='witness-seat';this.root.setAttribute('aria-label','Witness Seat and discovery replay');
    this.root.innerHTML=`<summary class="witness-disclosure"><strong>Witness Seat</strong><span class="witness-summary">Optional · recognise a discovery</span></summary><div class="witness-content"><div class="witness-heading"><div><p class="eyebrow">EVIDENCE EARNS RECOGNITION</p><h2>The Witness Seat</h2></div><span class="witness-status"></span></div>
      <p class="witness-intro">A useful experiment or evidence citation can earn one message to the streamer after a correct seal. The host chooses what to feature.</p>
      <div class="witness-private"><div class="witness-host" hidden><button class="outline-button witness-toggle"></button><p>Optional · 10 waiting messages maximum · one per contributor each round · choose across teams.</p><div class="witness-queue"></div></div>
      <form class="witness-compose" hidden><label>Your spotlight message <span>(180 characters)</span><textarea maxlength="180" rows="2" placeholder="Explain your discovery or ask the streamer a question." required></textarea></label><p class="witness-earned"></p><button class="primary-button" type="submit">Send for host review →</button></form><p class="witness-personal" role="status"></p><button class="text-button witness-withdraw" hidden>Withdraw my message</button></div>
      <div class="witness-featured" role="status" aria-live="polite" hidden></div><div class="witness-replay" hidden></div>
      <details class="witness-archive"><summary>Discovery archive · <span>0</span> seals recorded</summary><div class="witness-discoveries"></div></details></div>`;
    document.querySelector('.crew-activity').after(this.root);
    this.q=s=>this.root.querySelector(s);
    this.q('.witness-toggle').addEventListener('click',()=>this.send({type:'enable',enabled:!this.getState().witness.enabled}));
    this.q('form').addEventListener('submit',async e=>{e.preventDefault();const r=await this.send({type:'submit',text:this.q('textarea').value});if(r)this.q('textarea').value='';});
    this.q('.witness-withdraw').addEventListener('click',()=>this.send({type:'withdraw'}));
  }
  async send(body){const r=await this.action('witness',body);if(r)this.toast(r.message);return r;}
  button(text,body){const b=el('button',text,'outline-button');b.type='button';b.addEventListener('click',()=>this.send(body));return b;}
  tick(now,stale=false){const w=this.getState()?.witness;if(!w)return;this.q('.witness-featured').hidden=stale||!w.featured||w.featured.until<=now;this.q('.witness-replay').hidden=stale||!w.replay||w.replay.until<=now;}
  recap(d,host=false){
    const card=el('article','','discovery-recap');card.append(el('p',`${d.name.toUpperCase()} / DISCOVERY RECORDED`,'eyebrow'),el('h3',d.rule));
    const list=el('ol');for(const s of d.steps){list.append(el('li',`#${s.sequence} · ${s.name}: ${signalEmoji(s.signal)} → ${s.accepted?'PASS':'FAIL'} · ${s.eliminated.length?'ruled out '+s.eliminated.join(', '):'confirmed existing evidence'}`));}card.append(list);
    card.append(el('p',d.credits.length?'Evidence credit: '+d.credits.map(c=>`${c.name} (${c.team})`).join(' · '):'No experiment narrowed the options before this seal.','witness-credit'));
    if(host)card.append(this.button('Show replay to audience · 20s',{type:'replay',id:d.id}));return card;
  }
  render(){
    const state=this.getState();if(!state)return;const w=state.witness;if(!w)return;
    const key=state.code+':'+state.round;if(this.roomKey!==key){this.roomKey=key;this.attentionSeen=new Set();this.q('textarea').value='';this.signature='';}
    this.q('.witness-host').hidden=!state.isHost;
    this.q('.witness-toggle').textContent=w.enabled?'Turn Witness Seat off':'Enable Witness Seat';
    this.q('.witness-status').textContent=w.enabled?'HOST REVIEW / ON':'HOST REVIEW / OFF';
    const seat=w.mine[0],canSubmit=!!seat&&seat.status==='earned'&&w.enabled;
    this.q('.witness-summary').textContent=w.featured?'Live · contributor spotlight':w.replay?'Live · discovery replay':state.isHost&&w.queue.length?`${w.queue.length} message${w.queue.length===1?'':'s'} awaiting review`:canSubmit?'You earned a message to the streamer':'Optional · recognise a discovery';
    // Open for a newly earned seat or live moment, then respect the user's choice.
    const attentionKeys=[...(w.featured?[`${key}:feature:${w.featured.id}:${w.featured.until}`]:[]),...(w.replay?[`${key}:replay:${w.replay.id}:${w.replay.until}`]:[]),...(canSubmit?[`${key}:earned:${seat.id}`]:[])];
    for(const attentionKey of attentionKeys)if(!this.attentionSeen.has(attentionKey)){this.attentionSeen.add(attentionKey);this.root.open=true;}
    this.q('form').hidden=!canSubmit;this.q('.witness-earned').textContent=seat?.reason||'';
    this.q('.witness-personal').textContent=seat?({earned:w.enabled?'Your contribution earned a seat. Submitting is optional.':'You earned a seat. The host currently has spotlight messages turned off.',pending:'Waiting privately for host approval. Your message is not yet on the broadcast.',featured:'The host featured your message. Thank you for contributing.',expired:'Your request expired. You can earn another seat next round.',dismissed:'The host declined or closed your request.',withdrawn:'You withdrew your message.',removed:'Your message was removed by moderation.'}[seat.status]||''):state.me?'Help eliminate a theory before its eye is sealed to earn a seat.':state.isHost?'Viewers can also submit with !spotlight your message in connected Twitch chat.':'Watch the discoveries here. Join a team to earn a seat.';
    this.q('.witness-withdraw').hidden=!seat||!['pending','featured'].includes(seat.status);
    const signature=JSON.stringify([w.queue,w.featured,w.replay,w.discoveries,state.isHost]);
    if(signature!==this.signature){this.signature=signature;
      this.q('.witness-queue').replaceChildren(...w.queue.map(s=>{const card=el('article','','witness-request');card.append(makeSigil(s.domain),el('strong',`${s.name} / ${s.team} · ${s.source==='twitch'?'Twitch relay':'browser guest'}`),el('p',s.reason,'witness-credit'),el('blockquote',s.text),this.button('Feature · 60s',{type:'approve',id:s.id}),this.button('Dismiss',{type:'dismiss',id:s.id}));return card;}));
      if(state.isHost&&!w.queue.length)this.q('.witness-queue').append(el('p','No messages awaiting review.'));
      const featured=this.q('.witness-featured');featured.hidden=!w.featured;featured.replaceChildren();
      if(w.featured){const f=w.featured;featured.append(makeSigil(f.domain),el('p','THE WITNESS SEAT / HOST-APPROVED','eyebrow'),el('h3',`${f.name} · ${f.team} team`),el('blockquote',f.text),el('p',f.reason,'witness-credit'));if(state.isHost)featured.append(this.button('Dismiss spotlight',{type:'clear'}));}
      const replay=this.q('.witness-replay'),discovery=w.discoveries.find(d=>d.id===w.replay?.id);replay.hidden=!discovery;replay.replaceChildren();if(discovery){replay.append(this.recap(discovery));if(state.isHost)replay.append(this.button('Close audience replay',{type:'clearReplay'}));}
      this.q('.witness-discoveries').replaceChildren(...[...w.discoveries].reverse().map(d=>this.recap(d,state.isHost)));this.q('.witness-archive summary span').textContent=w.discoveries.length;
    }
    for(const b of this.root.querySelectorAll('button'))b.disabled=this.isBusy();
  }
}
