// Lightweight, dependency-free validation shared between server actions and tests.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Canonical email form used for storage, lookups, and sending: trimmed and lowercased. */
export function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Validate an email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    return typeof email === "string" && EMAIL_REGEX.test(normalizeEmail(email));
}

export function isProStatus(status) {
    return status === "active" || status === "trialing";
}

const SAFE_PATHNAME = /^\/(?:$|[^/\\])/;
const MAX_DECODE_ROUNDS = 5;

/** Percent-decodes until stable; returns null if the value never settles or is malformed. */
function fullyDecode(value) {
    let current = value;
    for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
        let next;
        try {
            next = decodeURIComponent(current);
        } catch {
            return null;
        }
        if (next === current) return current;
        current = next;
    }
    return null;
}

/**
 * Post-login destination: a same-origin path only, else "/". The resolved pathname must be "/"
 * or start with one "/" followed by a character other than "/" or "\", also after
 * percent-decoding, so "//host", "/.//host", "/\host" and "/%2F%2Fhost" can never become a
 * protocol-relative URL in the browser or a downstream redirect.
 */
export function safeRedirectPath(value, origin) {
    if (typeof value !== "string" || !value) return "/";
    // Backslashes and control characters are normalised inconsistently by URL parsers.
    if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";

    let base;
    let target;
    try {
        base = new URL(origin);
        target = new URL(value, base.origin);
    } catch {
        return "/";
    }
    if (target.origin !== base.origin) return "/";

    if (!SAFE_PATHNAME.test(target.pathname)) return "/";

    // Re-check the decoded form, resolved again, so encoded dot segments and slashes cannot
    // turn into "//host" if a later hop decodes the path.
    const decodedPath = fullyDecode(target.pathname);
    if (decodedPath === null || /[\\\u0000-\u001f\u007f]/.test(decodedPath)) return "/";
    if (!SAFE_PATHNAME.test(decodedPath)) return "/";
    try {
        const reparsed = new URL(decodedPath, base.origin);
        if (reparsed.origin !== base.origin || !SAFE_PATHNAME.test(reparsed.pathname)) return "/";
    } catch {
        return "/";
    }

    return `${target.pathname}${target.search}${target.hash}`;
}

/**
 * Validate password strength. Requires at least 8 characters with both a
 * letter and a number.
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password) {
    if (typeof password !== "string" || password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain a letter and a number" };
    }
    return { valid: true };
}
