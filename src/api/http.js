// Utility to route cross-origin API requests through a local dev proxy to avoid CORS issues.
export function wrapUrlForDev(url) {
  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    try {
      const u = new URL(url)
      const origin = `${location.protocol}//${location.host}`
      if (u.origin !== origin && import.meta?.env?.DEV) {
        return `/api-proxy?url=${encodeURIComponent(url)}`
      }
    } catch (e) {
      // Ignore non-absolute URLs
    }
  }
  return url
}
