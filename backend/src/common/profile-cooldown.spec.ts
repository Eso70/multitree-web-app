import {
  changedProfileFields,
  PROFILE_COOLDOWN_FIELDS,
  type ProfileSnapshot,
} from './profile-cooldown';

const stored: ProfileSnapshot = {
  name: 'Ismail',
  username: 'ismail',
  phone: '7501234567',
  logo: '/images/upload/businesses/example/branding/logo/logo.png',
  favicon: '/images/upload/businesses/example/branding/favicon/icon.png',
  default_avatar: '/images/DefaultAvatar.png',
  website_color: '#b6f20d',
};

describe('changedProfileFields', () => {
  it('reports nothing when a full resubmit matches what is stored', () => {
    // The settings page submits the whole profile section. Treating that as a
    // change would burn the 30-day window on a save that edited nothing.
    expect(changedProfileFields(stored, { ...stored })).toEqual([]);
  });

  it('covers every profile field, not only the images', () => {
    for (const field of PROFILE_COOLDOWN_FIELDS) {
      expect(
        changedProfileFields(stored, { ...stored, [field]: 'something-else' }),
      ).toEqual([field]);
    }
  });

  it('ignores fields the payload omits', () => {
    expect(changedProfileFields(stored, { name: 'Ismail Dilshad' })).toEqual([
      'name',
    ]);
  });

  it('treats null and empty string as the same absent value', () => {
    expect(
      changedProfileFields({ ...stored, phone: null }, { phone: '' }),
    ).toEqual([]);
    expect(
      changedProfileFields({ ...stored, phone: '' }, { phone: '   ' }),
    ).toEqual([]);
  });

  it('ignores surrounding whitespace', () => {
    expect(changedProfileFields(stored, { name: '  Ismail  ' })).toEqual([]);
  });

  it('reports each changed field when several move at once', () => {
    expect(
      changedProfileFields(stored, {
        name: 'New Name',
        website_color: '#ffffff',
      }),
    ).toEqual(['name', 'website_color']);
  });
});
