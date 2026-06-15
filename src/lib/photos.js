/**
 * Upgrade an OpenF1 headshot URL to its high-resolution variant.
 * Safe to call with null/undefined.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function getHighQualityPhoto(url) {
    if (!url) return null;
    return url.replace("_small", "_large").replace("1col", "2col");
}
