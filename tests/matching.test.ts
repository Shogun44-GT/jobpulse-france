import { describe, expect, it } from "vitest";
import { calculateMatch } from "../lib/matching";

const profile = {
  desiredRoles: ["développeur backend"],
  skills: ["TypeScript", "PostgreSQL"],
  desiredLocations: ["Paris"],
  desiredContracts: ["stage"],
  remotePreference: "indifferent"
};

describe("score de compatibilité", () => {
  it("reconnaît une variante féminine du métier", () => {
    const result = calculateMatch({
      title: "Stage développeuse backend",
      description: "TypeScript, PostgreSQL et APIs",
      location: "Paris",
      contract: "stage",
      remote: false
    }, profile);
    expect(result.profileReady).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("valorise les compétences extraites du CV", () => {
    const job = { title: "Stage backend", description: "Python Django", location: "Paris", contract: "stage", remote: false };
    const withoutCv = calculateMatch(job, profile);
    const withCv = calculateMatch(job, { ...profile, cvSkills: ["Python", "Django"] });
    expect(withCv.score).toBeGreaterThan(withoutCv.score);
  });

  it("pénalise un contrat et une localisation incompatibles", () => {
    const result = calculateMatch({
      title: "Développeur backend",
      description: "TypeScript PostgreSQL",
      location: "Toulouse",
      contract: "cdi",
      remote: false
    }, profile);
    expect(result.score).toBeLessThan(80);
  });
});
