# Fivefold Veil QA — 31 October 2026

The original watch URL for T7GJGTN returned a valid room with an idle encounter, no experiments and two approved memes. The host had already shown a temporary spotlight. Separate requests to the same invite with a slash after `/teams` reproduced a blank room. Its scripts and images returned 404 because their paths resolved below `/teams/`. Both URL forms now load. An expired invite stays on screen with recovery instructions. A temporarily disconnected spectator retains their seat and resynchronizes.

| Check | Observed result |
| --- | --- |
| Solo | Started a case, recorded an experiment and recovered the journal after reloading. |
| Host, two members and anonymous spectator | Created a room through the UI. The invite contained only the code. Mobile participation, refresh, a shared experiment, a nudge request, editor publication, pause and Witness controls worked. |
| Six domains | Changed the team home, opened each chamber, checked three landmarks per chamber and tuned a landmark. |
| Council | Appointed two captains, backed a team, uploaded an image and a caption, checked preapproval privacy, approved and featured both submissions, opened voting and recorded a vote. |
| Twitch game details | Simulated broadcaster authorization, EventSub and Twitch channel metadata in Chrome. A separate spectator saw the expected category and title. A unit test verified chat connected when the metadata endpoint failed. A live broadcaster and OBS still require a real-stream rehearsal. |
| Data recovery | Forced a browser network failure and recovery. Restarted the new SQLite rehearsal server and read the same room by its original code. The production-build walkthrough used a separate local D1 database. |
| Automated suite | 69 passed, including game completion, expiry, role boundaries, scoring, tied votes and moderation. Syntax checks and the production build passed. |

Using a fresh 1200 × 900 local Chrome page with reduced motion, Resource Timing measured 10,307,611 bytes of non-API subresource transfers before the change and 2,083,651 bytes after it. Sigil response bodies went from 8,328,575 to 103,498 bytes. The six original PNGs are retained. The UI uses compact display copies. These measurements exclude the page document and are specific to this viewport and preview.

To repeat the browser walkthrough, start a disposable local room server, then run the following from the project directory. Set `QA_ORIGIN` to its address and `QA_CHROME` to a Chromium executable if Chrome is installed elsewhere. The walkthrough creates a test room and uses mocked Twitch endpoints. Development tools are installed under the ignored artifacts directory.

```powershell
npm install --prefix artifacts/qa-tooling --no-audit --no-fund --package-lock=false playwright-core@1.64.1
$env:QA_ORIGIN='http://127.0.0.1:4191'
node scripts/browser-qa.mjs
```

Domain lounge update adds four server regression tests, bringing the suite to 73. Separate host, member and mobile spectator browser sessions verified shared messages, domain isolation, role controls, literal text, deep links and audio activation. The native audio instrumentation measured no activation before clicking, one reused AudioContext after enabling and suspension on exit. An additional browser check loaded the original grove, switched viewpoint, removed it when leaving Lunar and confirmed 390px layout without horizontal overflow.


## 1 November — easier operation and reduced visual work

- Optional timer/control settings and domain registry start collapsed. Primary streamer/viewer next steps have specific action labels; a host can begin/resume directly from the guide. Viewer invites have a one-click copy shortcut.
- Team worlds, Witness Seat and Council follow the core investigation. Witness/Council disclosures open once for new earned/live moments, while polling respects a manual collapse.
- Clock-only polls update timing without rebuilding the interactive view. Journal, roster and discovery DOM are retained when their contents have not changed. Mutations ignore responses from a room/seat that has since been left.
- Reduced effects persist across refreshes, honor system reduced-motion/data saving, and also stop lounge motion/optional 3D. Audio remains separately opt-in. No new latency/FPS or viewer-load claim is made.
- 76 automated tests passed, including new checks that time alone does not invalidate controls but evidence, votes, permissions and live content do. Syntax checks passed.
- Local browser UI: created a small-crew room, copied a viewer invite, toggled reduced effects, started from the next-step button, joined a separate viewer tab, sent an experiment and recorded a theory vote. Mobile viewport showed no document overflow (375px content/client width with scrollbar). Optional panels remained collapsed through polls. These are browser guests, not a new live Twitch verification.
- Real Twitch evidence from 31 October: broadcaster @shashu1029 authorized the app and sent `!test crown blue circle 2`. Production room J46MSAZ recorded FAIL and the broadcaster's contribution in its journal. This proves one real chat command reached gameplay; an independent-viewer complete round, live broadcast and final video remain unverified.


