# Council of Streamers

An integrated event inside Fivefold Veil's existing `/teams` room. The room host directs; two to five appointed captains lead their existing research teams. Domains and the six exact creator-supplied sigils are retained.

## Host setup

1. Create or reopen a team room and select **Council & memes**.
2. Ask streamers to join browser viewer seats on different teams. Open **Host desk · captains & new events** and appoint their names. A captain receives no host key or global host controls.
3. Copy each captain's team invite for their audience. All invite recipients still need access to the hosted Site; the current restricted Site audience is unchanged.
4. Open a **Theory council** or **Meme intermission**. Existing Twitch/OBS broadcasts carry the audio and video; this app coordinates the event, rather than mixing stream video.
5. Use a separate viewer URL with `&view=watch` for an audience display. The Audience view button also hides private controls, drafts and review queues. Never broadcast the host desk.

## Theory council

Choose an unsealed eye. Audience members share one revisable theory and a reason, visible to their own team and host before the reveal. Captains seal one commitment each; other teams cannot see the choice beforehand. Viewers may predict which captain will be correct. Close predictions once all captains commit, then investigate and seal the eye using the existing game controls. The game's actual rule determines the winners automatically. All correct captains win; nobody wins if all captains chose incorrectly. A failed/expired encounter or host reset refunds unresolved predictions. The host can cancel a stalled council.

This release uses the shared evidence already in the game. It does not implement distinct secret clue packs per community or judgments of arbitrary external-game lore.

## Live meme intermission

Viewers submit a caption with an optional PNG/JPEG/WebP image. The browser converts images to a bounded JPEG preview (up to 480 pixels, base64 payload up to 64,000 characters). A caption alone uses the team's domain sigil. There is one submission per seat and at most 12 entries per event; rejected/withdrawn entries can be replaced before the reveal.

The host reviews privately and approves at least one meme for each participating team. Closing predictions reveals approved entries. The host puts each meme on the common audience stage (60 seconds per showing, replayable), then opens a 60-second vote. One replaceable vote per seat. At the deadline, the host reveals results; late votes are rejected server-side.

Votes select a meme but the score belongs to its captain's team. Each community that casts votes receives equal total weight. Example: three Crown viewers choosing Crown and one Dusk viewer choosing Dusk gives 50% to each, not 75%/25%. Ties share the win. This limits audience-size advantage; it is not a guarantee against coordinated or duplicate participation.

Removing an entry after reveal cancels an active event and refunds stakes. The host can clear the stage immediately. Requests and live content use text nodes; only bounded JPEG data URLs are accepted for images. No remote media fetch, autoplay video, arbitrary iframe, real-money payment, or public file hosting is added.

## Confidence predictions

Each participant starts with 10 free confidence points, persisted within this 24-hour room. Predict once per event with 1–3 points before reveal. Stakes are deducted atomically. A correct pick returns twice the stake; a wrong pick returns none; a cancellation refunds the stake. Tied winners each count as a correct pick. Points cannot be bought, transferred, redeemed, or cashed out. These are app points, not Twitch Channel Points. Voting and submitting do not require a balance.

## Twitch integration

Host-appointed browser captains can connect their own Twitch account using the existing public-client OAuth flow. Keep each connected captain browser open. New relayed Twitch viewers enter that captain's team; existing participants retain their established team. Browser seats and relayed Twitch accounts remain separate identities.

- `!back crown 2`: lock two confidence points behind Crown (replace Crown with a participating team).
- `!opinion a This observation rules out B`: share a theory and explanation during predictions.
- `!memevote m1`: vote during the meme voting window.
- Meme images and sealed captain commitments use the browser interface.

Shared Chat mirrored messages are ignored by the client so each source channel relays its own commands. Host/captain authorization is checked server-side. Relay identity remains trusted input from those authorized browsers, not independent server-side Twitch verification. Moderation removes matching relayed theory opinions by message deletion, user clear, or channel clear; bounded tombstones handle deletion arriving first. Processing depends on live connections. Witness Seat messages remain on the event host's relay.

## Verification and release

Automated tests cover role boundaries, hidden pre-reveal content, actual game resolution, vote deadlines, community weighting, duplicate requests, payout/refund idempotency, reset, moderation and upload limits. The browser walkthrough also covers isolated host, captain and mobile spectator sessions, image uploads, live staging and voting. See [QA results](QA_REPORT.md). Live broadcaster and OBS verification remains open.
