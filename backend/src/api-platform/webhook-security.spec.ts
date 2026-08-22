import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { validateWebhookUrl } from './webhook-security';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

const lookupMock = lookup as unknown as jest.Mock;

function resolvesTo(...addresses: string[]) {
  lookupMock.mockResolvedValue(addresses.map((address) => ({ address })));
}

describe('validateWebhookUrl', () => {
  beforeEach(() => lookupMock.mockReset());

  it('accepts an https endpoint on a public address', async () => {
    resolvesTo('93.184.216.34');
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).resolves.toBeInstanceOf(URL);
  });

  it.each([
    'http://hooks.example.com/inbox',
    'https://user:pass@hooks.example.com/inbox',
    'https://hooks.example.com:8443/inbox',
    'https://localhost/inbox',
    'https://api.localhost/inbox',
    'not a url',
  ])('refuses %s before it resolves anything', async (value) => {
    resolvesTo('93.184.216.34');
    await expect(validateWebhookUrl(value)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    ['loopback', '127.0.0.1'],
    ['private class A', '10.0.0.5'],
    ['private class B', '172.16.9.9'],
    ['private class C', '192.168.1.1'],
    ['link-local, the cloud metadata endpoint', '169.254.169.254'],
    ['this-network', '0.0.0.0'],
    ['multicast', '239.1.1.1'],
    ['carrier-grade NAT', '100.64.0.1'],
    ['IPv6 loopback', '::1'],
    ['IPv6 unspecified', '::'],
    ['IPv6 unique local', 'fd00::1'],
    ['IPv6 link-local', 'fe80::1'],
  ])('refuses a host resolving to %s', async (_label, address) => {
    resolvesTo(address);
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * A hostname's owner controls its zone and can publish any `AAAA` record.
   * These forms are the same loopback and metadata addresses written as IPv6;
   * `isIP` calls them IPv6, so a prefix-only check read them as public and a
   * socket opened to one lands back on the private address.
   */
  it.each([
    ['IPv4-mapped loopback', '::ffff:127.0.0.1'],
    ['IPv4-mapped loopback in hex', '::ffff:7f00:1'],
    ['IPv4-mapped metadata endpoint', '::ffff:169.254.169.254'],
    ['IPv4-mapped private range', '::ffff:10.0.0.1'],
    ['IPv4-compatible loopback', '::127.0.0.1'],
  ])('refuses %s', async (_label, address) => {
    resolvesTo(address);
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses when any resolved address is private, not only the first', async () => {
    resolvesTo('93.184.216.34', '127.0.0.1');
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still accepts a genuine public IPv6 endpoint', async () => {
    resolvesTo('2606:2800:220:1:248:1893:25c8:1946');
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).resolves.toBeInstanceOf(URL);
  });

  it.each([[[]], [undefined]])(
    'refuses a hostname that resolves to nothing',
    async (addresses) => {
      lookupMock.mockResolvedValue(addresses ?? []);
      await expect(
        validateWebhookUrl('https://hooks.example.com/inbox'),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses a hostname that cannot be resolved', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(
      validateWebhookUrl('https://hooks.example.com/inbox'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
