// Tour copy uses role, phase and participation rules only. It never reads a
// puzzle's answer, authored rules, private credentials or a viewer's chat.
export function guideRole(state) {
  if (!state) return 'lobby';
  if (state.isHost) return 'host';
  return state.me ? 'viewer' : 'spectator';
}

const step=(id,target,title,text)=>({id,target,title,text});
const journal=()=>step('journal','.room-journal','Read what the crew learned','Each experiment records its signal, contributor and PASS or FAIL result here. Compare these results with the theories; either result can be useful evidence.');
const worlds=()=>step('worlds','#realm-strip','Visit your team’s world · optional','Choose a home domain or explore its rooms and lounge. These visits are optional and do not replace the five-eye investigation.');
const witness=()=>step('witness','#witness-seat','Earn a message to the streamer · optional','Useful evidence can earn a Witness Seat after a correct seal. Messages stay private until the host chooses one to feature.');
const council=()=>step('council','#council','Gather other communities · optional','The host can appoint two to five streamer captains for a theory council or an approved meme round. Confidence points are free game points with no cash value.');

function votingText(mode,host=false) {
  if(mode==='host') return host
    ? 'After an experiment, choose a theory supported by the evidence and seal your choice. Viewer votes are advisory in Host-led mode; a wrong seal adds a fracture.'
    : 'A test or a correct evidence link earns a vote at that eye. In Host-led mode your vote advises the host, who chooses which theory to seal.';
  if(mode==='community') return host
    ? 'Evidence contributors vote for a theory. In Viewers lead mode, an eligible contributor can confirm the leading vote; tied votes need agreement first.'
    : 'A test or a correct evidence link earns a vote at that eye. In Viewers lead mode, eligible contributors can confirm the leading vote; tied votes need agreement first.';
  return host
    ? 'Your evidence contributors vote for a theory. In Shared control, you confirm the leading vote after checking the journal; tied votes need agreement first.'
    : 'A test or a correct evidence link earns a vote at that eye. Compare the journal, choose a theory, then let the host confirm the leading vote.';
}

function bindingSteps(state,role) {
  const mode=state.controlMode||'shared',host=role==='host',minimum=state.minimumTeams??2;
  const held=['idle','paused'].includes(state.game?.status);
  const steps=[step('binding-rules','.crew-theories','Combine the five discoveries',`The final signal must satisfy all five revealed rules. Evidence from ${minimum} different team${minimum===1?' is':'s are'} needed before it can be confirmed.${held?' The clock is held; controls reactivate when the host resumes.':''}`)];
  if(host) {
    if(mode==='host') steps.push(step('binding-compose','#emoji-keyboard','Choose the final signal','Choose a colour, shape and pulse count that fit every discovery. In Host-led mode, Bind selected signal submits your choice; an incorrect choice adds a fracture.'));
    else steps.push(step('binding-review','#host-seal','Confirm the shared signal',mode==='community'
      ? 'Eligible evidence contributors can propose and confirm the leading binding in Viewers lead mode. Review the discoveries and proposals before confirming; tied votes need agreement.'
      : 'Viewers propose the final signal with their keyboard or Twitch chat. Review the discoveries and confirm the leading binding only when the evidence supports it.'));
  } else if(role==='viewer') {
    steps.push(step('binding-compose','#emoji-keyboard','Propose a final signal',mode==='host'
      ? 'Choose a colour, shape and pulse count that fit every discovery, then propose them. In Host-led mode your proposal is advisory; the host makes the final choice.'
      : 'Choose a colour, shape and pulse count that fit every discovery, then propose them. Evidence contributors can vote for the final signal.'));
    steps.push(step('binding-confirm','.crew-theories','Check who confirms',mode==='community'
      ? 'In Viewers lead mode, any evidence contributor can confirm the leading binding once the team requirement is met. A tie must be resolved first; a wrong binding adds a fracture.'
      : 'The host confirms the final choice once enough teams have contributed. A wrong binding adds a fracture, so compare all five discoveries first.'));
  }
  steps.push(journal());
  return steps;
}

