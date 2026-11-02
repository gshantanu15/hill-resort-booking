# Design: Aavana Estate

Owner-approved on November 2, 2026. This is the shared design philosophy for future development. Read it before changing or adding guest or staff screens. Extend it deliberately; do not re-theme individual pages.

## Philosophy

Quiet photographic hospitality: pristine, contemporary and calming. Sell the experience through space, light and honest photography. Every element must help guests understand a stay or complete a booking. Clarity and accessibility take priority over decoration.

## System

- Guest pages: restrained editorial style, adapted from Hallmark Atelier. The home page is a photographic catalogue with a large landscape opening and a lower-left invitation.
- Pale stone surfaces, woodland ink, subtle rules and a restrained dark accent. No pure-white cards, decorative gradients, status dots, invented reviews or unverified property claims.
- Sentient 300/400 for display and room headings; Hanken Grotesk 400 for body text, controls, prices and labels. Fonts are hosted locally.
- Room imagery stays large and consistently cropped. Descriptions use native disclosures with a useful visible feature summary. Prices and capacities come from application data.

## Tokens and layout

`src/app/design/tokens.css` is the source of truth for approved colours, fonts and control timing. `src/app/globals.css` implements the responsive layout. Use these tokens rather than hard-coded colours or parallel palettes.

- Paper: `--paper`, `--light`; text: `--ink`, `--muted`; boundaries: `--rule`; interaction: `--accent`.
- Hero: `--hero-ink` and the three `--scrim-*` tokens provide legible text over photography.
- One centred container capped at 1440px; gutters grow on wider displays. Use shrinking grid tracks with `minmax(0, 1fr)`.
- Desktop column gap: 32px. Use a 4px spacing scale and generous, purposeful section spacing.
- The hero invitation and action fit within the first desktop screen. Mobile stacks content without clipping or horizontal overflow.
- Labels use sentence case without letter spacing. Headings are roman, never a single italic word within a roman heading.

## Controls and accessibility

- One outlined primary control style, 2px corners, 48px minimum height. The hero uses the same style with colours reversed for contrast.
- Provide keyboard access, instant visible focus, readable contrast and explicit validation. Keep semantic headings, meaningful image alternatives and a skip link.
- Use native disclosures where appropriate. Do not hide information essential to comparing or confirming a booking.
- Still by default; brief hover/press feedback only. Respect reduced motion. Content remains visible if scripting fails.

## Future booking and staff screens

- Carry the same tokens, type, spacing and controls into the three-step guest booking flow.
- Keep selection, itemized prices, taxes, availability changes and confirmation easy to scan. Do not imply successful bookings or messages before real persistence succeeds.
- Staff screens are practical workspaces: Hanken for forms and tables, compact but accessible controls, clear states, and no decorative photographic hero. Share the palette without copying the marketing layout.
- Keep implementation notes out of the main guest journey. Demo limitations and photo credits remain easy to find.

## Material and exports

Current photographs are licensed illustrative placeholders, not photos of Aavana. Preserve visible access to attribution and transformation notices. Replace them with authorized estate and room/villa photography when available; never invent amenities, awards or testimonials.

See `public/fonts/` for font license files, `public/images/design/CREDITS.md` for photograph provenance, and `docs/DESIGN_REVIEW.md` for approval and verification history. No additional token export formats are needed yet.
