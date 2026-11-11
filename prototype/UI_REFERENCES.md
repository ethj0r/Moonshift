# Outlanders interface research

Research date: **2026-11-11**. Reference game: **Outlanders by Pomelo Games**, using the original game's PC and Apple Arcade editions. Do not mix in Outlanders 2, Monster Hunter Outlanders, the unrelated MMO, or fonts that merely share the game's name.

This research supports [the UI and menu specification](UI_DESIGN.md). It does **not** establish the exact in-game font family or original pixel measurements.

## Evidence and limits

Use these evidence labels throughout the specification:

- **Verified text:** a statement published by the developer or its launch PR source.
- **Viewed local art:** image pixels actually inspected from this repository. These are promotional images, not gameplay menus.
- **Indexed reference:** a published screenshot located online, with page/image descriptions available, but its full-resolution pixels were not independently inspectable in this research session.
- **Approximation:** a proposed MOONSHIFT value or adaptation; not an extracted Outlanders design token.

The online text pages were readable. The browser inspection host was unavailable, and direct image downloads failed. As a result, precise online screenshot measurements and a live menu walkthrough remain unverified. Temporary decoding of the existing local AVIF banners made their typography inspectable without modifying repository assets. No online reference image or font has been added to the application.

## Source ledger

| ID | Source | What it supports | What it does not establish |
| --- | --- | --- | --- |
| R1 | [Pomelo: Apple Arcade UI update](https://www.pomelogames.com/challenges-5-6-copy/) | **Verified text:** the original Apple Arcade UI was redesigned to emphasize important information, alongside Sandbox customization/map-seed features. | The exact current desktop HUD, menu geometry, or a named font. Its [UI announcement image](https://www.pomelogames.com/wp-content/uploads/2023/10/Pom_OUTLANDERS_newSandbox-UI_banner_900x512.png) and [Sandbox image](https://www.pomelogames.com/wp-content/uploads/2023/10/Pom_OUTLANDERS_newSandboxFeatures_banner_900x521.png) are promotional material, not a published token sheet. |
| R2 | [Launch PR: Outlanders announced for Steam, October 13, 2022](https://www.biggamesmachine.com/client-news/outlanders-announced-steam/) | **Verified text:** the PC launch included a refreshed UI informed by player feedback, intended to keep actions a few clicks away. | That PC and mobile interfaces are identical, or that today's builds match every launch screenshot. |
| R3 | [Official Steam product page](https://store.steampowered.com/app/1766720/Outlanders/) | **Verified text:** developer identity, the original game's campaign/Sandbox distinction, and indirect management of resources/buildings. A primary place to revisit published PC gameplay media. | The Steam website's CSS fonts are not evidence of the game's fonts. Marketing banners and screenshots must be distinguished. |
| R4 | [Official App Store listing](https://apps.apple.com/us/app/outlanders/id1463407936) | Primary source for the Apple Arcade edition and its published media. | App Store typography and navigation are store UI, not Outlanders UI. The app icon is not a complete in-game icon specification. |
| R5 | [Local promotional references](../references/), especially `ex1.avif`–`ex4.avif` | **Viewed local art:** thick compact uppercase lettering, softened letter shapes, tight multi-line display composition, and strong white-on-scene contrast. The existing art guide identifies the reference collection as Steam store art. | Exact font identity, font weight number, CSS size, kerning values, menu typography, or exact remote-file provenance. These files are wide marketing banners. |
| R6 | [Apple Arcade gameplay article and screenshots](https://www.trgames.jp/entry/2021/01/18/014304), including [farm panel](https://cdn-ak.f.st-hatena.com/images/fotolife/t/tr086bf/20210118/20210118011626.png) and [placement view](https://cdn-ak.f.st-hatena.com/images/fotolife/t/tr086bf/20210118/20210118011623.png) | **Indexed reference:** resource information at the top, contextual building/assignment information near the bottom, placement feedback, and confirm/cancel controls. Useful mobile-layout corroboration. | Original English letterforms, current-version equivalence, or measured spacing. Japanese localization cannot identify the Latin UI font. |
| R7 | [Chris Hannah: original Apple Arcade impressions, November 4, 2019](https://chrishannah.me/outlanders-my-favourite-game-from-apple-arcade), including [gameplay image](https://chrishannah.me/images/2019/11/IMG_0065.png) | **Indexed reference:** a dated original-game HUD with resource counters and a small set of edge-anchored actions around a largely visible world. | Current menu structure or PC geometry. This is an early build reference. |

R1 and R2 establish that platform/version distinctions matter. Use the **PC edition as the intended desktop layout anchor**, with the mobile references informing responsive adaptation. Until its actual frames can be inspected, desktop placement details remain proposals rather than verified matches.

## Typography findings

No reviewed primary source names the original game's in-game font or supplies its font assets, point sizes, tracking, or hierarchy. Therefore, do not describe any proposed substitute as the original font, a confirmed match, or a pixel-perfect reconstruction. A named font found by searching “Outlanders font” is not evidence of a connection to this game.

The inspected local banners support a **heavy, compact display treatment**. They do not justify making every paragraph heavy or uppercase. The proposed implementation uses a display face for title/menu emphasis and a readable sans-serif for game instructions; that division is an explicit approximation pending gameplay-frame comparison.

| Candidate | Verified font facts | Proposed use and confidence |
| --- | --- | --- |
| **Lilita One** | Google Fonts metadata identifies a display family with a single normal **400** face and Latin/Latin Extended subsets. [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/METADATA.pb), [specimen](https://fonts.google.com/specimen/Lilita+One). | First candidate for compact, heavy title/menu lettering. **Approximation**, chosen from the local banner's broad visual characteristics; not yet a measured glyph match. Its native 400 is already heavy; do not invent 700/900 cuts. |
| **Nunito Sans** | Google Fonts identifies a sans-serif variable family, with a weight axis spanning **200–1000**. [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/METADATA.pb), [specimen](https://fonts.google.com/specimen/Nunito+Sans). | Body, controls, numbers, and instructions at 400/600/700. **Readability approximation**, with original UI font identity unresolved. |

The font distributions include their own SIL Open Font License files: [Lilita One license](https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/OFL.txt) and [Nunito Sans license](https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt). Retain the applicable notices with any prepared font files after implementation approval. These licenses do not establish that Outlanders uses either family.

## Fidelity review still required

After approval, acquire inspectable original-game PC frames for the title menu, settings/pause menu, ordinary HUD, selected-building panel, and confirmation dialog. Record source URL, platform, capture date, source resolution, and the specific frame/time when using video. Do not borrow a sequel screen to fill a gap silently.

Compare candidates using the **same visible words**: capital M/W/R, lowercase a/g/e, numerals 1/4/7, punctuation, and line wrapping. Match family proportions first, then weight, cap height, line height, and tracking. Never compensate for the wrong family by horizontally stretching the text. Image pixels alone cannot prove the original design's CSS or point sizes.

Record any measurements as screenshot estimates, normalized to frame size and the prototype's CSS viewport. If the original family becomes verifiable and is available under suitable terms, use it; otherwise retain the closest tested substitute and document the remaining differences. Do not hold the gameplay prototype open indefinitely for an unavailable font identity.
