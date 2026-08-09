import * as bcrypt from 'bcrypt';

/** One work factor for every password creation and password-change path. */
export const PASSWORD_BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);
}
