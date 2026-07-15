# Age Verification Policy — Dates (dates.care)

Effective: July 2026 · For payment processor underwriting and regulatory review

## Policy statement
Dates is strictly an 18+ platform. No person under 18 may create an account,
maintain a profile, or access any feature of the service.

## Verification controls in effect

**1. Mandatory age gate at registration.** Account creation requires a date
of birth. The signup form programmatically rejects any date of birth
corresponding to an age below 18 (client- and metadata-recorded), and the
selected date is capped in the UI so under-18 dates cannot be submitted.
Each account stores the date of birth, an 18+ affirmation flag, and the
timestamp of affirmation in its authentication record.

**2. Photo verification.** The platform includes a photo verification flow
in which users submit a live photo matched against profile photos.
Verified accounts receive a verification badge; verification status is
stored per account.

**3. Payment-based age signal.** Paid features require completion of a
payment flow; payment instruments provide an additional adult-age signal
consistent with industry guidance ("age-gated payment gateway").

**4. Ongoing enforcement.** Content moderation and user reporting allow any
account suspected of being underage to be flagged. Staff can suspend
accounts pending review. Confirmed underage accounts are terminated and
associated data handled per our Privacy Policy and legal obligations.

## Records
For each account we retain: date of birth (never displayed publicly), 18+
affirmation timestamp, verification status, and moderation history. These
records are available to support disputes, law-enforcement requests, and
processor compliance reviews.
