export function sameDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function matchesAllowedDomain(hostname: string, canonicalDomain: string, additionalDomains: string[]) {
  return sameDomain(hostname, canonicalDomain) || additionalDomains.some((domain) => sameDomain(hostname, domain));
}
