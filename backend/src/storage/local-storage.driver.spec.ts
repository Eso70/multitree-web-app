import { resolve } from 'path';
import { resolveDefaultUploadDirectory } from './local-storage.driver';

describe('resolveDefaultUploadDirectory', () => {
  it('places backend uploads outside the frontend source tree', () => {
    expect(resolveDefaultUploadDirectory('C:/sponsor-krd/backend')).toBe(
      resolve('C:/sponsor-krd/.runtime/uploads'),
    );
  });

  it('supports processes launched from the repository root', () => {
    expect(resolveDefaultUploadDirectory('C:/sponsor-krd')).toBe(
      resolve('C:/sponsor-krd/.runtime/uploads'),
    );
  });
});
