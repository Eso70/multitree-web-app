/**
 * Business profile changes apply immediately and then lock for a cooldown
 * period. This replaced platform-administrator approval of profile edits, so
 * the window is the only thing limiting how often a business can rebrand.
 *
 * Interpolated into SQL as an interval literal, so it must stay a number.
 */
export const PROFILE_CHANGE_COOLDOWN_DAYS = 30;

/** Every profile field the cooldown covers. */
export const PROFILE_COOLDOWN_FIELDS = [
  'name',
  'username',
  'phone',
  'logo',
  'favicon',
  'default_avatar',
  'website_color',
] as const;

export type ProfileCooldownField = (typeof PROFILE_COOLDOWN_FIELDS)[number];

export type ProfileSnapshot = Record<ProfileCooldownField, string | null>;

/**
 * Which profile fields a save actually changes.
 *
 * The settings page submits the whole profile section on every save, so a
 * payload containing `logo` proves nothing about intent. Starting the cooldown
 * on presence rather than on difference would lock a business out for 30 days
 * for re-saving values it never edited, so resolved next values are compared
 * against what is stored. Values are trimmed and `null` is treated as empty:
 * the two spellings of "unset" must not read as a change.
 */
export function changedProfileFields(
  current: Partial<ProfileSnapshot> | null | undefined,
  next: Partial<ProfileSnapshot>,
): ProfileCooldownField[] {
  return PROFILE_COOLDOWN_FIELDS.filter((field) => {
    if (next[field] === undefined) return false;
    return (next[field] ?? '').trim() !== (current?.[field] ?? '').trim();
  });
}
