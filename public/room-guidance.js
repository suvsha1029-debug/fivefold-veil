// Derive onboarding and recaps from public evidence only, never the secret rule.
export function roomGuidance(state, eyeId) {
  const g=state.game, eye=g.eyes.find(e=>e.id===eyeId)||g.eyes[0];
  const possible=eye.options.filter(o=>!o.eliminated), latest=g.experiments.at(-1);
  const minimum=state.minimumTeams??2;
  const recap=`${g.sealedCount} of 5 discoveries secured · ${g.experiments.length} experiments · ${state.activeTeams}/${minimum} contributing teams needed`;
  const latestEye=latest&&g.eyes.find(e=>e.id===latest.eyeId);
  const last=latest?`${latestEye.name}: ${latest.color} ${latest.shape}, ${latest.pulses} pulse${latest.pulses===1?'':'s'} → ${latest.accepted?'PASS':'FAIL'}. ${latestEye.options.filter(o=>!o.eliminated).length} possible theories remain at this eye.`:'No experiments yet. Choose a colour, shape and pulse count to ask the guardian a question.';
  let title,detail,target='emoji-keyboard';
  if(['won','lost'].includes(g.status)){
    title=g.status==='won'?'The shared signal opened the veil.':'This encounter has ended.';
    detail='Review the discoveries below. The host can start a fresh round.';target='room-outcome';
  }else if(g.status==='idle'||g.status==='paused'){
    title=g.status==='idle'?'Get ready for the first experiment.':'The clock is held.';
    detail=state.isHost?'Invite your crew, then start when they are ready. Viewers may simply watch.':'The host starts the clock. Your team can investigate every eye; choosing a world is optional.';target='host-start';
  }else if(g.phase==='binding'){
    title='Combine the five discoveries.';
    detail=state.activeTeams<minimum?`Evidence from ${minimum} different teams is needed. A newcomer can link a journal observation to a theory it disproves.`:state.controlMode==='host'?'Viewer proposals are advisory. The host chooses a signal satisfying all five discoveries.':state.controlMode==='community'?'Contributors propose a signal, then any evidence contributor can confirm the leading vote. Tied votes cannot be confirmed.':'Choose one signal that satisfies all five revealed rules. Contributors propose it; the host confirms the leading vote.';
    target=state.activeTeams<minimum?'proof-panel':state.isHost?'host-seal':'emoji-keyboard';
  }else if(eye.sealed){
    title=`${eye.name} is solved. Help another eye.`;detail='Select an unsealed eye. Every discovery is needed for the final signal.';target='team-list';
  }else if(state.isHost&&state.controlMode==='host'){
    title=state.pendingTestCount?'Your crew has experiments to review.':`Direct the investigation at ${eye.name}.`;
    detail=state.pendingTestCount?'Approve a request to run it for that viewer. Declining spends no experiment.':'After an experiment, select your preferred theory and seal it. Viewer votes help you decide; they do not determine your choice.';
    target=state.pendingTestCount?'host-desk':'room-theories';
  }else if(state.isHost){
    title=eye.voteTotal?`Review ${eye.name}’s leading theory.`:`Invite an experiment at ${eye.name}.`;
    detail=eye.voteTotal?'Check the evidence before sealing. A wrong seal adds a fracture.':'Viewers test signals, interpret results and vote. You can share a nudge if they ask for help.';target=eye.voteTotal?'host-seal':'host-hint';
  }else if(!state.me){
    title=`Watch the crew investigate ${eye.name}.`;detail='PASS and FAIL narrow down its hidden rule. Watching is welcome; joining is optional.';target='watch-join';
  }else if(state.me.eligible.includes(eye.id)){
    title=`Your evidence earned a vote at ${eye.name}.`;detail=`${possible.length} theor${possible.length===1?'y remains':'ies remain'}. Compare them with the journal, then choose your theory.${state.controlMode==='community'?' You can also confirm the leading vote.':''}`;target='room-theories';
  }else if(eye.experiments.length&&eye.options.some(o=>o.eliminated)){
    title='Just arrived? Use what the crew already learned.';detail='Link a journal observation to a theory it disproves. You earn a vote without spending another experiment.';target='proof-panel';
  }else{
    title=`Try your first signal at ${eye.name}.`;detail=state.controlMode==='host'?'Pick a colour, shape and pulse count. Request an experiment; the host chooses when to approve it.':'Pick one colour, one shape and 1–3 pulses. Send an experiment; either result is useful evidence.';
  }
  return {recap,last,title,detail,target,possible:possible.length};
}
