const SCRIPT_SAFE_ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function jsonLdScript(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => SCRIPT_SAFE_ESCAPES[character]);
}
