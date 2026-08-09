/**
 * Pure subdomain extraction logic.
 *
 * Extraction precedence:
 * 1. x-subdomain header (if present and non-empty) takes priority
 * 2. Otherwise, parse subdomain from host header (first segment when >2 parts)
 * 3. If host has ≤2 parts and no header, return empty string
 */
export function extractSubdomain(
  host: string,
  xSubdomainHeader?: string,
  rootDomain?: string,
): string {
  // x-subdomain header takes priority
  if (xSubdomainHeader) return xSubdomainHeader;
  const hostWithoutPort = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  const normalizedRoot = rootDomain?.split(":")[0].toLowerCase().replace(/\.$/, "");
  if (normalizedRoot && hostWithoutPort.endsWith(`.${normalizedRoot}`)) {
    const prefix =
      hostWithoutPort.slice(0, -(normalizedRoot.length + 1)).split(".")[0] ||
      "";
    return prefix === "www" ? "" : prefix;
  }
  // Parse from host
  const parts = hostWithoutPort.split(".");
  if (parts.length > 2) return parts[0] === "www" ? "" : parts[0];
  return "";
}
