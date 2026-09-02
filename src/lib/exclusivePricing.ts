/**
 * What an exclusive photo costs, in one place.
 *
 * Chat and mail both sell the same thing, and when each screen carried its own
 * number they drifted: mail charged the sender 20 for a label that locked
 * nothing, while chat charged 10 and locked properly. Both now read from here,
 * so a price change is one edit rather than a hunt.
 */

/** Charged to the sender when they mark a photo exclusive. */
export const EXCLUSIVE_SEND_COST = 50;

/** Charged to the recipient, once, to open it. */
export const EXCLUSIVE_UNLOCK_COST = 50;
