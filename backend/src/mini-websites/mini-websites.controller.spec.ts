import { Capability } from '../auth/capabilities';
import { REQUIRED_CAPABILITIES } from '../auth/require-capabilities.decorator';
import { MiniWebsitesController } from './mini-websites.controller';

describe('MiniWebsitesController authorization', () => {
  it('authorizes editing with the Mini Website permission instead of Linktree field permissions', () => {
    const updateHandler = Object.getOwnPropertyDescriptor(
      MiniWebsitesController.prototype,
      'update',
    )?.value as (...args: unknown[]) => unknown;
    const required = Reflect.getMetadata(
      REQUIRED_CAPABILITIES,
      updateHandler,
    ) as Capability[] | undefined;

    expect(required).toEqual([Capability.BusinessPagesMiniWebsitesAccess]);
    expect(required).not.toContain(Capability.BusinessLinktreesUpdate);
  });
});
