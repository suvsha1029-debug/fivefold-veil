# Fivefold Veil — visual integration

The six domains now contain interactive rooms: landscape maps with three selectable vector landmarks, directed echo paths, a shared phase relay and a recovered-memory state. The room atlas shows progress in all six chambers for the viewed team. The original guardian iframe moves between investigation and chamber, then returns on close; it is not duplicated. The Taiga room includes the user's original pine/forest image as a foreground environment layer. Other landmarks are new code-authored SVGs. These are responsive 2D interactive scenes, not free-roaming 3D worlds. The existing WebGL arena stops scheduling frames while covered by a chamber.

Team rooms now include six selectable homes with distinct backgrounds, WebGL atmospheres, guardian hues and responsive interface treatments:

| Team domain | World and interface |
| --- | --- |
| Taiga / Tundra | Snowy conifers and aurora; teal frost glass and drifting snow |
| Corrupted Universe | Red-violet nebula, fractured planets and moons; red guardian and angular violet panels |
| Lunar Waters | Moonlit ocean and distant islands; pearl controls, rounded panels and water ripples |
| Temple of Fire | Fictional Andean-inspired stepped temples and lava; copper stone, stepped borders and embers |
| Frozen Frontier | Frozen sea joining mountains and desert; blue-gold seams, ice mist and dust |
| Dark Sea of Stars | Indigo ocean under stars; constellation details and cosmic swells |

The lobby offers six local previews. In a room, each teammate has one replaceable home-domain ballot, with an untied lead winning and ties retaining the incumbent. Homes and ballots persist across rounds; a personal preview never changes another browser. The host's inspected team determines the host view. New environmental art is AI-generated; `DOMAIN_ART.md` records all six prompts and paths. These are 2D environments with shader overlays, not navigable 3D worlds.

Version 0.3 adds browser team rooms at `/teams`: a two-card host/join lobby, stable room/team/member identity cards, avatar roster, shared arena/journal, and a nine-key emoji signal deck. Colour, shape and pulse keys have visible text labels, pressed states and arrow-key navigation. Teams can investigate any eye; correct evidence citations let late joiners earn votes. The responsive room layout keeps each signal key touch-sized. The original solo interface remains at the home page.

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

The iframe bridge only receives pause, focus, sealed-state and domain-hue flags. It never receives secrets, chat, or Twitch credentials. `tools/import-primordial.mjs` documents all adaptations, including CSP, crop, transparent styling, hidden standalone controls, and bounded turbulence updates.

Desktop uses preparation/arena/theories columns, tablet two columns, and phone a single column with the arena first. Stream view is intended for OBS Window Capture of the same connected browser window. It does not create a separately synchronized overlay.

The forest source was supplied as a screenshot; it is not a reconstructed 3D environment. The ChatGPT source conversation returned a sign-in shell when inspected earlier. Future scene-source integration would need the actual export.

