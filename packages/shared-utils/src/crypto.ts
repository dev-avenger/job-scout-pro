import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export async function deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function encrypt(plaintext: string, masterKey: string): Promise<Buffer> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = await deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: salt (32) + iv (16) + tag (16) + encrypted data
  return Buffer.concat([salt, iv, tag, encrypted]);
}

export async function decrypt(ciphertext: Buffer, masterKey: string): Promise<string> {
  const salt = ciphertext.subarray(0, SALT_LENGTH);
  const iv = ciphertext.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = ciphertext.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = ciphertext.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = await deriveKey(masterKey, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    if (!salt || !key) {
      resolve(false);
      return;
    }
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}
