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
- Staff-calendar exception approved November 3, 2026: the primary save/apply control uses a filled woodland surface with light text. Secondary controls and the guest footer staff link remain outlined or typographic. Other guest controls are unchanged.
- Provide keyboard access, instant visible focus, readable contrast and explicit validation. Keep semantic headings, meaningful image alternatives and a skip link.
- Use native disclosures where appropriate. Do not hide information essential to comparing or confirming a booking.
- Still by default; brief hover/press feedback only. Respect reduced motion. Content remains visible if scripting fails.

## Future booking and staff screens

Guest redesign approved November 4, 2026 after three mock revisions: photographic room rows with galleries and semantic amenity icons; a visible three-step workbench; arrival/departure calendar with exclusive checkout; quantities bounded by availability without public stock counts; per-type guest allocations with derived totals; click-only room disclosures; a compact squish-style test outcome switch; and tabular nightly charges. Confirmation groups its filled success seal with the heading, shows readable dates, and provides full-reference copying. The pre-payment review uses a document icon, never a success tick. `--guest-soft` extends the existing neutral palette; guest primary actions remain outlined.

- Carry the same tokens, type, spacing and controls into the three-step guest booking flow.
- Keep selection, itemized prices, taxes, availability changes and confirmation easy to scan. Do not imply successful bookings or messages before real persistence succeeds.
- Staff screens are practical workspaces: Hanken for forms and tables, compact but accessible controls, clear states, and no decorative photographic hero. Share the palette without copying the marketing layout.
- The approved staff calendar uses a seven-night matrix with one room row per type, weekly paging for ranges up to 31 nights, and one selected-night editor. Mobile shows one date and opens its editor on selection. Picker endpoints are inclusive stay nights; the inventory API retains its exclusive end. Keep server data separate from unsaved per-night drafts.
- Keep implementation notes out of the main guest journey. Demo limitations and photo credits remain easy to find.

## Material and exports

Current photographs are licensed illustrative placeholders, not photos of Aavana. Preserve visible access to attribution and transformation notices. Replace them with authorized estate and room/villa photography when available; never invent amenities, awards or testimonials.

Day 3 owner-approved demo exception: use the agreed synthetic room amenities in `src/lib/accommodation.ts`, identified as illustrative accommodation details. This does not authorize claims about a real property, included meals, extra beds, awards or testimonials.

See `public/fonts/` for font license files, `public/images/design/CREDITS.md` for photograph provenance, and `docs/DESIGN_REVIEW.md` for approval and verification history. No additional token export formats are needed yet.

Guest polish and imagery approved November 4, 2026: use the four supplied Gemini illustrations only in their assigned room galleries (Estate room reading corner/bathroom, Garden room sit-out, Estate villa kitchen concept). Do not share those image choices across accommodation types or show visible image captions/thumbnail labels. Keep meaningful accessible descriptions and a quiet illustrative/AI note. Notifications reserve space in the active booking panel rather than overlaying content. Offer separately unchecked terms/data-use choices with centred readable dialogs; the approved draft remains explicitly non-binding. The email-sent message is an explicitly labelled example beside an unsent preview, with no downloadable confirmation.

Staff enquiry workbench approved November 5, 2026 after interactive Hallmark prototype review: use a scannable conversation queue beside a spacious reading pane, Hanken for all interface headings and message content, Sentient only for the estate wordmark, and the existing stone/woodland palette. Distinguish sender names, original messages, contact details and status through type scale, weight and spacing. Use accessible monochrome website/email/WhatsApp SVG icons with text labels. Keep enquiry content and the Assistant area in separate tabs. Draft editing is explicit and remains unsent; analysis stays disabled until its approved integration. The desktop queue scrolls within its column for long result pages; mobile opens a dedicated reading view with an Inbox return control. Simulated intake uses an accessible, viewport-bounded dialog. Reuse installed React Aria controls, preserve 48px targets and keyboard focus, and never invent subject lines, extracted values or AI results. Enquiry-specific tokens and selectors remain namespaced; the approved calendar and guest design stay in their own systems.

Staff navigation refinement requested November 5, 2026: authenticated Calendar and Enquiries use one shared header with the estate wordmark, visible Staff workspace label, Guest site, Enquiries, Calendar and Sign out in the same order. Mark the current section and wrap navigation below the identity row on narrow screens; retain every action and unsaved-change protection. Draft status uses one concise Unsent draft label and brief save feedback.
