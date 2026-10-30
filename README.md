# Signal Lab

A collaborative Twitch mystery built for the Codex × TwitchCon hackathon. Viewers send experiments through Twitch chat, compare the machine's results, and vote for the rule that explains them. The streamer decides when to lock the leading theory.

## Run locally

Requires Node.js 22 or newer. There are no runtime dependencies or install step.

```powershell
cd D:\twitchcon-signal-lab
node server.mjs
```

Open <http://localhost:4173/>. The development server binds to the local computer only and serves files exclusively from `dist/`.

## Try the game

1. Click **Start practice**.
2. Choose a colour, shape, and pulse count, then click **Test signal**.
3. Compare the PASS/FAIL evidence. Contradicted theories are eliminated automatically.
4. Click a remaining theory to cast your practice vote.
5. Click **Lock the leading theory** when you are ready.

**Add sample researcher** generates one explicitly labelled simulated experiment. Practice controls and sample researchers never send messages to Twitch. Practice and live case data are reset when switching modes.

Choose a three-, five-, or eight-minute case before starting. Each case allows eighteen unique experiments and ends after two incorrect locks. The circular timer around the guardian follows the engine's countdown and freezes when paused. The reset arrow clears the current case and returns to timer setup. Duplicate tests do not use the experiment budget. One vote per Twitch user; a new vote replaces their old one. Inputs from each user have a 1.8-second cooldown. Ties must be resolved before a theory can be locked. Paused or ended cases do not accept commands.

## Visual arenas

Choose **Aurora Glade** or **Crimson Rift** above the mystery machine. These change the atmosphere, not the secret rule or game difficulty. The forest reference and original Primordial Shade HTML artwork were provided by the user. The original artwork is rendered in a sandbox with isolated styling; it receives only an animation pause flag, never Twitch tokens, chat, or answers.

The WebGL atmosphere uses one drawing buffer capped at 900 × 600 pixels and draws at most about 30 times per second. Decorative rendering stops while the tab is hidden, the arena is off-screen, or the case is paused/finished. **Effects: still** freezes the guardian and atmosphere. The OS reduced-motion preference is respected automatically. A static scene remains when WebGL is unavailable. The countdown and game logic run independently from the visual renderer.

## Connect a real Twitch channel

1. Verify your Twitch email and enable two-factor authentication.
2. Go to <https://dev.twitch.tv/console/apps> and register an application. Use a **Public** client type if the console asks.
3. Add the exact OAuth Redirect URL shown in **Connect Twitch**. For the local server this is `http://localhost:4173/`. A hosted deployment has a separate redirect URL and must also be added if used.
4. Paste the app's **Client ID** into Signal Lab. Do not paste or create a client secret for this browser flow.
5. Authorize using the account that owns the channel you want to demonstrate. This first version listens to the signed-in account's own channel.
6. After the status reads **TWITCH CHAT**, click **Start live case**.
7. In your Twitch channel chat, send commands such as:

```text
!test blue circle 2
!test red triangle 1
!solve c
```

Supported colours: `red`, `blue`, `amber`. Shapes: `circle`, `triangle`, `square`. Pulse counts: `1`, `2`, `3`. Votes: `!solve a` through `!solve f`. Other chat messages are ignored.

The app uses Twitch's browser implicit OAuth flow and EventSub WebSockets with the single `user:read:chat` scope. It does not send chat messages. Access tokens are validated, removed from the address bar on receipt, and kept only in memory. The public Client ID and temporary OAuth state use session storage. Refreshing or closing the page clears authentication. Hourly token validation, duplicate-delivery filtering, connection handoff, retry backoff, and revocation handling are implemented. A connection interruption pauses the case; explicitly resume after reconnection.

References:
- <https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow>
- <https://dev.twitch.tv/docs/eventsub/handling-websocket-events/>
- <https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage>

## Show it on stream

Keep the connected game open in one browser window. Use **OBS Window Capture** for that window. **Stream view** hides setup and host controls; exit with the visible exit button or Escape to pause, resume, or lock a theory. This version does not synchronize separate browser/OBS instances: use Window Capture rather than opening an independent OBS Browser Source.

The app has no external fonts, analytics, game engines, paid services, or API inference requirements. User-provided art is bundled locally; the atmosphere and interface use HTML/CSS/SVG and a small WebGL shader.

## Validation

```powershell
npm.cmd run check
node --test
```

Tests cover command validation, timeouts and pause semantics, identification of all six rules, cooldowns, duplicate experiments, bounded experiment budgets, fair voting, ties, stale votes, win/loss, broadcaster-scoped EventSub subscriptions, message deduplication, token identity/scope validation, reconnect handoff, subscription failures, and revoked access.

**Live validation still required:** Sign in with a real Twitch application/channel, send actual chat commands, and record the working integration. Adapter tests use mocked Twitch responses and do not prove live authorization or Twitch connectivity. OBS capture and streaming performance must also be tested on the target computer.

## Files

- `dist/index.html`, `dist/style.css`: responsive interface and stream view
- `dist/engine.js`: game rules, timing, evidence, voting, and outcomes
- `dist/twitch.js`: OAuth and Twitch EventSub adapter
- `dist/app.js`: interface and lifecycle
- `dist/domain.js`, `dist/domain.css`: visual arenas, effects, and circular timer
- `dist/assets/primordial-shade.html`: adapted user-provided artwork with a motion-control bridge
- `dist/assets/aurora-forest.png`: unchanged user-provided forest reference
- `tools/import-primordial.mjs`: imports the original artwork without modifying the source file
- `server.mjs`: local static server
- `tests/`: Node built-in test suite
- `SUBMISSION.md`: submission checklist and proposed video script

## Scope of this first version

One broadcaster-operated case at a time; no database, multi-channel hosting, remote host control, or separate synchronized overlay. The secret is held in the broadcaster's browser; this is a cooperative stream experience, not a server-enforced competition. The current six mystery rules are a starting set to playtest and expand.
