# Fivefold Veil — submission working notes

## Pitch

**Five discoveries. One shared signal.** Twitch chat becomes a research team investigating five eyes of an original guardian. Viewers spend experiments to earn a vote at each eye. The streamer seals discoveries, then chat combines all five necessary constraints into the single signal that opens the veil.

The particular combination of contributor-earned votes, simultaneous eye investigations, necessary constraints, a final binding ritual, and the user's guardian artwork is the project's design contribution. Secret-rule deduction and collaborative Twitch puzzles have precedents. Do not claim the genre or underlying mechanics are unprecedented. See `IP_NOTES.md`.

## Implemented

- [x] Server-backed browser rooms with unique room/team/member IDs and 24-hour persistence
- [x] Viewer avatar/team selection, accessible emoji keyboard, shared cross-browser evidence/votes
- [x] Late-join evidence citations earn voting rights without using an experiment slot
- [x] Host-only controls, hashed private credentials, versioned writes and idempotent actions
- [x] Final binding requires two contributing teams by default, or one in host-selected small-crew mode
- [x] Quick joining with optional personalization, watch-only participation, audience view and live next-step recap
- [x] Viewer nudge requests and host-shared guidance derived from public theories; no automatic experiments or vote credit
- [x] Viewers-lead, shared and host-led modes with server-enforced decision permissions and host approval of browser/Twitch experiments
- [x] Host-authored rule options and labels, private answer editor, and validation of a unique final signal with five necessary clues

Team-room views are at `/teams`. The Site visitor audience and GitHub repository are public; public visiting does not grant room-host credentials or Site editing access. Browser seats are guest identities, separate from Twitch host-relay identities; they do not prove one human per vote. Do not claim a live Twitch multi-viewer session or OBS broadcast until tested. The room member cap of 200 is not a load-test result.

- [x] Five seeded rule investigations, one unique common signal; every eye is necessary
- [x] Shared evidence, automatic theory elimination, per-eye filters
- [x] Contributor eligibility, replaceable votes, ties, host locks, quotas, fractures
- [x] Separate final binding vote and win condition
- [x] Original user artwork integrated with timer, scenes, focused/sealed-eye feedback
- [x] Replay codes/links, paused local recovery, JSON field-journal export
- [x] Responsive interface, still effects, keyboard controls, stream capture view
- [x] Browser OAuth/EventSub adapter with mocked tests; rehearsal clearly labelled
- [x] Team-room server-side authorization-code login, encrypted token storage, refresh rotation and same-browser HttpOnly session restoration for up to seven days
- [x] Disconnect invalidates remembered login; separate browser-room host controls remain usable

Room login uses runtime `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_TOKEN_KEY` (64 hex characters) and `TWITCH_APP_ORIGIN`; the exact registered callback is that origin followed by `/teams`. Secrets belong only in server runtime settings; [.env.example](.env.example) is a placeholder-only local template. Real production authorization, automatic restoration after reload, and Disconnect followed by reload were verified on 2 November for @shashu1029. A fresh gameplay command after this authentication change remains unverified. The legacy solo rehearsal keeps its older browser-memory access-token flow and requires reconnecting after reload. Seven days is the remembered room session's maximum lifetime; revocation or expiry can require earlier sign-in. See [README setup](README.md#server-configuration).

## Required next

- [x] Complete Twitch email/2FA and app registration; record the app Client ID
- [x] Real broadcaster OAuth and one broadcaster-chat `!test` verified on 31 October
- [x] Verify real production code-flow login and automatic EventSub restoration after reloading the same host browser without authorizing again
- [ ] Receive a fresh real Twitch gameplay command after that reload; earlier-flow command evidence does not cover this
- [x] Verify **Disconnect & forget this browser** removes remembered Twitch sign-in, reload remains disconnected, and the saved host room remains available
- [ ] Complete an independent-viewer live Twitch round covering `!solve` and `!bind`
- [ ] Test interruption/reconnect and OBS Window Capture on the user's PC
- [ ] Playtest with a streamer/viewers and refine clarity/pacing from observed feedback
- [ ] Record creation dates for pre-existing personal artwork; disclose reuse accurately and ask organizers if eligibility is unclear
- [x] Push source, assets, run instructions, and provenance notes to GitHub repository
- [x] Make the GitHub repository public for judges
- [x] Set the working Site visitor audience to public and confirm the policy through Sites
- [x] Verify website home, team lobby and their navigation load in the controlled browser
- [ ] Independently verify the website in an isolated signed-out browser; automated HTTP checks are blocked by Cloudflare 1010
- [x] Upload both narrated walkthroughs publicly to YouTube and verify their watch links/playback
- [ ] Include actual Twitch functionality and Codex development footage in the under-three-minute submission video; current edits use screenshots/source excerpts
- [ ] Add project description, demo URL, source URL, screenshots, and Codex use details on Devpost
- [ ] Obtain the actual main Codex session ID; never substitute the Site ID, repository ID, or this checklist
- [ ] Review the entry and finish Submit; confirm it says Submitted

Deadline listed by the event: **2 November 2026, 2:00 PM PST / 3 November, 3:30 AM IST**. Recheck the official countdown before submission. Preserve the submitted version and linked materials until winners are announced, per organizer FAQ. Both the GitHub repository and Site visitor audience are now public. Sites confirmed public policy revision 3 on 2 November. The home page, team-room lobby, and their navigation loaded in the controlled browser on 2 November. Automated HTTP checks are blocked by Cloudflare error 1010, and an isolated signed-out browser check remains outstanding.

Recording instructions, a 2:50 storyboard, and ready narration are in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). [Codex development capture](docs/CODEX_DEVELOPMENT_CAPTURE.md) plans a truthful 20–30-second segment of the actual chat, auth implementation, tests and app reload. These are instructions, not created footage or confirmation that a video satisfies the event's rules. The revised [2:53 screenshot walkthrough, captions, and transcript](docs/submission/README.md) now includes the research and iteration journey and is included in the repository. It is not a live-action recording and does not yet include actual Codex development footage; the creator has now uploaded [Journey](https://www.youtube.com/watch?v=KSUtdG_mDbc) and [Explained](https://www.youtube.com/watch?v=p1Gp0-6BwVY) publicly. Both watch links returned unauthenticated oEmbed metadata and played in the controlled browser on 2 November.

## Demo outline — 2 minutes 50 seconds

1. **0:00–0:15:** “Five eyes. Five discoveries. One shared signal.” Show the guardian and explain chat's objective.
2. **0:15–1:05:** Show real viewers testing different eyes in Twitch, results in the journal, and a test earning voting eligibility. Keep the real chat source indicator visible.
3. **1:05–1:35:** Show theory votes, the host sealing an eye, and all five discoveries. Use clearly labelled cuts from the same live session.
4. **1:35–2:05:** Show a real `!bind` proposal, final host commit, and the veil opening. Explain why all five constraints matter.
5. **2:05–2:25:** Show replay codes, recovery, journal export, and stream view briefly.
6. **2:25–2:50:** Show actual Codex build footage: engine/Twitch implementation, test results, and visual iteration. Credit the user's artwork/creative direction and describe Codex's assistance honestly.

Use real Twitch footage for integration evidence. Label all rehearsal footage. English or English translations are needed; choose audio/assets you have rights to use. An unlisted YouTube video is acceptable per FAQ; private videos are not viewable by judges. Do not claim mocked tests are live integration proof.

## Sources

- [Official event](https://twitchcon-codex.devpost.com/)
- [Rules](https://twitchcon-codex.devpost.com/rules)
- [Resources and organizer FAQ](https://twitchcon-codex.devpost.com/resources)
