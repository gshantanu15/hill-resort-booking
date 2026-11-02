# Aavana Estate: local design concept

Status: owner-approved on November 2, 2026. The owner authorized saving the design system, committing, pushing and deploying this design. Root DESIGN.md is the locked system for future work.

## Direction

Quiet photographic hospitality. Atelier supplied the restrained light serif and pale material direction; the resort concept uses cooler stone paper and woodland ink. A full-width misty landscape carries the opening, with the existing invitation low on the left. Room imagery is large and consistent; prices and guest capacities remain sourced from the existing catalogue. Descriptions expand through native details controls. No availability, payments or new backend workflows are implied.

## Local files

- src/app/page.tsx: visual composition, local illustrative photographs, native description disclosure, footer credits.
- src/app/layout.tsx: locally hosted Sentient and Hanken Grotesk.
- src/app/globals.css: approved responsive styles using src/app/design/tokens.css as the shared token source.
- src/app/design/tokens.css: approved active tokens extracted from the reviewed page; unused scaffold base styles removed.
- public/images/design/ and public/fonts/: local presentation assets.

## Material and licenses

All photos are illustrative, not photos of the fictional Aavana property. Landscape: Uoaei1, CC BY-SA 3.0, Blassenstein Erlauftal mit Nebel 02 Panorama, Wikimedia Commons. Interiors: Basile Morin, CC BY-SA 4.0, Amantaka room/lounge photographs on Wikimedia Commons. Links and transformation disclosure are in the page's footer. Photographs are cropped and lightly desaturated.

Sentient 300/400 downloaded from the official Fontshare stylesheet; Hanken Grotesk 400 downloaded from the official Google Fonts stylesheet. Fonts are served locally to avoid runtime external font requests. Official source references: https://www.fontshare.com/fonts/sentient and https://fonts.google.com/specimen/Hanken+Grotesk . Official font licenses are retained in public/fonts/. Sentient binaries are fetched and hash-verified at install/build time and excluded from GitHub, consistent with its redistribution restrictions.

## Verification

Hero reviewed independently at 1280, 1440, 1920 and 375 widths: ship verdict. Full rendered Hallmark check: no FAIL or REFLEX; a four-section warning is intentionally retained because the existing catalogue material does not need filler sections. Twelve unit tests and desktop/mobile catalogue journeys passed. Before/after comparison is .hallmark/compare.html. Renderer screenshots are .hallmark/shots/.

Hallmark's static credit checker scans JSX image paths but only reads HTML documents for photo credits. The local .hallmark/jsx-credit-loader.mjs allows the checker to read the real credits already in page.tsx. All other checks are unchanged. The installed theme parser also needs CRLF normalization on Windows; .hallmark/theme-runner.mjs handles it without modifying the installed skill.

## Approval and next step

Owner approved the design and authorized production integration. The reusable system is saved in root DESIGN.md and approved tokens are shared by the page. The real estate's wide morning landscape and actual room/villa photographs would improve the result most. This design pass leaves the OpenRouter and database setup intact.

Finish review: ship. Compared with the old page, descriptions were less comparable and demo disclosure was less prominent. Resolved by displaying a meaningful room feature in each disclosure summary and a quiet illustrative-rates note beside the catalogue heading. All links and data logic remain intact.
