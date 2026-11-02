# Hill Resort Booking — Public Requirements

## Product goal

Deliver a reviewable demo for a fictional coffee-estate resort in Chikkamagaluru. Guests can browse accommodation, check dates and prices, submit a multi-room booking with simulated payment, and contact the resort. Reservations staff can manage availability and work a unified enquiry inbox.

## Core demo requirements

- Browse rooms and villas with photos, amenities, availability, and itemised prices.
- Select shared dates, guest counts, and quantities across mixed room types.
- Show nightly charges, taxes, and total in paise-accurate server-calculated quotes.
- Confirm a booking through a simulated payment flow and display a persisted confirmation.
- Prevent overbooking with atomic, transactional inventory reservation.
- Provide a seeded staff login with visible demo credentials, session protection, logout, and staff-only administration.
- Let staff edit nightly rates, website allotment, and blackout dates.
- Accept enquiries from a web form plus simulated email and WhatsApp sources.
- Classify enquiries, extract dates/guests/budget, assign an owner, and draft a reply using OpenRouter.
- Keep drafts editable and unsent; low-confidence or failed AI work remains in manual review.
- Flag complaints for GM attention.

## Deferred from this demo

Real payment, messaging, reservation-system/channel-manager integration, promo codes, exports, dedicated event-form workflows, guest accounts, cancellations/refunds, and production launch certification.

## Quality constraints

- Use synthetic data only.
- Keep the OpenRouter key server-side and out of logs and Git.
- Support mobile, keyboard navigation, useful validation, loading states, and slow-network image performance.
- Never invent uncertain enquiry details; preserve uncertainty for staff review.

## Acceptance examples

1. A guest books two rooms and one villa for the same stay and receives one confirmation.
2. Competing requests for the last unit cannot both succeed.
3. A failed simulated payment leaves availability unchanged.
4. An unauthenticated request cannot mutate staff data.
5. The supplied sample enquiries reach the inbox with category, extracted fields, assignment, and editable drafts.
