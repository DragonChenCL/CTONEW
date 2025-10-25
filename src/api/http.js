// Utility to route cross-origin API requests through a local dev proxy to avoid CORS issues.
export function wrapUrlForDev(url) {
  const proxyFlag = `${import.meta.env.VITE_ENABLE_PROXY ?? ''}`.toLowerCase().trim()
  const shouldProxy = import.meta.env.DEV || proxyFlag === 'true'

  if (!shouldProxy) {
    return url
  }

  if (typeof window === 'undefined' || typeof location === 'undefined') {
    return url
  }

  try {
    const u = new URL(url)
    const origin = `${location.protocol}//${location.host}`
    if (u.origin !== origin) {
      return `/api-proxy?url=${encodeURIComponent(url)}`
    }
  } catch (e) {
    // Ignore non-absolute URLs
  }

  return url
}
