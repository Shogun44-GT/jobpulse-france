import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const value = process.env.SLACK_TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux");
  }
  return Buffer.from(value, "hex");
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tagged = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return { ciphertext: tagged.toString("base64"), iv: iv.toString("base64") };
}

export function decryptSecret(ciphertext: string, ivValue: string) {
  const tagged = Buffer.from(ciphertext, "base64");
  const encrypted = tagged.subarray(0, -16);
  const authTag = tagged.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
