import { toRecord, toRecordArray, toText } from './coerce';

describe('toRecord', () => {
  it('passes a plain object through', () => {
    expect(toRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it.each([[null], [undefined], ['x'], [7], [[1, 2]], [true]])(
    'collapses %p to an empty record',
    (input) => {
      expect(toRecord(input)).toEqual({});
    },
  );
});

describe('toRecordArray', () => {
  it('narrows each entry to a record', () => {
    expect(toRecordArray([{ a: 1 }, 'nope', null])).toEqual([{ a: 1 }, {}, {}]);
  });

  it('returns an empty array for non-arrays', () => {
    expect(toRecordArray({ a: 1 })).toEqual([]);
    expect(toRecordArray(undefined)).toEqual([]);
  });
});

describe('toText', () => {
  it('returns a string unchanged', () => {
    expect(toText('hello')).toBe('hello');
  });

  it('stringifies finite numbers', () => {
    expect(toText(2024)).toBe('2024');
    expect(toText(12.5)).toBe('12.5');
  });

  it('stringifies booleans and bigints', () => {
    expect(toText(true)).toBe('true');
    expect(toText(10n)).toBe('10');
  });

  describe('preserves the falsy-fallback behaviour of String(value || fallback)', () => {
    it.each([
      [null, ''],
      [undefined, ''],
      ['', ''],
      [0, ''],
      [false, ''],
    ])('%p resolves to the default fallback', (input, expected) => {
      expect(toText(input)).toBe(expected);
    });

    it('uses an explicit fallback for falsy input', () => {
      expect(toText(null, 'none')).toBe('none');
      expect(toText(0, '964')).toBe('964');
    });
  });

  it('falls back instead of producing [object Object]', () => {
    expect(toText({ nested: true })).toBe('');
    expect(toText({ nested: true }, 'custom')).toBe('custom');
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- documents the exact bug toText prevents
    expect(String({ nested: true })).toBe('[object Object]');
  });

  it('falls back for arrays rather than joining them', () => {
    expect(toText(['a', 'b'])).toBe('');
    expect(toText(['a'], 'check')).toBe('check');
  });

  it('falls back for non-finite numbers', () => {
    expect(toText(Number.NaN)).toBe('');
    expect(toText(Number.POSITIVE_INFINITY, 'x')).toBe('x');
  });

  it('falls back for functions and symbols', () => {
    expect(toText(() => 'x')).toBe('');
    expect(toText(Symbol('s'), 'fb')).toBe('fb');
  });

  it('never returns [object Object] for any input', () => {
    const values: unknown[] = [
      {},
      [],
      new Date(),
      new Map(),
      { toString: () => '[object Object]' },
      null,
      undefined,
    ];
    for (const value of values) {
      expect(toText(value)).not.toBe('[object Object]');
    }
  });
});
