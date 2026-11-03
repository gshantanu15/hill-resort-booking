# Day 2 booking rules

Owner-approved demo policy, November 3, 2026. Accommodation only: packages, meals, cancellation terms, real payments, and tax invoices remain outside this policy.

## Guests and dates

Adults are 18+; children are 0–17. Every guest including infants counts against configured capacity. Each room/villa needs at least one adult. No extra beds or infant exemptions. Allocations per room-type group must sum to overall booking counts and permit a valid distribution within that group; physical rooms are not assigned.

Use Asia/Kolkata dates, allow same-day arrival, reject past arrival, and permit 1–14 nights. Checkout consumes neither stock nor charges. The fixed seed covers November 3, 2026–May 1, 2027 stay nights; latest checkout is May 2.

## Inclusive prices and tax

The owner chose tax-inclusive prices and revised the Estate seed to INR 9,000 Sunday–Thursday and INR 9,900 Friday/Saturday. Garden/villa prices retain their approved 10% weekend uplift. Catalogue guide prices never substitute for missing nightly rates.

The accommodation calculation uses 5% at a net value up to INR 7,500 per unit/night, and 18% above it. Sources: [GST Council September 2025 FAQ, question 71](https://gstcouncil.gov.in/sites/default/files/2025-09/faq_0.pdf), [CBIC accommodation rate table](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html), and inclusive extraction under [Rule 35](https://cbic-gst.gov.in/pdf/01062021-CGST-Rules-2017-Part-A-Rules.pdf). The table's older lower-band row is superseded by the 2025 guidance.

Technical inference: gross amounts at most INR 7,875 fit the lower band; amounts above INR 8,850 fit the higher band. Prices between those bounds satisfy neither net-value condition and are rejected. This caused the explicit owner-approved Estate revision; the system never silently chooses a slab from gross price alone.

Store integer paise; calculate with BigInt. Extract net and round half up to one paise per unit/night, make tax the residual, then multiply the rounded unit breakdown by quantity and sum nights. This is the demo rounding convention, not statutory invoice rounding. One INR 9,000 Estate night contains net INR 7,627.12 and GST INR 1,372.88. Two units total INR 18,000: net INR 15,254.24 plus GST INR 2,745.76.

Registration, place of supply, CGST/SGST invoice presentation, ITC, packages/discounts, law changes, and real payment/time-of-supply treatment require accounting/business review before production. This is a documented synthetic accommodation calculation.

## Confirmation and staff changes

All stay nights need configured inventory and a positive rate. Missing setup, blackout, or insufficient stock stops new sales. Physical stock, website ceiling, nightly allotment, and guests-per-room are distinct. Outside-channel reserve is a configured allocation, not a live integration.

Quotes are server-signed and valid for 15 minutes. They preserve selection, names, nightly amounts, and tax. Changed/expired quotes return an updated quote with a conflict response; Day 3 must show it for renewed guest acceptance. Quotes hold no stock.

After simulated payment success, one transaction rechecks quote/stock, creates the confirmed booking and snapshots, and increments all nightly counters. Failed payment or any failed item creates no booking/reservation. Stable lock ordering avoids opposite acquisition order across mixed room types.

Submission UUIDs serialize concurrent retries through a transaction advisory lock. Same identifier/request returns the original result; changed details conflict. Existing successful retries work after quote expiry. The random confirmation reference exposes stored accommodation details without contact data, submission IDs, or fingerprints.

Staff locks inventory before rates. Staff cannot edit booked counters, physical stock, or channel ceilings. Allotment remains between booked and website limit. Blackouts stop new sales; existing confirmations retain accepted names and prices.

## Learning

- Availability is a snapshot; confirmation locks and rechecks stock to guarantee correctness.
- Database checks protect every writer; server validation explains errors and checks cross-table rules.
- Authentication identifies a session; authorization checks its current staff role on every protected request.
- Idempotency prevents duplicate bookings; it does not reserve inventory ahead of confirmation.
- Day 3 adds guest selection, review, simulated payment, and confirmation screens on these APIs.
