/**
 * App-level defaults. These become per-organization settings in a later stage;
 * centralizing them here keeps timezone/currency out of component code.
 */
export const APP_TIMEZONE = "America/Chicago";
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_LOCALE = "en-US";

/** Contracts within this many days are considered "expiring soon". */
export const CONTRACT_EXPIRY_WARNING_DAYS = 60;
