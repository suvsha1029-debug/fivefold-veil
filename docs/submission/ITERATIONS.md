# From Signal Lab to Fivefold Veil

This retrospective follows the project conversation and repository records. It describes development decisions, not an independent user study or proof of market exclusivity.

## 1. Start with a shared mystery

The initial Signal Lab idea gave Twitch viewers a mystery machine to investigate together. The creator supplied the eye/guardian artwork and forest scene and asked for an experience that audiences could participate in, rather than only watch.

## 2. Research the surrounding work

The project compared collaborative chat puzzles and hidden-rule deduction games. The recorded precedents include Puzzles With Chat, Zendo, Things in Rings, and Things on Strings. These comparisons showed that collective solving and test-and-infer mechanics already existed. The design focus became a particular combination: five investigations, persistent shared evidence, contribution-based voting, and a final signal that needs all five discoveries. Sources and limitations are in [IP_NOTES.md](../../IP_NOTES.md).

The conversation also raised questions about streamer pain points and Reddit/forum research. This retrospective does not claim a measured survey, representative user interviews, or findings without a retained source record.

## 3. Combine identity with cooperation

The creator requested browser room codes, teams, an emoji input keyboard, and distinct domain homes. Six creator-supplied sigils and domain scenes gave those teams an identity. The five-eye investigation remained the core game; choosing a domain changes presentation, not the rules or difficulty.

## 4. Give streamers control

Feedback led to viewer-led, shared, and host-led modes, with server-enforced permissions. Streamers can choose the pace, approve experiments, and author structured theory options. The council, meme lounge, and optional Witness Seat extend the shared room; they are not claims to have invented polls, meme contests, or chat spotlights.

## 5. Make participation clearer

Requests about confusing controls and overlapping UI led to layout work, clearer next steps, step-by-step guidance, readable mode, and reduced effects. Late joiners can cite existing evidence. These changes address creator feedback and technical checks; broader independent accessibility and playtesting remain outstanding.

## 6. Test, discover failures, and fix them

The creator reported that reloading the host page lost its Twitch connection. Codex assisted the server-side remembered-session implementation, encrypted token storage, refresh handling, and regression tests. A real deployment exposed an unsupported redirect mode. The implementation changed to manual redirect handling that rejects redirects rather than forwarding credentials.

The 2 November production check verified authorization, reload restoration, and Disconnect. The earlier live chat command receipt remains separate evidence: it does not prove a new command after the authentication change or a complete multi-viewer round. See [QA_REPORT.md](../../QA_REPORT.md) and [Codex development capture](../CODEX_DEVELOPMENT_CAPTURE.md).

## How to describe the contribution

“We started with Signal Lab, researched existing collaborative puzzles, and refined the idea through repeated feedback. Fivefold Veil combines shared evidence, five linked discoveries, team domains, and flexible streamer control. My artwork and direction shaped the experience; Codex helped implement, test, and debug it.”
