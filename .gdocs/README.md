# GDD Template build

Google Doc: https://docs.google.com/document/d/1TSYd9qoBF6HnQX2wjUZRiA1RbMiFabj6_EJeXb6cyYI/edit

## What was built

A ten-tab game design document template:

0. Start Here — workflow, typography legend, quality bar, review gates, tab map, RACI, change log, sign-off
1. Vision & Strategy
2. Gameplay & Systems
3. Narrative & World
4. Experience: UX, UI, Audio
5. Art & Content
6. Technical Design
7. Production & Launch
8. Diagram Playbook — software-engineering-to-game-design diagram translation, 12 recipes, 12 rendered examples
9. Appendices

Every content section has a grey monospace instruction block and an amber worked example. The running example is *Moonshift*, a lunar repair game.

## Font system

- Montserrat — headings and table headers
- Lato — body content
- Roboto Mono — instructions, ASCII diagram sketches, captions
- Playfair Display — pull quotes
- Lato italic blue — placeholders to replace

## Rebuild

```powershell
cd .gdocs
python build_gdd.py --doc <document-id> --only "00,01"
python build_gdd.py --doc <document-id> --only 08
```

`content/*.json` holds the source. `build_gdd.py` renders tabs, named styles, tables, callouts, examples, and inline diagram images. `make_diagrams.py` regenerates the 12 PNGs in `diagrams/` through mermaid.ink and writes `manifest.json`.

## Notes

- Diagram images are fetched once by Google Docs at insertion time, so the document keeps its own copy.
- The original target document became inaccessible (404) after the build; this is a fresh document with the same content.
- Do not run `replaceAllText` across all tabs on this document; it is the operation that preceded the original 404. Edit the source JSON and re-render the affected tab instead.
