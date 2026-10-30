# Fivefold Veil

**Five discoveries. One shared signal.** A cooperative Twitch mystery built with Codex under the user's creative direction. Viewers investigate five eyes of an original guardian, earn votes by contributing evidence, then combine five discoveries into a final binding signal.

This is a playable broadcaster-operated prototype. The Twitch adapter has mocked tests; real account authorization, viewer commands, and OBS capture still need a live test. Rehearsal contributors are clearly labelled simulations.

## Run

Node.js 22 or newer; no runtime dependencies or installation step.

```powershell
cd D:\twitchcon-signal-lab
node server.mjs
```

Open `http://localhost:4173/`. The server binds to loopback and serves only `dist/`.

## Play a rehearsal

1. Choose a case code and a 3-, 5-, 8-, or 12-minute timer; eight minutes is the default.
2. Click **Start practice** and select an eye: Crown, Dusk, Heart, Dawn, or Root.
3. Choose a signal's colour, shape, and pulses. **Suggest an informative test** prepares a test that separates remaining public theories; it does not use the secret answer or submit the test.
4. Send a test. Evidence eliminates contradicted theories. **Add sample researcher** contributes a labelled simulated test. Switch rehearsal identity to try voting as one of those contributors.
5. After contributing at that eye, select a theory to vote. The host seals the leading theory; ties require agreement. Repeat at the other eyes.
6. Sealing five eyes unlocks a separate binding phase. Find the one signal satisfying all five revealed rules, propose it, and commit the leading proposal to win.

Every generated case has exactly one common signal. Removing any eye's rule leaves multiple possibilities, so all five discoveries matter. The seed is deterministic for this version; case links share the puzzle, not progress or authentication.

Each eye permits six unique experiments. A contributor can send two experiments per eye in a rolling 30-second window, with 1.8 seconds between contributions. Duplicate signals at the same eye use no budget. Each person has one replaceable vote per eye and must have contributed an experiment there. Final binding votes require any experiment contribution. Contradictory evidence removes stale votes. Three wrong seals/bindings, or a timeout, end the encounter. Paused and ended encounters reject commands.

## Twitch setup and live test

1. Verify the Twitch account's email and enable 2FA.
2. Register an application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Use a Public client type if prompted. A browser flow cannot protect a client secret.
3. Add the exact OAuth Redirect URL shown in **Connect Twitch**. Local and hosted URLs must each be registered if both are used.
4. Paste the public **Client ID** into the game. Never paste a client secret. Authorize as the broadcaster; this prototype reads the signed-in account's own channel.
5. When **TWITCH CHAT** is shown, start the encounter. Ask real viewers to test, vote, and bind:

```text
!test crown blue circle 2
!solve crown a
!focus root
!test red triangle 1
!bind amber square 3
```

Eye names: `crown`, `dusk`, `heart`, `dawn`, `root`. Colours: `red`, `blue`, `amber`. Shapes: `circle`, `triangle`, `square`. Pulses: `1`–`3`. Theories: `a`–`d`. Omitting the eye uses that viewer's `!focus`, otherwise Heart. A viewer's focus does not change the host's selected eye. Other chat messages are ignored.

The app uses implicit OAuth with `user:read:chat` and EventSub WebSockets. Tokens are validated for client, identity, and scope, removed from the URL immediately, and kept only in memory. No chat is sent by the app. The public Client ID and temporary OAuth state use session storage. Refreshing requires reconnecting. The adapter includes duplicate-delivery filtering, hourly token validation, reconnect handoff/backoff, and revocation handling. Connection interruptions pause the encounter; resume explicitly after reconnection.

Connecting from rehearsal starts fresh Twitch evidence. Reconnecting the same channel can continue its paused local draft. Changing channel or returning to practice clears the encounter, so simulated contributors are not presented as live viewers.

Official references: [registration](https://dev.twitch.tv/docs/authentication/register-app/), [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow), [WebSocket handling](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [chat events](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

## Recovery, journals, and stream presentation

The encounter autosaves to browser local storage every five seconds and after actions. A refresh recovers evidence, votes, selected eye, timer, and scene; active encounters recover paused. It never saves a Twitch token. The draft belongs to this browser/origin and is not a cloud account. A second host window taking control pauses the previous window; use one host window.

**Export journal** downloads a JSON record of visible evidence, contributor display names, discovered rules, proposals, and result. It includes the rehearsal/live source label and no tokens. Scores are local and unverified. Do not use this prototype for a paid or ranked competition: secrets live in the host browser and can be inspected.

Use **OBS Window Capture** on the same browser window. **Stream view** hides host setup/locking controls; exit with Escape or its visible button to operate the encounter. Independent browser/OBS instances do not synchronize. Keyboard shortcuts: `1`–`5` inspect eyes, `?` opens instructions, Escape exits stream view.

## Art and performance

Original user-provided Primordial Shade artwork is adapted into a sandboxed iframe with isolated styles/CSP. Only public motion, focused-eye, and sealed-eye flags cross its bridge; no chat, secret rules, or authentication. The original file is left unchanged. The forest screenshot is bundled unchanged. Read `IP_NOTES.md` for the user's originality attestation, precedents, and accurate submission language.

The custom interface uses navy, ivory, gold, system fonts, and a custom five-eye SVG mark. No HoYoverse characters, logos, proprietary font files, music, or game textures were imported. Aurora Glade/Crimson Rift are visual themes, not separate levels. Sealed pupils gain a green tint; selection and seals also have text indicators.

The atmosphere uses one WebGL buffer capped at 900 × 600 pixels at about 30 draws/second. Effects pause offscreen, in a hidden tab, and while paused/finished. Reduced motion is respected; **Effects: still** freezes decorative motion, and WebGL failure leaves the static scene. Game time is independent of frame rate. The forest is a supplied image, not an interactive 3D scene.

## Validate

```powershell
npm.cmd run check
node --test
```

The tests cover 200 seeded puzzle invariants, command parsing, timing/pause, experiment budgets/quotas, earned voting, ties, stale votes, independent final binding, win/loss, validated recovery, and Twitch adapter identity/scope/deduplication/reconnect/revocation behavior. Mock tests do not prove live Twitch connectivity. Browser QA covers visible rehearsal play, recovery, mobile layout, and stream view; complete real multi-viewer and OBS testing before recording the final demo.

## Files

`dist/engine.js` is the deterministic game engine; `app.js` binds the UI; `twitch.js` handles OAuth/EventSub. `style.css`, `product.css`, `domain.css`, and `domain.js` implement the UI/arena. `dist/assets/` contains the supplied art; `tools/import-primordial.mjs` imports the original HTML without editing its source. `tests/` uses Node's built-in runner. `SUBMISSION.md` tracks remaining contest work.

This version has one local host, no database, no public leaderboard, and no synchronized remote overlay. All game state and scores are browser-local.

