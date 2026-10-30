# Originality, assets, and submission notes

Research checked: 30 October 2026. Working title: **Fivefold Veil** (formerly Signal Lab). This is a development record, not a legal clearance or a claim that the concept is unprecedented.

## Positioning and nearby work

Proposed pitch: **A cooperative Twitch mystery where chat investigates five eyes, shares experimental evidence, and combines the discoveries to open a shared forest domain.** The five-eye version is implemented locally; live Twitch demonstration and playtesting remain required.

| Public precedent | Relevant overlap | Implication for this project |
| --- | --- | --- |
| [Zendo — Looney Labs](https://www.looneylabs.com/games/zendo) | Players construct examples and use positive/negative feedback to infer a hidden rule. Its pieces vary in shape and color. | The basic test-and-infer loop already exists; do not market that loop as our invention. |
| [Things in Rings — Allplay](https://www.allplay.com/board-games/things-in-rings) | Multiple rings each have a secret rule; players learn from classifications. | Five separate rule-bearing eyes alone do not establish a novel game mechanic. |
| [Things on Strings — Allplay](https://www.allplay.com/board-games/things-on-strings) | Deduction through cascading rules in a flowchart. | Combining rule discoveries has precedents too; author our own puzzles and progression. |
| [Puzzles With Chat — developer repository](https://github.com/bbeck/puzzles-with-chat) | Twitch viewers collectively solve crosswords/spelling bees; answers update a shared browser display. | Collaborative chat puzzles and stream overlays already exist. We have not imported this project's code. |

The defensible contribution is the particular authored experience: coordinated investigations across a five-eye guardian, persistent shared evidence, a meaningful final combination step, and original audiovisual reactions integrated with Twitch. This is a design direction, not a verified exclusivity claim. Evaluate it through a real multi-viewer session rather than relying on a feature count.

Quoted web searches for **“Fivefold Veil”** found no obvious exact-name product conflict. Keep it as a working title. These narrow searches do not check trademark registries, confusingly similar names, every store/extension catalog, or domain ownership; no trademark clearance has been performed.

## Asset and code provenance

| Material | Current provenance record |
| --- | --- |
| Five-eye artwork, supplied as `C:\Users\LENOVO\Downloads\Primordial-Shade.html` | User explicitly answered **“Entirely my original work”** when asked whether the eye art and forest contained traced/copied imagery, textures, or game/anime assets. This records the user's attestation, not an independent verification. Preserve the source file. The app's HTML copy contains integration adaptations. |
| Aurora forest, `public/assets/aurora-forest.png` | User-provided original scene, covered by the same attestation. Supplied as an image; no additional game asset download was needed. |
| Six domain backdrops, `public/assets/domains/*.webp` | Generated on 30 October 2026 with the built-in image-generation tool, without input/reference images. They are new environmental assets, separately credited from the user's guardian and forest. Exact prompts and original/final paths are in `DOMAIN_ART.md`. No independent legal clearance or exclusivity claim is made. |
| App logic, styles, interface copy, five-eye SVG mark | Project-authored implementation developed with Codex under the user's direction. Browser game assets use local art and system fonts. Version 0.3 uses the supported Sites Vinext/Cloudflare runtime; dependencies are recorded in package-lock.json and retained template components keep their licenses. This is not a guarantee about copyrightability of AI-generated code. |
| HoYoverse material | No HoYoverse characters, logos, proprietary font files, music, textures, or game artwork were imported in the inspected UI implementation. The request for fantasy-style polish was implemented with custom code and the user's art. Do not label the product as an official Genshin/HoYoLAB product. |

Keep creation dates and source/adaptation history. Original ownership and contest timing are different questions: record any pre-existing personal assets accurately and ask the organizer if their reuse eligibility is unclear. Recheck provenance when adding assets or dependencies.

## Copyright distinction

The [U.S. Copyright Office's Circular 33](https://www.copyright.gov/circs/circ33.pdf) distinguishes an underlying idea, method, or system from its expressive implementation. Independently authored text, illustrations, and other expression can be protected even when the underlying method is not. Names and short titles are generally outside copyright protection, while trademark rights are separate. Thus, similar mechanics do not by themselves settle infringement, and changing mechanics does not authorize copying code, artwork, dialogue, or music. This limited U.S. overview does not resolve patents, trademark, contracts, other jurisdictions, or any specific infringement dispute.

## Submission essentials

The [official rules](https://twitchcon-codex.devpost.com/rules) require a newly built Codex project that connects interactively to Twitch and runs as described. The submission window ends **2 November 2026, 2:00 p.m. Pacific / 3 November, 3:30 a.m. IST**. Supply an accessible GitHub/GitLab/Bitbucket repository containing source, assets, and run instructions; a feature/Codex-use description; the actual main Codex session ID; and a YouTube demo under three minutes showing both functioning Twitch integration and Codex development. Use authorized material, provide English or translations, and accurately represent ownership and functionality. Judges can assess the video without running the app. None of this guarantees an award.

The [organizer FAQ](https://twitchcon-codex.devpost.com/resources) allows an unlisted YouTube video and says private videos cannot be viewed. It warns that Extension review takes 5–14 days; chat/overlay/API/EventSub projects are valid faster paths. Complete live Twitch account/setup testing and capture real viewer commands; a local simulator alone does not demonstrate the integration. Preserve the submitted version, and finish the actual Devpost submission rather than leaving a draft.

