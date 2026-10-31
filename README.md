# Fivefold Veil

**Five discoveries. One shared signal.** A cooperative browser/Twitch deduction game built with Codex under the user's creative direction, using the user's original guardian and forest artwork.

## Team rooms

Open **Enter team rooms** on the home page, or `/teams`. The host creates an expedition; viewers follow an invite or enter a seven-character code and a display name. Team and emblem choices are optional: automatic placement balances browser seats across the five teams. Signals use an accessible emoji keyboard.

### Clear participation and optional help

### Streamer control and authored puzzles

The streamer selects a control mode at room creation, or changes it while the clock is idle/held through **Streamer controls & puzzle editor**. Existing rooms default to Shared control. Mode changes clear pending experiment requests without spending experiments; modes survive resets.

- **Viewers lead:** viewers run experiments and vote. An eligible contributor can confirm the leading vote at that eye; an evidence contributor can confirm the leading final binding. Ties remain blocked. Twitch commands are `!seal crown` and `!confirmbind`. The host retains pause/reset and moderation controls.
- **Shared control:** viewers experiment and vote; only the host confirms the leading votes. This preserves the previous behavior.
- **Host-led:** viewer tests enter a queue, including Twitch `!test` commands. The host approves or declines each one. Approval runs the experiment as the requesting viewer and earns that viewer evidence. One pending experiment per viewer, at most 24 per room; browser viewers may withdraw. Normal test budgets and cooldowns still apply at approval. Votes are advisory: the host selects a theory card and seals their own choice after evidence exists, then selects the final signal with the keyboard. Wrong decisions still add fractures. Team contribution requirements still apply.

Before a round starts, **Write theories & options** opens a private answer-bearing editor for all five eyes. The host selects four distinct rules per eye, writes optional short labels, and chooses the correct option. Exact logic descriptions remain visible to viewers alongside labels. This is a structured signal-rule editor, not an arbitrary natural-language quiz interpreter. Publication validates exactly one common final signal and requires every eye to contribute a necessary constraint. Invalid drafts leave the current puzzle unchanged. Rule IDs and correct-option mappings are returned only to authenticated hosts while the round is idle, never to spectators or members. Once started, rules cannot change, even while paused. Reset retains an authored design; **Use a new generated puzzle** replaces it while idle. Do not capture the answer editor on stream.

### Joining and guidance

- **Just watch** opens the public room projection without creating a member, earning votes, or storing a guest key. It still respects hosted Site access. Watchers can join later.
- **Audience view** hides participation and host controls while retaining the guardian, discoveries and journal. Return to full view to operate the room. It is a same-window capture layout, not an independently authenticated OBS overlay.
- A next-step panel follows the round state and your evidence eligibility. The recap shows discoveries, experiments, the latest result and its remaining theories. New arrivals are directed toward evidence citation when possible.
- **Small crew** permits final binding with evidence from one team. **Team expedition** retains the two-team requirement. The host chooses at creation; settings survive resets, and older rooms retain the two-team rule. Either mode still requires all five discoveries.
- Viewers may **Ask host for a nudge**, or use `!hint crown` through the Twitch relay. Requests are limited to one pending request per member/eye and one new request every 30 seconds; request counts show beside the eyes. Requests do not earn votes or lock team membership.
- Only the host shares a nudge. Suggested experiments split the remaining public hypotheses; they do not inspect the hidden answer, submit an experiment or award evidence. A nudge is cleared when a new test or seal changes that eye, when the host dismisses it, or on reset. Hints and pending requests synchronize through room storage.
- Personalization and world previews are collapsed by default. The six domain rooms and their progress remain available.

