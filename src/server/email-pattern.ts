/** Deliberately loose: one "@", no whitespace, a dot in the domain. The LMS and the follow-up email are the real check. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 5321 maximum mailbox length. */
export const EMAIL_MAX_LENGTH = 320;
