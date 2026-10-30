# Fivefold Veil — visual integration

The user's two original references form a single domain: the forest supplies place and atmosphere; Primordial Shade becomes the five-eye guardian at the centre. A custom navy/ivory/gold interface keeps evidence and decisions readable outside the artwork. System fonts and a custom five-eye SVG mark avoid imported franchise assets.

| Element | Integration |
| --- | --- |
| Forest image | Bundled unchanged as the arena backdrop; deliberately subdued behind text and controls |
| Primordial Shade | Original HTML/SVG imported into a sandboxed, transparent iframe; source file unchanged |
| Five eye tabs | Crown, Dusk, Heart, Dawn, Root; progress and seals have text as well as colour |
| Guardian pupils | Selected eye emphasized; sealed pupils tinted green using public visual flags |
| Countdown ring | Engine-derived time, with an exact readable timer below the guardian |
| WebGL atmosphere | Soft curtains/stars and response ripples; no external rendering framework |
| Ivory theory panel | Four public candidates per eye, evidence elimination, vote counts and host seal |
| Final binding | Five revealed discoveries and community signal proposals replace the theory panel |
| Field journal | Eye-labelled evidence, contributor, result, filtering and export |

Aurora Glade and Crimson Rift change presentation only. Accepted/rejected tests trigger restrained green/warm reactions; the final 30 seconds warm the ring. Pausing freezes time and decorative motion. Reduced motion and a still-effects control are supported. Hidden/offscreen animation stops, and WebGL failure retains a static scene. The drawing buffer is capped at 900 × 600 pixels.

The iframe bridge only receives pause, focus, and sealed-state flags. It never receives secrets, chat, or Twitch credentials. `tools/import-primordial.mjs` documents all adaptations, including CSP, crop, transparent styling, hidden standalone controls, and bounded turbulence updates.

Desktop uses preparation/arena/theories columns, tablet two columns, and phone a single column with the arena first. Stream view is intended for OBS Window Capture of the same connected browser window. It does not create a separately synchronized overlay.

The forest source was supplied as a screenshot; it is not a reconstructed 3D environment. The ChatGPT source conversation returned a sign-in shell when inspected earlier. Future scene-source integration would need the actual export.