- Room IDs are reserved uniquely in the database. Each of five team IDs combines room code and team name. Member IDs identify browser seats.
- Rooms last 24 hours. Host control keys are separate from public join links. The server stores hashed keys; API responses never disclose other members' keys or the host key.
- Host keys are saved in this browser's local storage. Guest keys use this tab's session storage, so refreshing keeps the seat. A new tab/browser can create another guest seat. These IDs do not establish one unique human or verify a Twitch login.
- The clock, rules, evidence, votes, and outcomes live on the server. Browser views poll every three seconds while visible, and refresh after actions. This is synchronized polling, not a WebSocket transport.
- The D1 document store uses version-checked writes and bounded retries to avoid losing simultaneous submissions. Duplicate request IDs return the previous result rather than spending another test.
- Each team has a home eye; members can help investigate any eye. A member's team is fixed after their first contribution until a new round.
- Each eye has six unique experiments. A person can test an eye twice per rolling 30 seconds, with a 1.8-second contribution cooldown.
- A recorded test earns a vote at that eye. Late joiners may instead cite an existing observation that contradicts one of the public theories. Correct citations earn a vote without spending an experiment, even after all six test slots are used.
- After five seals, contributors propose a signal satisfying all five revealed rules. The selected mode requires evidence from one or two teams before the host binds. This counts team memberships, not independently verified human identities.
- Three incorrect seals/bindings or a timeout end the encounter. Reset preserves room/member/team IDs while clearing the round's evidence and votes.
- The current member limit is 200 seats per room. This is a bound, not a verified load-test claim.

Public room state contains display names, member/team IDs, avatars, evidence, votes and discoveries. Keep personal information out of display names. Live-room seeds remain server-side until the encounter ends. Local solo rehearsal exposes its seed deliberately for replay.

The emoji keyboard uses text labels and pressed states alongside glyphs. Arrow keys change choices within each group; Ctrl/Cmd + Enter sends the selected signal. Room nudges are host-controlled; solo rehearsal retains direct assistance for learning.

## Six team domains

Each team chooses a shared home: **Taiga / Tundra**, **Corrupted Universe**, **Lunar Waters**, **Temple of Fire**, **Frozen Frontier**, or **Dark Sea of Stars**. Open **Explore six domains** to preview the art, atmosphere, guardian tint, panel shapes and keyboard palette. Previews affect only your own browser; **Return to team home** leaves a preview.

Every member has one replaceable domain ballot for their own team. An untied leading count selects the home; ties retain the incumbent. Domain votes require no experiment or earned theory vote. Homes and ballots persist across refreshes and new rounds for the room's lifetime. Changing research teams clears that member's previous domain ballot. Hosts inspect each team's saved home but do not vote as hosts. Team members keep their own home while investigating other eyes. Domains change presentation, not rules or difficulty.

Six compressed WebP environments were generated with the built-in image-generation tool. Exact prompts and source/final paths are recorded in `DOMAIN_ART.md`. The user's original guardian remains a separately credited asset.

## Interactive domain rooms

Choose **Enter [domain] room**, or enter a room from the domain explorer. Each team has six shared chambers with separate IDs and progress: **The Listening Grove**, **The Fracture Observatory**, **The Moonwell**, **The Ember Stair**, **The Threefold Crossing**, and **The Last-Light Anchorage**. The room atlas lets teammates visit any of their six chambers without changing the voted home.

Select one of three SVG landmarks, inspect the predicted phases, then tune it. Match all three displayed targets to recover the room's authored memory. Each tune and its contributor are server-saved; teammates see the same state. Keys 1–3 select landmarks, and standard Tab/Enter/Space work on the controls. Browser guests may tune only their own team's rooms; hosts spectate. Tuning fixes team membership for that round.

New chambers have six relay rules: Taiga advances itself and the next landmark; Corrupted reverses itself and advances the next; Lunar advances itself and the previous; Fire advances itself and all higher-numbered landmarks; Frontier advances itself and reverses the next; Star Sea reverses itself and advances both others. Phases wrap through 1–3 in either direction. Targets are generated through legal moves, so every challenge is solvable. Stored original chambers retain their original rule until the next round. The expedition passport collects each recovered memory, with a six-horizon completion title when all six are solved.

Chamber IDs combine room, team, domain and round. Progress survives refreshes and home changes; a new round clears room memories and gives chambers new round IDs. These optional activities do not spend experiments, earn theory-vote eligibility, or count toward the main encounter's two-team evidence requirement. **Exploring does not pause a running encounter**; its clock remains visible in the room.

**Copy room link** produces a viewer URL with room, suggested team and domain, without host credentials. After joining, the link opens that domain room. A saved viewer seat keeps its existing team; the link cannot transfer it or override Site access. Room links expire with the expedition.

