import { ConflictException } from '@nestjs/common';
import { rethrowRootSlugConflict } from './root-slug-conflict';

/**
 * Every writer of a root-domain page shares this translation. The rule lived
 * as a private copy on one surface, which is why the two platform surfaces
 * answered a lost slug race with a 500 while the Creator surface answered it
 * with a 409.
 */
describe('rethrowRootSlugConflict', () => {
  it('reports a lost race for a root slug as a conflict', () => {
    expect(() =>
      rethrowRootSlugConflict({
        code: '23505',
        constraint: 'root_public_slugs_pkey',
      }),
    ).toThrow(ConflictException);
  });

  it('leaves a unique violation on another constraint alone', () => {
    // Reporting this as a taken public URL would send the caller looking for a
    // slug collision that never happened.
    const error = {
      code: '23505',
      constraint: 'mini_websites_business_id_slug_key',
    };
    expect(() => rethrowRootSlugConflict(error)).toThrow();
    try {
      rethrowRootSlugConflict(error);
    } catch (thrown) {
      expect(thrown).toBe(error);
    }
  });

  it('leaves an unrelated failure alone', () => {
    const error = new Error('connection terminated');
    try {
      rethrowRootSlugConflict(error);
    } catch (thrown) {
      expect(thrown).toBe(error);
    }
  });

  it('rethrows a thrown value that carries no SQLSTATE at all', () => {
    // `catch` binds `unknown`, so the guard has to survive null being thrown
    // rather than reading `.constraint` off it.
    expect(() => rethrowRootSlugConflict(null)).toThrow();
    try {
      rethrowRootSlugConflict(null);
    } catch (thrown) {
      expect(thrown).toBeNull();
    }
  });
});
