import { createCipheriv, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { hasValidBearerToken } from "../lib/bearer-auth";
import { decryptSecret, encryptSecret } from "../lib/secret-crypto";
import { shouldSendFailureAlert } from "../lib/monitoring";

beforeAll(() => {
  process.env.SLACK_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
});

describe("authentification Bearer", () => {
  it("accepte uniquement le secret exact", () => {
    expect(hasValidBearerToken("Bearer tres-secret", "tres-secret")).toBe(true);
    expect(hasValidBearerToken("Bearer tres-secrex", "tres-secret")).toBe(false);
    expect(hasValidBearerToken("tres-secret", "tres-secret")).toBe(false);
    expect(hasValidBearerToken(null, "tres-secret")).toBe(false);
  });
});

describe("chiffrement par usage", () => {
  it("chiffre et déchiffre avec la bonne clé dérivée", () => {
    const encrypted = encryptSecret("valeur-sensible", "slack");
    expect(decryptSecret(encrypted.ciphertext, encrypted.iv, "slack")).toBe("valeur-sensible");
    expect(() => decryptSecret(encrypted.ciphertext, encrypted.iv, "gemini")).toThrow();
  });

  it("reste compatible avec l'ancien chiffrement", () => {
    const key = Buffer.from(process.env.SLACK_TOKEN_ENCRYPTION_KEY!, "hex");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update("ancien-secret", "utf8"), cipher.final(), cipher.getAuthTag()]);
    expect(decryptSecret(encrypted.toString("base64"), iv.toString("base64"), "cv")).toBe("ancien-secret");
  });
});

describe("surveillance des synchronisations", () => {
  it("alerte au seuil puis toutes les trois erreurs", () => {
    expect(shouldSendFailureAlert(2, 3)).toBe(false);
    expect(shouldSendFailureAlert(3, 3)).toBe(true);
    expect(shouldSendFailureAlert(4, 3)).toBe(false);
    expect(shouldSendFailureAlert(6, 3)).toBe(true);
  });
});