export function guideSteps(state) {
  const role=guideRole(state);
  if(role==='lobby') return [
    step('create','#create-form','Streaming? Create a room','Name your expedition and choose Small crew for one contributing team, or Team expedition for two. Control mode and timer settings are optional; this guide will not create a room for you.'),
    step('join','#join-form','Watching? Join with a name','Paste the streamer’s room code and enter a display name. Team and emblem choices are optional; Just watch lets you follow without joining.'),
    step('preview','.optional-worlds','Preview a domain · optional','Open this registry to see the six worlds and their sigils. You can join immediately and explore them later.'),
  ];

  const game=state.game||{},mode=state.controlMode||'shared',paused=game.status==='idle'||game.status==='paused';
  if(['won','lost'].includes(game.status)) {
    const steps=[step('outcome','#room-outcome','Review the expedition’s outcome','This round has ended. Review the final result and discoveries, then use the journal to understand how the crew reached them.'),journal()];
    if(role==='host') steps.push(step('new-round','#host-reset','Begin another round when ready','New round resets the puzzle and discoveries while retaining the room and member IDs. This guide only explains the control; it does not reset anything.'));
    if(role!=='spectator') steps.push(worlds());
    return steps;
  }

  if(role==='spectator') return [
    step('watch','.expedition-brief','Follow the expedition',paused?'The host has not started the clock, or has paused it. You can keep watching; this guide does not start or resume the game.':'This card explains the crew’s current task and latest evidence. Watching is welcome; no contribution is required.'),
    journal(),
    step('watch-theories','.crew-theories',game.phase==='binding'?'Read the five discoveries':'Follow the theories',game.phase==='binding'?'The crew is combining the five discovered rules into one final signal. Watch their proposals and the final outcome here.':'Experiments rule out incompatible theories. Follow the remaining options and watch the crew choose which rule to confirm.'),
    step('watch-join','#watch-join','Join whenever you want','Join this expedition opens the name form. You can participate with the browser keyboard after joining, or continue watching.'),
  ];

  if(game.phase==='binding') return [...bindingSteps(state,role),worlds(),witness(),council()];

  if(role==='host') return [
    step('invite','#quick-invite','1. Invite your viewers','Copy viewer invite copies a room link for your crew. Share that viewer link; keep your private host key to yourself.'),
    step('twitch','#room-twitch-button','2. Connect Twitch · optional','Connect your broadcaster account once to receive Twitch chat commands. This browser restores a valid saved sign-in after refresh. Browser viewers can play without connecting Twitch.'),
    step('clock','#host-start','3. Start when your crew is ready',paused?'Begin or resume the encounter when everyone is ready. The guide does not start it or spend an experiment.':'The encounter is running. Hold the clock pauses it if you want more time to read; the guide does not pause it automatically.'),
    step('control','#host-desk','Choose how much control to share',mode==='host'?'In Host-led mode, review and approve viewer experiment requests here. Change participation modes only while the clock is held; the puzzle editor is available before a round starts.':mode==='community'?'Viewers lead lets evidence contributors confirm leading votes. You can change participation modes while the clock is held; puzzle editing is available before a round starts.':'Shared control lets viewers experiment and vote while you confirm answers. Change participation modes while the clock is held; puzzle editing is available before a round starts.'),
    step('eyes','#discovery-trail','Investigate all five eyes','Select an eye to inspect its theories and evidence. Everyone may help at any eye, even if it is not their team’s home eye.'),
    journal(),
    step('theories','.crew-theories','Check evidence before sealing',votingText(mode,true)),
    worlds(),witness(),council(),
  ];

  return [
    step('eyes','#discovery-trail','Choose an eye to investigate',paused?'The host controls when the encounter begins or resumes. While you wait, read the theories; your team may help at any of the five eyes.':'Select an eye to investigate. Your team has a home eye, but you can help at any eye that is not yet sealed.'),
    step('compose','#emoji-keyboard','Build a signal with three choices',paused?'Choose one colour, one shape and one to three pulses when the host starts or resumes the clock. The keyboard is disabled while the clock is held.':'Choose one colour, one shape and one to three pulses. Arrow keys move within each group; the text command below shows your selected signal.'),
    step('send','#send-signal',mode==='host'?'Ask the host to run your experiment':'Send one experiment',paused?'Wait for the host to start or resume before sending. Moving through this guide does not submit anything.':mode==='host'?'Request experiment sends your signal for host approval. It spends no experiment until the host approves it; moving through this guide does not submit it.':'Send experiment records your signal and its result in the shared journal. Each eye has a limited test budget; moving through this guide does not submit anything.'),
    journal(),
    step('theories','.crew-theories','Earn a vote, then compare theories',votingText(mode)),
    step('hint','.room-help','Ask for help when you need it',paused?'The host holds the clock. When the encounter runs, Ask host for a nudge requests help; the host decides when to share it.':'Ask host for a nudge requests help from the streamer. You can also link existing journal evidence to earn a vote without spending a new experiment.'),
    worlds(),witness(),council(),
  ];
}

