/**
 * @proofly/domain - Hashing de contraseñas con scrypt (Node crypto).
 *
 * Formato almacenado: `scrypt$N$<saltHex>$<hashHex>`. Sin dependencias externas;
 * scrypt es un KDF resistente a hardware recomendado para contraseñas.
 */

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const COST = 16384; // N (2^14), balance costo/latencia para login interactivo.
const KEYLEN = 64;
const SALT_BYTES = 16;

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(plain, salt, KEYLEN, { N: COST })) as Buffer;
  return `scrypt$${COST}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const cost = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  if (!Number.isInteger(cost) || salt.length === 0 || expected.length === 0) return false;
  const derived = (await scryptAsync(plain, salt, expected.length, { N: cost })) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
