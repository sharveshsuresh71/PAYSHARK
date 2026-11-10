/**
 * SSRF (Server-Side Request Forgery) Protection Module
 * Restricts outbound HTTP/HTTPS requests to verified, trusted hostnames.
 */

const ALLOWED_HOSTS = new Set([
  'api-m.sandbox.paypal.com',
  'api-m.paypal.com',
  'api.groq.com',
]);

const ALLOWED_DOMAINS_SUFFIX = [
  '.neon.tech',
  '.paypal.com',
];

/**
 * Checks whether an IP or hostname resolves to internal/private network addresses
 * (RFC 1918, RFC 3927 link-local, loopback, cloud metadata endpoints).
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();

  // Localhost checks
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return true;
  }

  // AWS / GCP / Azure metadata endpoint (169.254.169.254)
  if (normalized.startsWith('169.254.')) {
    return true;
  }

  // RFC 1918 Private IPv4 ranges
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(normalized)) {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized)) {
    return true;
  }
  if (/^0\./.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against the SSRF allowlist and IP blocklist.
 */
export function assertSafeUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`SSRF_BLOCKED: Invalid URL format (${urlString})`);
  }

  if (url.protocol !== 'https:' && (process.env.NODE_ENV === 'production' || url.protocol !== 'http:')) {
    throw new Error(`SSRF_BLOCKED: Protocol ${url.protocol} is not allowed (HTTPS required)`);
  }

  const host = url.hostname.toLowerCase();

  if (isPrivateOrReservedHost(host)) {
    throw new Error(`SSRF_BLOCKED: Connection to private or reserved host (${host}) is denied`);
  }

  const isExplicitlyAllowed = ALLOWED_HOSTS.has(host);
  const isDomainSuffixAllowed = ALLOWED_DOMAINS_SUFFIX.some((suffix) => host.endsWith(suffix));

  if (!isExplicitlyAllowed && !isDomainSuffixAllowed) {
    throw new Error(`SSRF_BLOCKED: Target host ${host} is not in the PAYSHARK allowlist`);
  }

  return url;
}
