/**
 * Every price the app charges, in one place.
 *
 * Each screen used to carry its own number and they drifted: mail charged the
 * sender 20 for a label that locked nothing while chat charged 10 and locked
 * properly, and the Credits screen advertised a third set of figures that
 * matched neither. Everything reads from here now, so a price change is one
 * edit rather than a hunt - and the page that explains the prices is driven by
 * the same constants the biller uses, so the two cannot disagree again.
 */

/** Live chat, browsing profiles, likes and winks cost nothing. */
export const CHAT_COST = 0;

/** An ordinary private mail: the same price to send and to open. */
export const MAIL_SEND_COST = 5;
export const MAIL_OPEN_COST = 5;

/** Attachments, charged on top of the mail, and the same at both ends. */
export const MAIL_PHOTO_COST = 10;
export const MAIL_AUDIO_COST = 10;
export const MAIL_VIDEO_COST = 20;

/** Exclusive is a flat price whatever it contains, at both ends. */
export const EXCLUSIVE_SEND_COST = 50;
export const EXCLUSIVE_UNLOCK_COST = 50;

/** Calls, per minute, charged to the caller only. Answering is free. */
export const AUDIO_CALL_PER_MINUTE = 40;
export const VIDEO_CALL_PER_MINUTE = 50;
