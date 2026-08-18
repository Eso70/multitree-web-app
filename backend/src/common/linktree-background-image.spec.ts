import { isLinktreeBackgroundImage } from './linktree-background-image';

const UPLOAD =
  '/images/upload/businesses/acme/linktrees/menu/background-image/photo-1.png';

describe('isLinktreeBackgroundImage', () => {
  it('accepts an uploaded same-origin path', () => {
    expect(isLinktreeBackgroundImage(UPLOAD)).toBe(true);
  });

  it.each([
    ['an absolute third-party URL', 'https://evil.example/x.png'],
    ['a protocol-relative URL', '//evil.example/x.png'],
    ['another same-origin path', '/api/v1/linktrees'],
    [
      'a CSS url() breakout',
      '/images/upload/x.png") , url("https://evil.example/x.png',
    ],
    ['a value with whitespace', '/images/upload/a b.png'],
    ['a parent-directory escape', '/images/upload/../../etc/passwd'],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isLinktreeBackgroundImage(value)).toBe(false);
  });

  it.each([[null], [undefined], [42], [{}], [[UPLOAD]]])(
    'rejects the non-string %p',
    (value) => {
      expect(isLinktreeBackgroundImage(value)).toBe(false);
    },
  );
});
