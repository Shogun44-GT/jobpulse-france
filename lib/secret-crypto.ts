import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export type SecretPurpose = "slack" | "gemini" | "cv";

function masterKey() {
  const value = process.env.SLACK_TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux");
  }
  return Buffer.from(value, "hex");
}

function key(purpose?: SecretPurpose) {
  const master = masterKey();
  if (!purpose) return master;
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), Buffer.from(`jobpulse:${purpose}:v1`), 32));
}

export function encryptSecret(value: string, purpose: SecretPurpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(purpose), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tagged = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return { ciphertext: tagged.toString("base64"), iv: iv.toString("base64") };
}

function decryptWithKey(ciphertext: string, ivValue: string, encryptionKey: Buffer) {
  const tagged = Buffer.from(ciphertext, "base64");
  const encrypted = tagged.subarray(0, -16);
  const authTag = tagged.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function decryptSecret(ciphertext: string, ivValue: string, purpose: SecretPurpose) {
  try {
    return decryptWithKey(ciphertext, ivValue, key(purpose));
  } catch {
    // Compatibilité avec les données chiffrées avant la séparation HKDF.
    return decryptWithKey(ciphertext, ivValue, masterKey());
  }
}
