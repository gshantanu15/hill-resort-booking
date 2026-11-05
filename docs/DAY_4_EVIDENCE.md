# Day 4 — November 5, 2026

## Milestone 1: guest date picker — owner approved

Reproduced at 1366×768: React Aria gave the desktop popover a 392px maximum height, but its 621px contents used visible overflow. The controls could extend beyond the viewport while the modal popover prevented background scrolling.

The popover now scrolls internally within React Aria's calculated height, with contained overscroll, explicit automatic flipping and 16px viewport padding. The mobile modal retains internal scrolling and now leaves 16px above/below its maximum height. Calendar selection, exclusive checkout, validation and submission logic are unchanged.

Checks: five Chromium browser cases passed at 1366×768, 1920×1080, 1280×480, 960×540 and 390×664. The 960×540 case represents the effective CSS viewport of a 1920×1080 browser at 200% zoom; native browser zoom remains part of manual review. Cases exercise month navigation, expanded manual inputs, validation, reachable Apply, saved dates, cancelled edits, Escape/Close/outside dismissal, restored trigger focus and working page-wheel scrolling afterward. All 46 unit tests, TypeScript and ESLint pass. No database write tests or booking submissions were performed; no test branch was needed. Screenshots are ignored under output/playwright/.

Local review: http://localhost:3000/book (normal development environment, Webpack dev server). The owner approved this milestone on November 5. No deployment has occurred. Next: persistent public enquiry intake; milestones 3–7 remain pending.
