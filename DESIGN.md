---
name: "Aavana Estate"
description: "Quiet photographic hospitality for a resort booking demo"
colors:
  paper: "oklch(97.5% 0.006 92)"
  ink: "oklch(27% 0.022 145)"
  muted: "oklch(48% 0.018 145)"
  rule: "oklch(85% 0.012 110)"
  accent: "oklch(37% 0.035 145)"
  light: "oklch(99% 0.004 92)"
  hero-ink: "oklch(98% 0.006 92)"
  scrim-left: "oklch(17% 0.022 145 / 0.8)"
  scrim-mid: "oklch(17% 0.022 145 / 0.26)"
  scrim-clear: "oklch(17% 0.022 145 / 0)"
  guest-soft: "oklch(92% 0.016 92)"
  guest-error: "oklch(43% 0.09 28)"
  guest-warning: "oklch(46% 0.075 78)"
  guest-info: "oklch(43% 0.06 235)"
  guest-dialog-scrim: "oklch(20% 0.02 145 / 0.42)"
typography:
  display:
    fontFamily: "Sentient, Georgia, serif"
    fontSize: "clamp(52px, 7.4vw, 96px)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sentient, Georgia, serif"
    fontSize: "clamp(40px, 4.8vw, 64px)"
    fontWeight: 400
    lineHeight: 1.08
  title:
    fontFamily: "Sentient, Georgia, serif"
    fontSize: "56px"
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Hanken Grotesk, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Hanken Grotesk, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
rounded:
  control: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-hero:
    backgroundColor: "transparent"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.control}"
    height: "52px"
  button-staff-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.light}"
    rounded: "{rounded.control}"
    height: "48px"
  input-guest:
    backgroundColor: "{colors.light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "48px"
  room-panel:
    backgroundColor: "{colors.guest-soft}"
    textColor: "{colors.ink}"
    padding: "28px"
---

# Design: Aavana Estate

Owner-approved on November 2, 2026. This is the shared design philosophy for future development. Read it before changing or adding guest or staff screens. Extend it deliberately; do not re-theme individual pages.

## Overview

**Creative North Star: "Quiet photographic hospitality"**

Quiet photographic hospitality: pristine, contemporary and calming. Sell the experience through space, light and honest photography. Every element must help guests understand a stay or complete a booking. Clarity and accessibility take priority over decoration.

**Key Characteristics:**

- Photographic hospitality with a restrained editorial voice.
- Stone surfaces, woodland ink and locally hosted typography.
- Clear booking decisions and practical staff workspaces.

## Colors

The frontmatter mirrors the canonical OKLCH values in `src/app/design/tokens.css`. Woodland accent supports interaction; ink and muted serve text; paper, light and guest-soft provide neutral surfaces; rule marks boundaries. Hero ink and scrims support photographic contrast. Guest error, warning and info tokens retain their semantic roles.

## Typography

Sentient carries guest display headings and the estate wordmark. Hanken Grotesk carries body text, controls, prices and practical staff interface content. Keep labels in sentence case, headings roman and all fonts locally hosted. Home and catalogue title sizes adapt on narrow screens; staff enquiry headings use Hanken.

## Layout

Use the existing centred container, shrinking grid tracks and shared spacing rhythm. Guest photography leads; staff screens prioritise scanning and task completion. Desktop room rows pair galleries with copy; mobile stacks them. The approved surface-specific dimensions and responsive exceptions remain recorded below.

## Elevation & Depth

Guest page sections are flat. Create hierarchy with photography, spacing, subtle rules and tonal surfaces. Preserve existing dialog treatment where implemented; do not introduce a page-wide shadow vocabulary.

## Shapes

Use square photographic frames and restrained control corners. Preserve the established geometry of dialogs, success seals and specialist controls rather than applying a new radius system.

## Components

Outlined guest actions reverse on photography; the approved staff primary action is filled. Fields expose explicit validation and visible focus. Catalogue panels retain live names, prices, capacities, image selection and booking destinations. Native disclosures keep secondary information available. The footer retains its demo notice, source/staff/enquiry links and photograph credits.

The live-panel previews in `.impeccable/design.json` show these implemented primitives. They are documentation examples; application components remain authoritative for behaviour and data.

## Do's and Don'ts

### Do

- Do reuse the approved shared tokens and styles.
- Do keep live room data, meaningful image alternatives and native disclosures.
- Do respect reduced motion and preserve visible keyboard focus.

### Don't

- Don't invent amenities, awards, reviews or successful transactions.
- Don't re-theme individual pages or share assigned concept images across room types.
- Don't add decorative gradients, shadows or continuous motion outside approved exceptions.

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

Guest home live selections approved November 6, 2026: retain the existing header. The panoramic hero uses the existing mist photograph at 1.2 saturation, a 600px desktop minimum height, a large lower-left heading, and a ruled invitation band with the room link and downward arrow. Mobile stacks the invitation and action within a 620px minimum height. The footer uses woodland ink with paper text, a 64px desktop estate signature and 56px vertical spacing; mobile reduces its scale and spacing. Preserve the demo notice, footer links and native photograph disclosure. These treatments are scoped to the home page.

Catalogue live selections approved November 6, 2026: room copy sits on the existing `--guest-soft` stone surface with 28px padding, a 56px desktop room heading, single-column icon highlights and a full-width outlined booking link with an arrow. The compact native disclosure is labelled “Stay details”; retain the description and complete amenity list, displayed as wrapping text separated by slashes. Use responsive title sizing and preserve live names, capacities, prices, gallery state and booking destinations for every room type.

Quiet continuity approved November 6, 2026 supersedes the earlier estate mist timing: the estate heading starts misty as the section enters the viewport and reaches full sharpness at its anchor below the sticky header. Desktop starts at up to 3px blur and mobile at up to 1px. Gallery photos crossfade over 220ms only after the requested image loads; the previous photo stays visible during loading and on failure, and the latest request wins. Only requested photos are fetched at full size. Native stay disclosures expand and collapse over 200ms where intrinsic-size transitions are supported, with native instant disclosure as the fallback. Reduced motion keeps photo and disclosure changes immediate. Preserve the existing hero arrival and all current layouts, data and booking destinations.

Hero arrival exception approved November 6, 2026: the main heading and invitation settle through a subtle 12px movement and small clip reveal over 720ms, with the invitation delayed 100ms. Keep content visible throughout, run once on arrival, and use the static layout for reduced motion. This complements the closing estate effect; room catalogue content remains still until a guest changes a photo or disclosure.

Footer border fix requested November 6, 2026: restrict the transparent navigation underline to header links, preserving all four sides of the outlined staff sign-in link at rest and on hover.

Guest chrome adaptation requested November 7, 2026: home and enquiry share a centered desktop wordmark, visible booking action and a square two-line menu control on smaller screens. The expanded closing footer keeps the home design’s woodland surface, guest links and photo disclosure. The enquiry body deliberately follows the separate port 3013 reference with a local Rethink Sans face, warm paper, a sage form panel and a licensed regional shade-grown coffee photograph. This exception is limited to the enquiry body; staff and booking styles and application flows are unchanged.
