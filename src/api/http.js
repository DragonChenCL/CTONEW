// Utility to route cross-origin API requests through a local dev proxy to avoid CORS issues.
export function wrapUrlForDev(url) {
  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    console.log('wrapUrlForDev', url)
    try {
      const u = new URL(url)
      const origin = `${location.protocol}//${location.host}`
      if (u.origin !== origin) {
        return `/api-proxy?url=${encodeURIComponent(url)}`
      }
    } catch (e) {
      // Ignore non-absolute URLs
    }
  }
  return url
}
