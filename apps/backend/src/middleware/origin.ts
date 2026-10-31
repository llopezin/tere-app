/** Normalizes an origin or URL to `scheme://host[:port]` so env values with paths or trailing slashes still match. */
export function normalizeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}
