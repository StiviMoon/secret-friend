/**
 * Get the base URL for the application
 * Uses NEXT_PUBLIC_SITE_URL in production, falls back to window.location.origin in client
 */
export function getBaseUrl(): string {
  // In server-side or build time
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  }

  // In client-side, prefer env variable, fallback to current origin
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}