The grove layers the user's supplied forest image with new SVG landmarks. All rooms reuse the existing sandboxed guardian iframe. Opening a chamber suspends the covered WebGL scene; the chamber uses image/SVG/CSS layers, with reduced-motion and still-effects support, and adds no rendering framework. `CHAMBERS` in `public/chamber-engine.js` records authored place names, layouts and memories. The linked-dial mechanic has familiar puzzle precedents; no claim of unprecedented or exclusive mechanics is made.

## Local setup

Requires Node.js **22.13 or newer**. The full-stack project uses the supported Sites Vinext/Cloudflare starter and D1. Browser gameplay assets are plain HTML/CSS/JavaScript.

```powershell
npm.cmd ci
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_last_gladiator.sql
npm.cmd start -- --port 4173
```

Open `http://localhost:4173/teams`. Apply each local migration once, in order. The generated `dist/` directory is build output; edit `public/`, `server/`, `app/`, or `db/`, then rebuild. Stop the built preview before rebuilding on Windows to release file locks. Local and hosted databases are separate. Sites applies hosted migrations when publishing.

For a lightweight **local rehearsal** without the framework runtime:

```powershell
node server.mjs
```

This serves `public/` on loopback port 4173 and stores rooms for 24 hours in a local SQLite database under `.openai/local/rehearsal/`. Room codes survive process restarts. This database is separate from hosted rooms and the built D1 preview. Do not start both servers on the same port.

## Twitch host relay

### Witness Seat and discovery replay

The host can enable **The Witness Seat** in a room. After a correct seal, useful experiments and pre-seal evidence citations earn one optional spotlight message per contributor per round. Browser viewers submit through the room; Twitch viewers use `!spotlight your message` (visible in Twitch chat). The in-game queue is private to the host and requesting browser viewer until host approval. Requests expire in five minutes; approved messages display for 60 seconds. The host can dismiss messages or disable the feature. Discovery archives show experiments, eliminated theories and contribution credit, and hosts can display a recap in Audience view for 20 seconds. See [feature direction](FEATURE_DIRECTION.md) for constraints and future ideas.

The team-room Twitch adapter also subscribes to chat deletion/clear events with the existing `user:read:chat` scope. These remove matching spotlight text; the host must remain connected for moderation to synchronize. Browser guests are not linked to Twitch identities. Live broadcast validation remains required.

1. Verify the broadcaster's Twitch email, enable 2FA, and register a Public application in the [Developer Console](https://dev.twitch.tv/console/apps).
2. In the team's host view, open **Connect Twitch**. Add its exact displayed redirect URL to the Twitch app. Team-room and solo-rehearsal paths have different callback URLs.
3. Paste the public Client ID, authorize as the account owning the channel, and wait for the connected channel name.
4. Start/resume the encounter. The host's browser validates Twitch identity/scope and relays recognized commands to its room using the private host credential. Twitch access tokens remain in browser memory; refreshing requires reconnecting.

```text
!team crown
!domain corrupted
!tune 2
!test crown blue circle 2
!test crown 🔵 ⚪ 2️⃣
!cite crown 2 b
!solve crown a
!focus root
!hint crown
!bind amber circle 3
```

`!cite crown 2 b` claims that observation #2 contradicts Theory B at Crown. The engine checks the claim. PASS and FAIL tests both count as useful evidence.

`!domain` votes for the relayed participant's own team home. Domain IDs: `taiga`, `corrupted`, `lunar`, `fire`, `frontier`, `star-sea`. A Twitch command cannot choose another team's home.

`!tune 1`, `!tune 2` and `!tune 3` tune a landmark in that participant's **saved home** chamber. Browser visitors may visit other chambers through the atlas. Live Twitch validation of this command remains required.

Eye names: crown/dusk/heart/dawn/root. Colours: red/blue/amber. Shapes: circle/triangle/square. Pulses: 1–3. Theories: a–d. Emoji alternatives: 🔴/🔵/🟡, ⚪/🔺/⬜, 1️⃣/2️⃣/3️⃣. Unrelated chat is ignored. Without an explicit eye, commands use that Twitch participant's focus, otherwise their team's home eye.

Browser guests and Twitch relay accounts are **separate identities**. They are not linked, and the same person could use both. This is a cooperative prototype, not a Sybil-resistant ranked or prize competition. Server control trusts the host's relay; it does not independently authenticate each Twitch viewer. The adapter requests read-only `user:read:chat`, filters duplicate Twitch deliveries, and handles scope/client validation, reconnect handoff, backoff and revocation. An interrupted host Twitch connection pauses an active room; explicitly resume after reconnecting.