## 1 November — optional guided mode

- Added role-specific tours, pointer arrows, control outlines, Back/Next/Skip/Restart, keyboard focus shortcuts and resumable progress. Next only explains: a browser walkthrough of host startup left the encounter idle and its clock at 08:00.
- Added contextual window tours for all seven dialogs. Browser checks covered Twitch setup and a lounge tour inside native modal windows, including restoring keyboard focus inside the still-open modal on Skip.
- Added saved Readable mode with stronger opaque panels, larger type and still effects. Reload retained the preference and effects remained off. Still arrows are default and can be chosen independently.
- Local browser checks: lobby Next/Back, Show control focused the intended input; F6 returned to the guide and Escape restored its launcher. Separate spectator and viewer seats received distinct tour paths. A 390px viewport had 375px client/content width (scrollbar), no horizontal document overflow and a visible arrow with its target clear of the guide card.
- 83 automated tests passed, including seven guide-route tests for role/phase handling, modal permission boundaries, hidden/private-data independence and no state mutation. Existing room, council, lounge, Twitch and game tests remain green. Syntax checks passed.
- No new live Twitch, viewer-load or screen-reader certification claim is made by these guide checks. The underlying real broadcaster command verification and outstanding independent-viewer full round remain as recorded above.

## Domain layout and original Lunar sanctuary — 2 November 2026

- Replaced percentage-positioned chamber hit targets with responsive landmark cells; the guardian has a separate decorative area. The console stacks below the map at narrow widths.
- Made domain action rows wrap, lounge content scroll, and domain navigation use flexible cells. Resting-room return controls remain available while scrolling.
- Browser checks covered all six chambers and all six lounges at 390px and 1280px. Visible button/input rectangles had zero intersections; dialogs had no horizontal overflow. Results are saved under ignored artifacts/chamber-layout-*-checks.json and artifacts/lounge-layout-checks.json.
- Original Lunar sanctuary public visitor access was explicitly requested and enabled. An anonymous HTTP request returned 200. Fivefold Veil's audience remains unchanged.
- The original cross-origin Lunar scene rendered inside the on-demand resting-room iframe, and its Show controls/Pond camera buttons worked. Returning removed the iframe (count zero), restored lounge focus, and resumed its atmosphere. Opening the resting room stops lounge audio and removes the local grove.
- Syntax checks and all 83 existing tests passed. No new live Twitch command or full broadcast was tested in this change.


## 2 November — remembered Twitch login

- 114 automated tests passed. This includes encrypted token storage, opaque HttpOnly cookies, OAuth state/expiry/replay, strict same-origin mutations, token refresh/rotation, cross-instance refresh leases, late Disconnect winning over OAuth/refresh responses, safe diagnostics, and stale browser connections not stopping their replacements. Upstream Twitch services are mocked in these tests.
- Production v20 (source `06c3eb3836427a2ae1628d9fe84835ee88d499ba`) built and deployed with the existing restricted audience and server-only secret runtime values. Only the placeholder `.env.example` is tracked; secrets, local databases and recording outputs are excluded.
- Real production room A6KCU7V: @shashu1029 completed the new authorization-code flow. The UI reached **Twitch chat connected** after real EventSub subscriptions. Reload restored the connection without another authorization. Disconnect succeeded; another reload showed the disconnected prompt. Reconnecting afterward succeeded and the host room remained accessible. These checks do not claim a new gameplay chat message was delivered.
- A live check exposed Workers rejecting `redirect: error` before sending an upstream request. The fix uses `manual`, refuses all 3xx responses, and never follows or logs their destinations. Regression tests simulate this runtime behavior and attacker redirects. [Cloudflare Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/).
- UI checks: clear inline connection state, polite status announcements, deliberate one-button authorization, contextual help and a larger close target. A 390px viewport had 375px document/client width with no horizontal overflow; the connection dialog fit without overlapping controls. This is a layout check, not screen-reader certification.
- The seven-day remembered-session expiry and expired-token refresh behavior are covered with simulated clocks/services, not seven days of elapsed live use. Full independent-viewer gameplay, a fresh command after the new login, load testing, actual Codex footage and final YouTube/Devpost submission remain outstanding.
