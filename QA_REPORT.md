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