References: [Twitch app registration](https://dev.twitch.tv/docs/authentication/register-app/), [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow), [EventSub](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

**Live Twitch and OBS validation remain required.** Tests use mocked Twitch services. Browser room testing does not prove a live broadcast or real independent viewers.

## Hosting and access

The same Sites project is retained in `.openai/hosting.json`; it now declares D1 binding `DB` instead of static hosting. The existing owner-private audience is preserved. A join code does not bypass Site access; external viewers need authorized access to the Site before joining. Do not describe the current private preview as publicly available to all Twitch viewers.

Capture the host browser window in OBS for the arena/controls, or a joined viewer browser for the keyboard and shared investigation. Separate room browsers synchronize through the server. The legacy solo rehearsal's **Stream view** remains a same-window capture layout, independent of room state.

## Solo rehearsal and art

The home page retains the original local rehearsal: replay codes, paused browser-local recovery, sample contributors, informative test suggestions, journal filtering/export, two visual domains, timer and five-eye final binding. It is separate from server-backed rooms. No simulated researchers are injected into team rooms.

The Primordial Shade HTML/SVG is isolated in a sandboxed iframe with a restricted CSP. It receives public pause/focus/seal flags and a domain hue only. The original source is unchanged; `tools/import-primordial.mjs` records adaptations. The forest image is bundled unchanged. Read `IP_NOTES.md` for asset provenance and mechanic precedents. Custom interface code uses domain-specific palettes, system fonts, and a five-eye mark; no franchise artwork, logos, music or proprietary font files were imported.

Effects respect reduced motion, pause offscreen/hidden and when the encounter is held/finished, and retain a still fallback. The WebGL buffer is capped at 900 × 600 pixels. Visual frame rate does not control the game clock.

## Checks

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
```

Tests cover deterministic rule generation, parsing including emoji, timing, voting, citations after filled experiment budgets, host/member boundaries, source spoofing prevention, concurrent joins, idempotency, persistence hydration, complete two-team outcomes, room expiry, reset IDs and mocked Twitch transport. Browser QA checks separate host/guest tabs, emoji actions, cross-team citations/votes, a sealed discovery, recovery after a D1 preview restart, and responsive presentation.

## Source map

- `public/`: solo rehearsal, room UI, emoji keyboard, game engine, art and Twitch adapter
- `server/rooms.js`: room service, public/private state projections and memory/D1 stores
- `app/`: root HTML/API routes; `worker/` and `scripts/`: supported Sites runtime/build integration
- `db/schema.ts`, `drizzle/`: database schema and immutable generated migrations
- `tests/`: Node test suite; `SUBMISSION.md`: remaining contest work

Remaining product work includes real Twitch playtesting, broader load/accessibility tests, optional verified browser/Twitch linking, account-level recovery and a publicly accessible distribution plan. The current research report describes version 0.2.0; its participation limits do not describe the new citation-enabled room mode.

## Council of Streamers

Team rooms now include optional 2–5 captain theory councils and live meme intermissions, with private review, a shared audience stage, equal-community voting, and free confidence-point predictions. See [COUNCIL_GUIDE.md](COUNCIL_GUIDE.md) for host setup, commands, scoring, moderation and current verification limits. Streamers keep their existing broadcasts; captains may relay their own Twitch chats. Browser and Twitch identities remain separate.

## Domain lounges

Open **Enter domain lounge** from an expedition. Six shared conversations have distinct scenery, sigils and original synthesized ambience. Music starts on each listener’s explicit click and stops on close or a hidden tab. The host can pause chat, remove messages or clear a domain. Latest 24 messages per domain stay with the room for its 24-hour lifetime.

The meme wall displays that domain’s approved Council submissions after the reveal. Hosts can feature an entry on the Council stage. **Copy lounge invite** opens a spectator view at the selected domain.

Taiga and Lunar Waters also offer **Explore original 3D grove**, reusing the owner’s Lunar Domain source. The optional Three.js bundle is loaded on request, rendered at a bounded frame rate and removed on exit. Its MIT attribution is retained in `public/assets/sanctuary/vendor/LICENSE`. Scenic backdrops stay available without starting the grove.
