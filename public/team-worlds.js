import { DOMAINS, getDomain } from './domains.js';

const $=id=>document.getElementById(id);
const node=(tag,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};

export class TeamWorlds {
  constructor({scene,getState,getEye,isBusy,vote,toast}){
    Object.assign(this,{scene,getState,getEye,isBusy,vote,toast});this.preview=null;this.selection='taiga';this.lobbyChoice='taiga';this.teamId=null;
    this.lobbyCards=new Map();this.cards=new Map();
    for(const domain of DOMAINS){
      const make=(lobby=false)=>{
        const card=node('button','world-card');card.type='button';card.dataset.world=domain.id;card.setAttribute('aria-label',`Preview ${domain.name}`);
        const image=node('img');image.src=domain.asset;image.alt='';image.loading='lazy';image.decoding='async';
        const copy=node('span','world-card-copy');copy.append(node('strong','',`${domain.symbol} ${domain.name}`),node('small','',lobby?domain.subtitle:domain.detail));
        const meta=node('span','world-meta');meta.append(node('span','world-vote-count'),node('span','world-home-mark'));copy.append(meta);card.append(image,copy);
        card.addEventListener('click',()=>{if(lobby){this.lobbyChoice=domain.id;this.scene.setTheme(domain.id);this.renderLobby();}else{this.selection=this.preview=domain.id;this.render();}});
        return card;
      };
      const lobby=make(true),card=make();this.lobbyCards.set(domain.id,lobby);this.cards.set(domain.id,card);$('lobby-world-gallery').append(lobby);$('domain-gallery').append(card);
    }
    for(const id of ['choose-domain','arena-domain-button'])$(id).addEventListener('click',()=>this.open());
    $('return-domain').addEventListener('click',()=>{this.preview=null;this.selection=this.team().domain;this.render();});
    $('domain-preview-button').addEventListener('click',()=>{this.preview=this.selection;$('domain-dialog').close();this.render();});
    for(const id of ['domain-vote-button','domain-quick-vote'])$(id).addEventListener('click',()=>this.castVote());
    this.renderLobby();
  }
  team(){const state=this.getState();return state?.teams.find(t=>t.eyeId===(state.me?.team||this.getEye()));}
  open(){const team=this.team();if(!team)return;this.selection=this.preview||team.domain;this.render();$('domain-dialog').showModal();}
  renderLobby(){const domain=getDomain(this.lobbyChoice);for(const [id,card]of this.lobbyCards){card.setAttribute('aria-pressed',String(id===domain.id));card.querySelector('.world-home-mark').hidden=true;card.querySelector('.world-vote-count').textContent=id===domain.id?'PREVIEWING':'EXPLORE ↗';}$('lobby-world-description').textContent=`${domain.subtitle} · Preview only. Your team chooses after joining.`;}
  render(){
    const state=this.getState();if(!state){this.scene.setTheme(this.lobbyChoice);document.querySelector('.crew-header .room-tag').textContent='FIVE TEAMS / ONE SHARED SIGNAL';return;}
    const team=this.team();if(!team)return;
    if(this.teamId!==team.id){this.teamId=team.id;this.preview=null;this.selection=team.domain;}
    const home=getDomain(team.domain),display=getDomain(this.preview||home.id),previewing=display.id!==home.id,selected=getDomain(this.selection),me=state.me;
    this.scene.setTheme(display.id);
    $('realm-strip').dataset.symbol=display.symbol;$('realm-label').textContent=previewing?'LOCAL PREVIEW / YOUR TEAM HOME IS UNCHANGED':`${state.isHost?'VIEWING':'HOME OF'} ${team.name.toUpperCase()} TEAM / ${team.id}`;
    $('realm-name').textContent=`${display.symbol} ${display.name}`;$('realm-description').textContent=previewing?`${home.name} remains your team’s home. Vote to propose this world.`:`${display.subtitle} · ${team.domainVoteTotal} domain vote${team.domainVoteTotal===1?'':'s'}`;
    $('realm-description').classList.toggle('realm-preview-notice',previewing);$('return-domain').hidden=!previewing;$('domain-quick-vote').hidden=!previewing||!me;$('domain-quick-vote').disabled=this.isBusy()||me?.domainVote===display.id;
    $('arena-domain-name').textContent=display.name;$('arena-domain-symbol').textContent=display.symbol;
    $('domain-team-context').textContent=me?`${team.name} team · one replaceable vote per member. An outright lead chooses the home; a tie keeps the current world.`:`Explore ${team.name}’s domain. Join a viewer seat to vote for your own team’s home.`;
    for(const [id,card]of this.cards){card.setAttribute('aria-pressed',String(id===selected.id));card.querySelector('.world-vote-count').textContent=`${team.domainVotes[id]||0} vote${team.domainVotes[id]===1?'':'s'}`;const mark=card.querySelector('.world-home-mark');mark.hidden=id!==home.id&&id!==me?.domainVote;mark.textContent=id===home.id?'TEAM HOME':'YOUR VOTE';}
    $('domain-selection-title').textContent=selected.name;$('domain-selection-description').textContent=selected.description;
    $('domain-vote-button').hidden=!me;$('domain-vote-button').disabled=this.isBusy()||me?.domainVote===selected.id;$('domain-vote-button').textContent=me?.domainVote===selected.id?'Your vote is recorded ✓':'Vote for this home ↗';
    $('domain-vote-note').textContent=me?.domainVote?`Your current vote: ${getDomain(me.domainVote).name}. Team home: ${home.name}. Homes and domain votes stay across new rounds.`:'Previewing changes your own browser. Your vote is saved for this room and your team.';
    document.querySelector('.crew-header .room-tag').textContent=`FIVE TEAMS / ${display.name.toUpperCase()}`;
  }
  async castVote(){
    const state=this.getState();if(!state?.me||this.isBusy())return;
    const domain=this.preview||this.selection,result=await this.vote(domain);
    if(result){this.preview=null;this.selection=this.team().domain;if($('domain-dialog').open)$('domain-dialog').close();this.toast(result.message);}
    this.render();
  }
}
