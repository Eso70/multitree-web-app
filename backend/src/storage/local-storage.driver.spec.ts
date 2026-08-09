import { resolve } from 'path';
import { resolveDefaultUploadDirectory } from './local-storage.driver';

describe('resolveDefaultUploadDirectory', () => {
  it('places backend uploads outside the frontend source tree', () => {
    expect(resolveDefaultUploadDirectory('C:/multitree/backend')).toBe(
      resolve('C:/multitree/.runtime/uploads'),
    );
  });

  it('supports processes launched from the repository root', () => {
    expect(resolveDefaultUploadDirectory('C:/multitree')).toBe(
      resolve('C:/multitree/.runtime/uploads'),
    );
  });
});
