# Signal Lab — submission working notes

## Concept

**One hidden rule. A whole chat of researchers.** Viewers test coloured signals against a mystery machine. Its responses create a shared evidence board. The chat develops a theory, casts one vote per viewer, and asks the streamer to lock its answer.

The design aims to make evidence gathering and collaboration visible on stream. Its originality and audience appeal need streamer/viewer playtesting; neither has been established yet.

## Must complete before submission

- [x] Playable prototype, explicitly labelled practice mode
- [x] Experiment history and automatic elimination of contradicted theories
- [x] Per-user voting, host-controlled locks, timer, pause, win/loss
- [x] Browser OAuth and EventSub chat adapter with mocked integration tests
- [ ] Register Twitch app and test actual authorization with the broadcaster
- [ ] Verify real `!test` and `!solve` chat commands during a Twitch stream
- [ ] Test OBS Window Capture on this PC
- [ ] Get feedback from at least one streamer/viewer and refine the rules
- [ ] Put the full source and setup instructions in an accessible GitHub/GitLab/Bitbucket repository
- [ ] Record a YouTube demo under three minutes showing actual Twitch functionality and Codex development
- [ ] Add project description and screenshots on Devpost
- [ ] Obtain the actual Codex session ID from the main build chat; do not substitute a repository or Site ID
- [ ] Click Submit and confirm the entry status is Submitted before the deadline

Deadline listed on Devpost: November 2, 2026, 2:00 PM PST / November 3, 2026, 3:30 AM IST. Verify the event countdown before final submission. Keep the submitted repository, video, and linked materials unchanged until winners are announced, per organizer FAQ.

## Proposed demo, 2 minutes 50 seconds

1. **0:00–0:20:** Explain the audience experience: chat becomes a research team, testing an unknown machine.
2. **0:20–1:20:** Show actual commands in Twitch chat, corresponding machine outputs, and evidence-driven eliminations. Keep the Twitch connection/source indicator visible.
3. **1:20–1:50:** Show multiple viewers voting, then the streamer locking the correct theory and the case ending.
4. **1:50–2:20:** Explain streamer controls and the capture view.
5. **2:20–2:50:** Show footage of this Codex build: implementing the engine/integration, running tests, and iterating on the interface. Describe the user's creative direction and Codex's implementation assistance.

Use real Twitch footage for the integration demonstration. Label any practice/simulation footage accurately. Use English or supply an English translation, and use assets/audio you have rights to show.

## Sources

- <https://twitchcon-codex.devpost.com/>
- <https://twitchcon-codex.devpost.com/rules>
- <https://twitchcon-codex.devpost.com/resources>
