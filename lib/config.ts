/**
 * App-level defaults. These become per-organization settings in a later stage;
 * centralizing them here keeps timezone/currency out of component code.
 */
export const APP_TIMEZONE = "America/Chicago";
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_LOCALE = "en-US";

/** Contracts within this many days are considered "expiring soon". */
export const CONTRACT_EXPIRY_WARNING_DAYS = 60;

/** Sponsor asset storage. */
export const ASSET_BUCKET = "sponsor-assets";
export const MAX_ASSET_MB = 15;
export const ALLOWED_ASSET_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];
