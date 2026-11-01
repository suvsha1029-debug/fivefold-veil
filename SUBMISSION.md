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

Team-room views are at `/teams`. The current Site remains owner-private: room invitations do not grant Site access. Browser seats are guest identities, separate from Twitch host-relay identities; they do not prove one human per vote. Do not claim a live Twitch multi-viewer session or OBS broadcast until tested. The room member cap of 200 is not a load-test result.

- [x] Five seeded rule investigations, one unique common signal; every eye is necessary
- [x] Shared evidence, automatic theory elimination, per-eye filters
- [x] Contributor eligibility, replaceable votes, ties, host locks, quotas, fractures
- [x] Separate final binding vote and win condition
- [x] Original user artwork integrated with timer, scenes, focused/sealed-eye feedback
- [x] Replay codes/links, paused local recovery, JSON field-journal export
- [x] Responsive interface, still effects, keyboard controls, stream capture view
- [x] Browser OAuth/EventSub adapter with mocked tests; rehearsal clearly labelled

## Required next

- [x] Complete Twitch email/2FA and app registration; record the app Client ID
- [x] Real broadcaster OAuth and one broadcaster-chat `!test` verified on 31 October
- [ ] Complete an independent-viewer live Twitch round covering `!solve` and `!bind`
- [ ] Test interruption/reconnect and OBS Window Capture on the user's PC
- [ ] Playtest with a streamer/viewers and refine clarity/pacing from observed feedback
- [ ] Record creation dates for pre-existing personal artwork; disclose reuse accurately and ask organizers if eligibility is unclear
- [x] Push source, assets, run instructions, and provenance notes to private GitHub repository
- [ ] Give the designated judges access to the private repository and working Site
- [ ] Record/upload an under-three-minute YouTube video showing real Twitch functionality and Codex development
- [ ] Add project description, demo URL, source URL, screenshots, and Codex use details on Devpost
- [ ] Obtain the actual main Codex session ID; never substitute the Site ID, repository ID, or this checklist
- [ ] Review the entry and finish Submit; confirm it says Submitted

Deadline listed by the event: **2 November 2026, 2:00 PM PST / 3 November, 3:30 AM IST**. Recheck the official countdown before submission. Preserve the submitted version and linked materials until winners are announced, per organizer FAQ. The current Site uses a restricted visitor allowlist and the GitHub repository is private; neither is automatically judge-accessible.

Recording instructions, a 2:50 storyboard, and ready narration are in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). The script is prepared; the video is not yet recorded/uploaded.

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
