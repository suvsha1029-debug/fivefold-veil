# Actual Codex development capture — 20–30 seconds

Use this segment inside the project demonstration to show how Codex helped solve a real problem. Record the actual Codex chat, source and test run; then show the actual app. This document is a capture plan, not recorded footage or a claim that the final video meets every submission criterion. Check the current official event requirements before submitting.

## Prepare off-camera

- Open this project's actual Codex chat at the user's request to fix Twitch reconnects after reload, and the real work/results that followed. Do not stage a new message as if it were the original development.
- Open `server/twitch-session.js` at the OAuth exchange/encrypted-storage code, and `tests/twitch-session.test.js` at the refresh or Disconnect regression tests. The files contain no configured client secret, but inspect the visible selection first.
- In a clean terminal, run `node --test tests/twitch-session.test.js` and wait for the real result. Do not replace the output, edit a failure into a pass, or call mocked tests proof of live Twitch integration. Show the count actually produced by the current run.
- Open the deployed app at `/teams` with a saved host seat and the new Twitch sign-in connected. Test the reload and a new real chat command off-camera first. Until this succeeds, do not narrate it as verified. If Twitch setup or access is unavailable, capture code/tests only and label the live reload check as pending.
- Keep `.env*`, hosting secret settings, Twitch Client Secret, OAuth callback code, cookies, room-host keys, developer console, network panels and personal notifications out of the recording. Keep the address bar out of frame when a private host link or callback is visible. Use a browser viewer link for shareable footage.

## Capture sequence

| Time | Real screen action | Suggested narration |
| --- | --- | --- |
| 0:00–0:05 | Show the relevant user request and actual Codex response/work in the project chat. | “I asked Codex to fix Twitch sign-in disappearing after a reload.” |
| 0:05–0:12 | Show the room OAuth exchange and encrypted session code. Select just the relevant lines; avoid scrolling through unrelated files. | “With my direction, Codex implemented a server-side login, encrypted token storage, and a remembered browser session.” |
| 0:12–0:18 | Show the actual completed test output, with the refresh/Disconnect test names visible. | “We added regression tests for refresh, replay protection, and disconnect races. These tests use mocked Twitch services.” |
| 0:18–0:28 | In the app, reload the saved host page, wait until the connected channel returns, then send a fresh real `!test` command from Twitch and show its new result. | **Only after this succeeds:** “Here is the deployed app restoring the same browser's connection and receiving a new live chat command.” |

One command example is `!test crown blue circle 2`. Use an untested signal/eye in an active encounter, a fresh participant if needed, and the real current result. A quota, duplicate command or finished round can legitimately prevent a new experiment. Arrange the demonstration beforehand; do not mislabel an old journal entry as the command just sent. Browser-room updates may take the normal polling interval.

If the final action takes longer than ten seconds, trim another segment or use an obvious cut labelled “After reload” and keep the real connected state plus fresh command/result visible. Do not speed up a failed restore and imply success. If it fails, fix and re-test it before recording that claim.

## Finish honestly

Use a calm English voiceover; a US English voice is fine. Add captions matching the actual actions. Credit the user's original artwork and creative direction, and describe Codex's implementation/testing contribution. The segment does not replace the rest of the gameplay demonstration, required links, access checks or the actual main Codex session ID. Save the final video and review every frame for private details before upload.


## This iteration is ready to show

The actual 2 November sequence is in this chat and Git history: implement remembered server login → find the real production 503 → check Cloudflare's request documentation → replace the unsupported redirect mode without following redirects → pass 114 tests → verify real Twitch connection, reload restoration and Disconnect on the published site. This is useful evidence of iteration.

A concise voiceover for the real footage: “I directed Codex to fix Twitch login after refresh. A live deployment exposed a hosting incompatibility. Codex traced it, added regression tests, and corrected it. We then verified Twitch reconnecting after reload and forgetting the session on Disconnect.”

The completed screenshot walkthrough is approximately 2:50. Replace about 25 seconds of optional lounge or council material with this actual development segment; do not append it beyond the three-minute limit. Keep live Twitch functionality visible elsewhere and review the whole edited video before upload.
