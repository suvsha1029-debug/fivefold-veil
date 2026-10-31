# Fivefold Veil — visual integration

## Domain insignias and formal portal

The portal presents an expedition registry with a selected-domain insignia and six illustrated domain cards. All six active insignias are the user's supplied original PNG drawings, copied byte-for-byte into `public/assets/sigils/`. No tracing, redrawing, cropping, or image generation is used. The prior code-authored SVG alternatives are superseded and no longer referenced by the UI. CSS preserves the artwork's aspect ratio and uses screen blending/opacity to integrate the original dark backgrounds.

| Domain | Supplied drawing | Original clipboard filename |
| --- | --- | --- |
| Taiga / Tundra | Branching tree / Rimebranch | codex-clipboard-76edca5e-c230-4503-ab18-5fb5d939e194.png |
| Corrupted Universe | Sixth drawing, central circle and twin eyes / Veiled Witness | codex-clipboard-ec296264-aeef-4cb2-a5ce-6f3747fa0b9c.png |
| Lunar Waters | Waves / Silver Tide | codex-clipboard-48d10c10-2acb-46f5-aa55-c45e2370feb9.png |
| Temple of Fire | Flame medallion / Ember Crown | codex-clipboard-5aad0d80-ad02-481d-89dd-43a249a4ab0c.png |
| Frozen Frontier | Branched four-way cross / Horizon Knot | codex-clipboard-ea93cefa-2b41-4de6-8d41-84b1a20b615d.png |
| Dark Sea of Stars | Crescent-tipped four-point star / Astral Compass | codex-clipboard-14993556-b18c-422e-917e-ff785c715ad8.png |

The user states that these drawings are their own. Display names are interface labels, not names embedded in their drawings. The six copied files were verified against their sources with SHA-256.

Each insignia appears in the arena selector, team-home watermark, chamber guardian surround, room-navigation portals, and expedition passport. Unrecovered passport marks stay dim; recovered marks brighten alongside textual memory status. Sigils are decorative identities, not secret puzzle clues. No new renderer, dependency or continuous animation was added. Existing reduced-motion and effects controls remain in effect.

## Current finish: smoked silver

The latest presentation supersedes the rounded navy/ivory chrome described below. Both the solo rehearsal and team UI now use square corners, translucent charcoal surfaces, thin silver borders and pale readable type. Domain scenery and the original guardian retain their colours. Dialogs, theory cards, keyboard keys, host controls and chamber panels share the angular treatment; the guardian's circular timer and meaningful signal shapes remain intact.

The initial code-authored `veil-sigil.svg` and `veil-sigil-fracture.svg` ornaments are superseded. Ambient ornaments, the lobby insignia, and chamber engravings now use the user's exact supplied drawings, as mapped above.

`sigils.css` and `sigils.js` add faint margin engravings, a lobby emblem, a chamber guardian engraving, and evaporating dust: 18 fixed page particles plus eight in the chamber. CSS transforms and opacity animate these fixed nodes; no new canvas, renderer, recurring spawn loop or library is added. Small screens hide some page particles. Reduced motion removes dust; the existing effects switch, hidden-tab state and held/ended encounter stop it. Decorative layers ignore pointer input and are hidden from assistive technology.

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

