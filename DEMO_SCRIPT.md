# Fivefold Veil — record a clear 2:50 demo

The submission video must show the project functioning on Twitch **and** how it was built with Codex. Keep the finished video under three minutes. An unlisted YouTube upload is accepted; a private upload is not. See the [organizer FAQ](https://twitchcon-codex.devpost.com/resources).

This is a capture plan and narration, not a claim that the footage already exists. A real broadcaster chat command has reached the game and journal. A complete independent-viewer Twitch round and an OBS broadcast still need to be recorded and checked. Do not replace those with simulated commands or a still screenshot.

## 1. Prepare one short, real session

1. Open the published [team portal](https://signal-lab-twitchcon-4c9e.shashwatdogra1.chatgpt.site/teams). Create a fresh demonstration room with **Shared control**. Expand **Control mode & timer** if you want to change those defaults. Choose **Small crew** for a one-viewer demonstration, or ensure at least two teams contribute for a team expedition. Use an eight- or twelve-minute clock so recording is unhurried.
2. Connect your own Twitch channel through the host's **Connect Twitch** control. Finish sign-in before recording. Keep that tab open: refreshing loses the in-memory Twitch connection and requires reconnecting.
3. Invite one real person through the viewer link and your own Twitch chat. Site access must allow that person to enter; a room code alone does not override the Site's visitor restrictions. If you record alone, describe it as a broadcaster self-test, not independent audience testing.
4. Use the game's current next-step guidance. Have your helper perform an experiment, inspect the result, vote for a compatible theory, and watch you confirm it. Practice completing all five discoveries and binding correctly. Do not show the private answer editor.
5. Keep optional effects/audio off if your PC struggles. Close unrelated tabs, downloads and games. Record a ten-second sample first and play it back to check text, microphone sound and smooth motion.
6. Have the actual Codex development conversation and a terminal in `D:\twitchcon-signal-lab` ready. Run `npm test` for genuine test footage. Show the result you actually get; do not narrate a test count before checking it.

## 2. Record with OBS on Windows

Open OBS if installed, or obtain it from [obsproject.com](https://obsproject.com/). These steps are based on the [OBS Quick Start Guide](https://obsproject.com/kb/quick-start-guide) and [Window Capture documentation](https://obsproject.com/kb/window-capture-sources).

1. In **Tools → Auto-Configuration Wizard**, choose settings for recording and follow the wizard. For this demo, 1280 × 720 at 30 fps is a sensible starting point on a slower PC; use 1920 × 1080 at 30 fps if the test clip remains smooth and text is clearer. This is a recommendation, not a measured PC benchmark.
2. Create a scene called `Twitch + Fivefold Veil`. Under **Sources**, select **+ → Window Capture**, then select the browser window showing the game. Add another Window Capture for your own Twitch chat if it is in a separate window. Make both readable in the preview; crop away irrelevant browser chrome.
3. Capture the already connected game window. OBS Browser Source opens its own session, so it will not inherit the sign-in from your host tab. Prefer the viewer/Audience view for the public game shot, with the host controls out of frame.
4. In **Audio Mixer**, check that the microphone meter moves when you speak. Keep optional ambient audio quiet or muted so narration is clear. No face camera is required by the listed video requirements.
5. Create a second scene, `Built with Codex`, using Window Capture for the Codex app and terminal. Include actual prompts, code changes and the test result. Exclude unrelated conversations and private account information.
6. Select **Start Recording**, perform the session, then **Stop Recording**. Find the recording through **File → Show Recordings**. Review it before editing. You do not need to press Start Streaming just to create a recording; any live Twitch broadcast is a separate action you control.

Do not capture OAuth token fragments, client secrets, host/captain invitation credentials or unrelated private messages. The Twitch **Client ID is public**, but the sign-in flow and secret-bearing screens should stay out of the video. A normal viewer room link can be shown if you intend to share it.

## 3. Storyboard — target 2:50

Record the complete interaction first. Trim waiting and navigation afterward. Where you skip ahead within the round, add a simple **“Later in the same round”** caption. Keep at least one real Twitch command → game receipt → journal result sequence uncut.

| Time | What to show | Spoken section below |
| --- | --- | --- |
| 0:00–0:15 | Guardian and five-eye objective; title `Fivefold Veil` | 1 |
| 0:15–0:40 | Room creation/control modes, then a viewer joining or the emoji keyboard | 2 |
| 0:40–1:15 | Your Twitch chat and game together. One genuine experiment and its journal result | 3 |
| 1:15–1:50 | Evidence-supported vote, host confirmation, five discoveries and final binding | 4 |
| 1:50–2:10 | One domain/sigil and, briefly, the approved meme stage if ready | 5 |
| 2:10–2:40 | Actual Codex conversation, relevant implementation, terminal test output | 6 |
| 2:40–2:50 | Return to the game and show name/source/demo link as readable text | 7 |

If the full round is not working, fix it before presenting a successful ending. If you instead choose a one-discovery demonstration, say that plainly and replace section 4 with: **“Here is one discovery confirmed from evidence. The same investigation repeats across five eyes; the final binding is designed to combine those constraints. This recording demonstrates the first discovery.”** Show only what happened. Do not use a local rehearsal win as though it came from the live Twitch round.

## 4. Spoken script — about 250 words

Read at a relaxed pace. The timetable leaves room for clicks and visible results. Sections 3–4 assume you captured the actions they describe; adapt them to the footage.

**1 — Introduction**

“Fivefold Veil turns Twitch chat into a research team. Five eyes hide five rules. Together, viewers experiment, compare evidence, and discover one signal that opens the veil.”

**2 — Easy participation**

“The streamer creates a room and chooses how much control to share: viewers lead, shared control, or host-led approval. Viewers can join with a name, use the emoji keyboard, or simply watch. Here I am using shared control.”

**3 — Real Twitch proof**

“Now watch the real Twitch chat. A viewer sends an experiment: blue, circle, two pulses at Crown. The same command appears in our shared journal, with its result and contributor. Evidence rules out incompatible theories. A useful contribution unlocks voting for that eye.”

**4 — Meaningful outcome**

“The viewer votes for the theory supported by the evidence, and I confirm it as host. Each discovery reveals one constraint. After all five eyes are sealed, viewers propose the final signal, which must satisfy every discovery. The host confirms the binding, and the expedition sees the result together.”

**5 — Your worlds**

“Teams can choose one of six domains, with my original sigils and artwork. Optional lounges and approved meme intermissions give communities space between investigations, while the core game stays focused.”

**6 — Built with Codex**

“I directed the concept and artwork, and used Codex to implement the puzzle engine, shared rooms, Twitch connection, and interface. Here is the actual development conversation, the code it helped build, and the tests running. Streamer controls, shared evidence, and readable feedback make the interaction easy to follow.”

**7 — Close**

“Five discoveries. One shared signal. Fivefold Veil gives the audience a meaningful part in the show.”

## 5. Command prompts for your helper

Send these yourself or ask your helper to type them in your Twitch channel. The assistant has not sent them. Leave at least two seconds between contributions and respect the game's test budget.

```text
!team crown
!test crown blue circle 2
```

Then inspect the actual result and public theories. The next commands are **templates**, not puzzle answers:

```text
!solve crown <a/b/c/d supported by the evidence>
!bind <red/blue/amber> <circle/triangle/square> <1/2/3>
```

Remove the angle brackets and replace each placeholder with one actual value. The final binding is available only after five discoveries, and the contributor must have earned participation. Use another eye/signal if the experiment already exists. For a two-team expedition, have a second contributor choose a different team before contributing. Browser guests and Twitch relay accounts are separate seats; do not describe the same person using both as two independent viewers.

## 6. Edit, upload and submit

- Use an editor you already have. Trim pauses, keep the game text large, and add short English captions for the actual command/result and any time skips. Avoid an unrelated game or copyrighted music behind the demo. The app's optional synthesized ambience can remain muted.
- Export a readable 16:9 video, aim for **2:50 maximum**, and watch the exported file start to finish. Check audio, credentials, captions and that the Twitch evidence and Codex footage are both included.
- Upload to YouTube as **Unlisted** or Public. Test the share link in a signed-out window. A private upload cannot be used by judges, per the [organizer FAQ](https://twitchcon-codex.devpost.com/resources).
- Add that link, the code repository, clear run instructions, screenshots and the actual development-thread Codex session ID to Devpost. Ensure judges can access the working project and private repository, or deliberately publish them. The current Site visitor restriction is separate from room invitations.
- Check the official event countdown and [rules](https://twitchcon-codex.devpost.com/rules) for the deadline. Press **Submit** and confirm the entry says **Submitted**; a saved draft is not entered. Preserve the submitted materials through judging as instructed by the organizer FAQ.

There is no prize guarantee. This recording should make the real interaction and your creative contribution easy to assess.
