import {
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { validateImageUpload } from './image-upload';

describe('validateImageUpload', () => {
  it('accepts a PNG signature and returns a safe extension', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateImageUpload(png, 'image/png')).toBe('png');
  });

  it('rejects a spoofed image mime type', () => {
    expect(() =>
      validateImageUpload(
        Buffer.from('<script>alert(1)</script>'),
        'image/png',
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejects SVG and HTML content', () => {
    expect(() =>
      validateImageUpload(Buffer.from('<svg></svg>'), 'image/svg+xml'),
    ).toThrow(UnsupportedMediaTypeException);
    expect(() =>
      validateImageUpload(Buffer.from('<html></html>'), 'text/html'),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects WebP and GIF uploads', () => {
    const webp = Buffer.from('RIFF0000WEBP', 'ascii');
    const gif = Buffer.from('GIF89a', 'ascii');

    expect(() => validateImageUpload(webp, 'image/webp')).toThrow(
      UnsupportedMediaTypeException,
    );
    expect(() => validateImageUpload(gif, 'image/gif')).toThrow(
      UnsupportedMediaTypeException,
    );
  });
});
