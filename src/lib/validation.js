// Lightweight, dependency-free validation shared between server actions and tests.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    return typeof email === "string" && EMAIL_REGEX.test(email.trim());
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
