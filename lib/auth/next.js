// Where to send the user after sign-in or verification (SC-04 SR-025, FR-002).
// Internal paths only, query string kept; anything that could leave the site falls back to /locations
// (interim for SC-02 / SC-10, specs/003-sys-core Open question 2).

export const DEFAULT_NEXT = '/locations';

export function safeNext(next) {
  if (typeof next !== 'string') return DEFAULT_NEXT;
  // One leading slash, then not a second slash or a backslash (browsers read "/\host" as "//host")
  if (!/^\/(?![/\\])/.test(next)) return DEFAULT_NEXT;
  // No control characters or backslashes anywhere (tabs and newlines are dropped by URL parsers)
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return DEFAULT_NEXT;
  try {
    const url = new URL(next, 'http://cinematch.invalid');
    if (url.origin !== 'http://cinematch.invalid') return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}
