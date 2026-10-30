# Visual integration direction

## Interface presentation

The interface uses navy chrome, ivory theory cards, restrained gold ornament, serif headings, and pill-shaped controls inspired by fantasy game menus. A custom compass mark belongs to Signal Lab. The desktop layout separates signal preparation, the encounter, and theories into three aligned columns; the evidence journal sits below the encounter. Tablet layouts use two columns and phone layouts place the arena first. The existing guardian artwork, shaders, Twitch connection, and game rules are preserved.

The interface was checked at desktop and phone sizes, including signal testing, pause, the guide dialog, and stream view. No external font or rendering dependency was added.

The two references become one readable stream experience: a place to investigate, a guardian that responds, and a visible measure of time.

| Element | Placement | Purpose |
| --- | --- | --- |
| Aurora forest | Background of the experiment arena | Gives the puzzle a place and atmosphere while controls and evidence stay readable. |
| Primordial Shade | Centre of the mystery machine | The domain's guardian. The original user-provided HTML is used, including its pupils, particles, and glow. |
| Countdown ring | Around the guardian | Shows how much time remains at a glance, with the exact time below the eyes. |
| Aurora / Crimson selector | Above the arena | Lets the streamer choose calm or ominous presentation. It does not change difficulty. |
| Shader atmosphere | Between the landscape and controls | Soft curtains of light, stars, and one-shot response ripples. |
| Evidence and theories | Outside the illustration | Preserve the legibility of decisions and results. |

## Responses already connected

- Start: the selected timer begins and the domain's status becomes investigating.
- Accepted signal: green response and a gentle outward ripple.
- Rejected signal: warm/red response and a gentle outward ripple, without a strobe or camera shake.
- Last 30 seconds: the ring turns amber and the atmosphere gains a subtle warm tint.
- Pause: time, guardian animation, and shader motion freeze together.
- Solve: the environment brightens and the result identifies the hidden rule.
- Reset: evidence is cleared and timer setup becomes available again.

## Ideas to playtest next

1. **Awakening sequence:** introduce the guardian briefly when a case starts, then return to the readable board. Keep it skippable.
2. **Domain discoveries:** use distinct puzzle rule sets for later domains after the current game has been playtested. Presently, domains are visual themes only.
3. **Cooperative unlocking:** let viewers unlock the next domain by solving the current case together, rather than by sending more messages.
4. **Streamer layout:** keep this arena as the visual centre with a webcam corner and a narrow evidence strip for a clear Twitch demo.

The ChatGPT conversation URL could not be read through the web tool; it returned the sign-in shell. The forest is currently the provided screenshot, not a recreation of an unavailable 3D scene source. A source file for that scene could replace the background later.

## Art and browser integration

The source `C:/Users/LENOVO/Downloads/Primordial-Shade.html` remains unchanged. Its imported copy has a transparent page, cropped SVG view box, hidden standalone controls, a restricted Content Security Policy, and parent-controlled animation. Original SVG turbulence updates are limited to roughly eleven per second. The art's CSS remains isolated inside a sandboxed iframe. Rendering pauses when it is not visible. No external rendering framework is loaded.

The timer uses the game engine's remaining time; shader frame rate cannot slow or extend a case. OBS should capture the same browser window, as in the first version.
