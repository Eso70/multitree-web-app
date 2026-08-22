import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    // Carrier-grade NAT. Routable inside a provider's network and used by
    // overlay networks, so it reaches hosts this process should not.
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    parts[0] >= 224
  );
}

/**
 * The IPv4 address inside an IPv6 form that carries one, or `null`.
 *
 * `::ffff:127.0.0.1` and `::ffff:7f00:1` are the same loopback address written
 * as IPv6, and a socket opened to either lands on 127.0.0.1. `isIP` calls them
 * IPv6, so a check that only looks for `fc`/`fd`/`fe8`-`feb` prefixes reads
 * them as ordinary public addresses. A hostname's owner controls its zone and
 * can publish whatever `AAAA` record they like, which made that an opening
 * straight back to loopback and to the cloud metadata endpoint.
 *
 * The deprecated IPv4-compatible form `::a.b.c.d` is unwrapped for the same
 * reason.
 */
function embeddedIpv4(address: string): string | null {
  const normalized = address.toLowerCase();

  const dotted = normalized.match(/^::(?:ffff:)?((?:\d{1,3}\.){3}\d{1,3})$/);
  if (dotted) return dotted[1];

  const hex = normalized.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = Number.parseInt(hex[1], 16);
    const low = Number.parseInt(hex[2], 16);
    return [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join('.');
  }

  return null;
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);

  const embedded = embeddedIpv4(address);
  if (embedded) return isPrivateIpv4(embedded);

  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

export async function validateWebhookUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Webhook URL is invalid');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new BadRequestException(
      'Webhook URL must use HTTPS without credentials or a custom port',
    );
  }
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new BadRequestException('Webhook URL cannot target a private host');
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('Webhook hostname could not be resolved');
  }
  if (
    !addresses.length ||
    addresses.some((item) => isPrivateIp(item.address))
  ) {
    throw new BadRequestException(
      'Webhook URL cannot target a private network',
    );
  }
  return url;
}