// Targets here are resolved inside the already-open dialog. Moving through a
// guide never opens an external authorization page, changes a vote or publishes.
export function guideDialogSteps(dialogId,state) {
  const host=!!state?.isHost,member=!!state?.me,canChat=host||member;
  switch(dialogId) {
    case 'domain-dialog': return [
      step('domain-select','#domain-gallery','Choose a world to inspect','Select one of the six domain cards to read about that world and its sigil. This selection previews a choice; it does not cast a team vote.'),
      step('domain-preview','#domain-preview-button','Preview in your own browser','Explore this world changes the scene in your own browser. Your team’s home stays unchanged until a vote settles a new home.'),
      step('domain-room','#domain-enter-chamber','Visit its optional room',member?'Enter this room opens its three-landmark relay. Your team shares its progress; visiting does not change your team’s home.':'Enter this room lets you inspect its landmarks. Join a viewer seat before tuning; hosts and spectators cannot tune from their watching seat.'),
      member?step('domain-vote','#domain-vote-button','Vote for your team’s home','Vote for this home records one replaceable vote from your seat. An outright lead settles the home; tied votes keep the current world.')
        :step('domain-observe','#domain-team-context','Team votes need a viewer seat','You can preview worlds without voting. Join a viewer seat to vote for that seat’s own team home.'),
    ];
    case 'chamber-dialog': return [
      step('chamber-inspect','#chamber-landmarks','Inspect one of three landmarks','Select a landmark to compare its current phase with its target phase. Keys 1, 2 and 3 select the landmarks when you are in this room.'),
      step('chamber-forecast','.chamber-forecast','Check the linked effect first','The forecast shows the phases that the next tune would produce. A tune may change more than one landmark, so compare all three targets before acting.'),
      member?step('chamber-tune','#chamber-tune','Tune when you choose','The tune button changes the shared room for your team and fixes your research team for this round. This optional relay can be used while the main clock is held; the guide does not tune anything.')
        :step('chamber-observe','#chamber-role-note','This seat can inspect the room','Hosts and spectators may inspect the relay. Join a viewer seat to tune your own team’s room; reading this guide makes no changes.'),
      step('chamber-atlas','#chamber-portals','Visit the other rooms · optional','Use the atlas to visit the other five domain rooms and collect their memories. Visits do not change the team home, and the close button returns to the investigation.'),
    ];
    case 'domain-lounge': return [
      step('lounge-domain','.lounge-domains','Choose where to gather','Select a domain lounge to visit its conversation and revealed meme wall. This visit changes your local view, not your team’s settled home.'),
      step('lounge-sound','.lounge-sound-controls','Set your own atmosphere · optional','Music starts only when you enable it, and volume is yours to control. Pause atmosphere stops local motion; system reduced-motion settings are respected.'),
      step('lounge-tabs','.lounge-tabs','Switch between conversation and memes','Conversation shows this domain’s messages. Meme wall shows revealed, host-approved Council memes from this domain; it is not an unmoderated upload wall.'),
      step('lounge-participate','.lounge-conversation',canChat?'Choose what to share':'Watching is welcome',!canChat
        ? 'You can read messages and approved memes without joining. Join this expedition to chat opens the viewer name form; spectators cannot send messages.'
        :state.lounge?.enabled===false
          ? 'The host has paused lounge chat, so messages cannot be sent right now. You can still read the room and use your local atmosphere controls.'
          :host
            ? 'You can send a message to this expedition and use the host controls to pause chat or clear this domain’s messages. Messages may appear on broadcast; Next does not send or clear anything.'
            : 'Type a thought and choose Send only when you want to share it with the expedition. Messages may appear on broadcast, and you can remove your own message; Next does not send anything.'),
    ];
    case 'room-twitch-dialog': {
      if(!host&&!state?.canRelay) return [
        step('twitch-permission','h2','A host or captain connects their channel','Only the host or an appointed streamer captain can relay a Twitch channel here. Other viewers can participate through the browser invite.'),
        step('twitch-close','[data-close="room-twitch-dialog"]','Return to the expedition','Close this window to keep watching or using your browser seat. This guide will not authorize an account for you.'),
      ];
      return [
        step('twitch-saved','#twitch-connect-help','Connect once on this browser','The server keeps Twitch credentials encrypted; you do not enter a client secret or access token here. A valid saved sign-in restores automatically after refresh for up to seven days.'),
        step('twitch-authorize','#room-twitch-form button[type="submit"]','Authorize only when you are ready','Connect securely with Twitch opens Twitch’s sign-in and permission flow. Read and approve it yourself if you want the connection; Next only explains this button.'),
        step('twitch-status','#room-twitch-status','Check your connection','This status explains whether chat is connected, restoring, or needs attention. Retry saved connection checks an existing sign-in without asking you to paste credentials.'),
        step('twitch-disconnect','#room-twitch-disconnect','Forget this browser when finished','Disconnect stops chat and removes this browser’s saved Twitch sign-in. Use it on a shared computer. Browser teams and host controls continue independently.'),
      ];
    }
    case 'invite-dialog': return [
      step('invite-link','#invite-url','This is the viewer link','This read-only field contains the room’s viewer invitation, without your private host credentials. A seven-character room code can also be shared.'),
      step('invite-copy','#copy-invite','Copy when you want to share','Copy viewer link puts the invitation on your clipboard. You choose where to send it; moving through this guide does not send a message.'),
      step('invite-access','.field-note','Check who can enter the Site','The room invitation does not override the Site’s visitor access settings. Rooms last 24 hours; give your viewers Site access as well as the room link.'),
    ];
    case 'puzzle-editor': {
      if(!host||state?.game?.status!=='idle') return [
        step('editor-permission','#puzzle-editor-title','Editing belongs to the host before a round','Only the host can publish a puzzle before the encounter begins. Once the round has started, its rules stay locked until a new round.'),
        step('editor-close','[data-close="puzzle-editor"]','Close the private answer editor','This window contains puzzle answers. Close it before showing the public game or recording a viewer-facing screen.'),
      ];
      return [
        step('editor-eye','#editor-eye','Choose which eye to design','Select one of the five eyes to edit its draft. This window contains private answers, so keep it out of your public broadcast.'),
        step('editor-options','#editor-options','Write fair theory options','Choose the exact signal rule for each option and optionally add a short label. Players still see the precise rule descriptions so they can compare evidence.'),
        step('editor-correct','#editor-correct','Mark the intended correct option','Choose the correct option for this eye. All five correct rules must leave exactly one common signal, with every eye adding a necessary clue.'),
        step('editor-publish','#publish-puzzle','Validate before publishing','Validate & publish all five eyes checks and publishes your draft if it is valid. The guide does not publish; close this private editor before showing your screen.'),
      ];
    }
    case 'room-guide': return [
      step('field-control','.room-guide > p:nth-child(1)','Read who controls the encounter','This section explains Viewers lead, Shared control and Host-led participation. Your room’s mode banner tells you which rules apply right now.'),
      step('field-keyboard','.room-guide > p:nth-child(4)','Use buttons or chat commands','The emoji keyboard composes a colour, shape and pulse count. Arrow keys move within groups; Ctrl or Command plus Enter sends only when the game allows it.'),
      step('field-goal','.room-guide > p:nth-child(6)','Five discoveries lead to one signal','The crew investigates five eyes, then combines their rules into a final signal. Evidence contributions, the current control mode and the team requirement determine who can vote and confirm.'),
      step('field-close','[data-close="room-guide"]','Return whenever you are ready','Close the field guide to return to the application. You can reopen it from the header, and guided mode remains available when you want another walkthrough.'),
    ];
    default:return [];
  }
}
