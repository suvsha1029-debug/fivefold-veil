# Fivefold Veil: evidence becomes recognition

The product theme is a shared expedition where viewers make discoveries the streamer can recognize. Six domains and the creator's exact sigils provide identity; the game gives that identity a purpose. No claim of market exclusivity or guaranteed competition placement is made.

## Implemented in this update

- **The Witness Seat:** off by default. A correct eye seal freezes credit for experiments that eliminated previously possible theories and valid evidence citations made before the seal. A viewer can earn one seat per round, even if they contribute at several eyes. A lucky vote alone earns none.
- **Optional message:** browser contributors send up to 180 characters privately to their host. Twitch contributors use `!spotlight message`. This command itself is visible in Twitch chat; only the in-game review queue is private. At most ten requests wait, for up to five minutes. Viewers can withdraw their browser submission. The host can feature, dismiss, disable, or clear. An approved message appears for 60 seconds in room and audience views, with the contributor's team sigil and evidence credit. This does not reorder native Twitch chat, award VIP, promise a reply, or grant a cash prize.
- **Discovery replay:** correct seals create a public record of each experiment, result, newly eliminated theories, the revealed rule, and contributors. The host can display a selected recap to the room for 20 seconds. The archive remains available for late arrivals. This is a readable recap, not an exported video or automatic clip.
- **Moderation:** the host's Twitch adapter subscribes to message deletion, user-message clearing, and channel clearing using its existing read-chat scope. Matching queued or displayed spotlight text is removed. Server tombstones handle moderation arriving before its matching submission. Spotlight and replay displays expire locally and hide if room updates are stale for over ten seconds. Ordinary chat is not copied into the game.
- **Trust boundary:** browser guests and Twitch relay participants remain separate. Host-relayed Twitch identity is trusted by the server. One-seat limits apply per participant ID, not per verified human. This is social recognition, not an anti-cheat prize system. Deletion processing depends on the host's live connection and room polling; this is not an instant replacement for Twitch moderation.

## Three distinctive follow-ups, in recommended order

1. **The Streamer's Sealed Prediction.** Before evidence is gathered, the host commits a theory privately. Reveal the prediction and commitment time after the seal, next to the audience's evidence. The dramatic moment is whether the audience changed the host's mind. Enforce pre-round commitment server-side; never reveal a correct answer from hidden engine state.
2. **The Counterexample Seat.** Once per round, a late arrival can propose the one experiment that would disprove the leading theory. Show a plain-language prediction before running it. Credit the person for a useful challenge even when the popular theory wins. Reuse existing signals, evidence and cooldowns; do not add another currency.
3. **The Six-Witness Chronicle.** Each domain memory supplies a short authored account of why the guardian split its voice. After the team recovers all six, their evidence selects the ending. Let teams nominate one spokesperson for the final Witness Seat. This is future narrative and team-nomination work, not implemented in this release.

## Competition priority

Prove the current loop on a real Twitch stream before adding any follow-up: viewer experiment → correct seal → earned message → host approval → audience spotlight. Capture a readable discovery replay. Validate actual connection recovery, phone participation, intended viewer access, and an OBS capture without host credentials or private queues. Existing automated tests use mocked Twitch services; they do not prove live Twitch or OBS behavior. Record only verified behavior in the under-three-minute submission video.
