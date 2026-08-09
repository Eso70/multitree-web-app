import { compactSettingsPayload } from './settings-payload';

describe('compactSettingsPayload', () => {
  it('removes absent DTO fields before an approval request is created', () => {
    expect(
      compactSettingsPayload({
        section: 'profile',
        logo: '/images/upload/businesses/example/logo.jpg',
        current_password: undefined,
        new_password: undefined,
        password: undefined,
      }),
    ).toEqual({
      section: 'profile',
      logo: '/images/upload/businesses/example/logo.jpg',
    });
  });

  it('preserves explicit false and empty values', () => {
    expect(
      compactSettingsPayload({
        section: 'defaults',
        default_footer_hidden: false,
        default_footer_text: '',
      }),
    ).toEqual({
      section: 'defaults',
      default_footer_hidden: false,
      default_footer_text: '',
    });
  });
});
