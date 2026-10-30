# Fivefold Veil

**Five discoveries. One shared signal.** A cooperative browser/Twitch deduction game built with Codex under the user's creative direction, using the user's original guardian and forest artwork.

## Team rooms

Open **Enter team rooms** on the home page, or `/teams`. The host creates an expedition; viewers join a seven-character room code, choose an avatar/name/team, and compose signals with an accessible emoji keyboard.

- Room IDs are reserved uniquely in the database. Each of five team IDs combines room code and team name. Member IDs identify browser seats.
- Rooms last 24 hours. Host control keys are separate from public join links. The server stores hashed keys; API responses never disclose other members' keys or the host key.
- Host keys are saved in this browser's local storage. Guest keys use this tab's session storage, so refreshing keeps the seat. A new tab/browser can create another guest seat. These IDs do not establish one unique human or verify a Twitch login.
- The clock, rules, evidence, votes, and outcomes live on the server. Browser views poll every three seconds while visible, and refresh after actions. This is synchronized polling, not a WebSocket transport.
- The D1 document store uses version-checked writes and bounded retries to avoid losing simultaneous submissions. Duplicate request IDs return the previous result rather than spending another test.
- Each team has a home eye; members can help investigate any eye. A member's team is fixed after their first contribution until a new round.
- Each eye has six unique experiments. A person can test an eye twice per rolling 30 seconds, with a 1.8-second contribution cooldown.
- A recorded test earns a vote at that eye. Late joiners may instead cite an existing observation that contradicts one of the public theories. Correct citations earn a vote without spending an experiment, even after all six test slots are used.
- After five seals, contributors propose a signal satisfying all five revealed rules. At least two teams must have contributed evidence before the host can bind. This requires two team memberships, not independently verified human identities.
- Three incorrect seals/bindings or a timeout end the encounter. Reset preserves room/member/team IDs while clearing the round's evidence and votes.
- The current member limit is 200 seats per room. This is a bound, not a verified load-test claim.

Public room state contains display names, member/team IDs, avatars, evidence, votes and discoveries. Keep personal information out of display names. Live-room seeds remain server-side until the encounter ends. Local solo rehearsal exposes its seed deliberately for replay.

The emoji keyboard uses text labels and pressed states alongside glyphs. Arrow keys change choices within each group; Ctrl/Cmd + Enter sends the selected signal. Room play has no informative-test suggestion button. The solo rehearsal keeps assistance for learning.

## Local setup

Requires Node.js **22.13 or newer**. The full-stack project uses the supported Sites Vinext/Cloudflare starter and D1. Browser gameplay assets are plain HTML/CSS/JavaScript.

```powershell
npm.cmd ci
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_last_gladiator.sql
npm.cmd start -- --port 4173
```

Open `http://localhost:4173/teams`. Apply each local migration once, in order. The generated `dist/` directory is build output; edit `public/`, `server/`, `app/`, or `db/`, then rebuild. Stop the built preview before rebuilding on Windows to release file locks. Local and hosted databases are separate. Sites applies hosted migrations when publishing.

For a lightweight **in-memory rehearsal** without the framework runtime:

```powershell
node server.mjs
```

This serves `public/` on loopback port 4173 and implements the same room API with a memory store. All of those rooms disappear when that process stops. Use the built D1-backed preview for persistence testing. Do not start both servers on the same port.

## Twitch host relay

1. Verify the broadcaster's Twitch email, enable 2FA, and register a Public application in the [Developer Console](https://dev.twitch.tv/console/apps).
2. In the team's host view, open **Connect Twitch**. Add its exact displayed redirect URL to the Twitch app. Team-room and solo-rehearsal paths have different callback URLs.
3. Paste the public Client ID, authorize as the account owning the channel, and wait for the connected channel name.
4. Start/resume the encounter. The host's browser validates Twitch identity/scope and relays recognized commands to its room using the private host credential. Twitch access tokens remain in browser memory; refreshing requires reconnecting.

```text
!team crown
!test crown blue circle 2
!test crown 🔵 ⚪ 2️⃣
!cite crown 2 b
!solve crown a
!focus root
!bind amber circle 3
```

`!cite crown 2 b` claims that observation #2 contradicts Theory B at Crown. The engine checks the claim. PASS and FAIL tests both count as useful evidence.

Eye names: crown/dusk/heart/dawn/root. Colours: red/blue/amber. Shapes: circle/triangle/square. Pulses: 1–3. Theories: a–d. Emoji alternatives: 🔴/🔵/🟡, ⚪/🔺/⬜, 1️⃣/2️⃣/3️⃣. Unrelated chat is ignored. Without an explicit eye, commands use that Twitch participant's focus, otherwise their team's home eye.

Browser guests and Twitch relay accounts are **separate identities**. They are not linked, and the same person could use both. This is a cooperative prototype, not a Sybil-resistant ranked or prize competition. Server control trusts the host's relay; it does not independently authenticate each Twitch viewer. The adapter requests read-only `user:read:chat`, filters duplicate Twitch deliveries, and handles scope/client validation, reconnect handoff, backoff and revocation. An interrupted host Twitch connection pauses an active room; explicitly resume after reconnecting.

References: [Twitch app registration](https://dev.twitch.tv/docs/authentication/register-app/), [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow), [EventSub](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

**Live Twitch and OBS validation remain required.** Tests use mocked Twitch services. Browser room testing does not prove a live broadcast or real independent viewers.

## Hosting and access

The same Sites project is retained in `.openai/hosting.json`; it now declares D1 binding `DB` instead of static hosting. The existing owner-private audience is preserved. A join code does not bypass Site access; external viewers need authorized access to the Site before joining. Do not describe the current private preview as publicly available to all Twitch viewers.

Capture the host browser window in OBS for the arena/controls, or a joined viewer browser for the keyboard and shared investigation. Separate room browsers synchronize through the server. The legacy solo rehearsal's **Stream view** remains a same-window capture layout, independent of room state.

## Solo rehearsal and art

The home page retains the original local rehearsal: replay codes, paused browser-local recovery, sample contributors, informative test suggestions, journal filtering/export, two visual domains, timer and five-eye final binding. It is separate from server-backed rooms. No simulated researchers are injected into team rooms.

The Primordial Shade HTML/SVG is isolated in a sandboxed iframe with a restricted CSP. It receives public pause/focus/seal flags only. The original source is unchanged; `tools/import-primordial.mjs` records adaptations. The forest image is bundled unchanged. Read `IP_NOTES.md` for asset provenance and mechanic precedents. Custom interface code uses navy/ivory/gold, system fonts, and a five-eye mark; no franchise artwork, logos, music or proprietary font files were imported.

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
