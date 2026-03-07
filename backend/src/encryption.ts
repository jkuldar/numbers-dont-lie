import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

let cachedKey: Buffer | null | undefined;

function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    console.warn('ENCRYPTION_KEY not set — field-level encryption disabled');
    cachedKey = null;
    return null;
  }
  cachedKey = createHash('sha256').update(raw).digest();
  return cachedKey;
}

export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(cipherText: string): string {
  const key = getKey();
  if (!key) return cipherText;
  if (!cipherText.startsWith('enc:')) return cipherText; // not encrypted

  try {
    const [, ivHex, tagHex, data] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return cipherText; // return as-is if decryption fails (legacy unencrypted data)
  }
}

export function encryptArray(arr: string[]): string[] {
  return arr.map((item) => encrypt(item));
}

export function decryptArray(arr: string[]): string[] {
  return arr.map((item) => decrypt(item));
}
