import { describe, expect, it } from "vitest";
import { duplicateScore, isProbableDuplicate } from "../lib/deduplication";

const offer = {
  company: "Doctolib SAS France",
  title: "Stage Développeur Backend TypeScript",
  location: "Paris 75001",
  contract: "stage" as const
};

describe("déduplication", () => {
  it("reconnaît une même offre légèrement reformulée", () => {
    const repost = { ...offer, company: "Doctolib", title: "Stage développeur backend - TypeScript" };
    expect(duplicateScore(offer, repost)).toBeGreaterThanOrEqual(0.76);
    expect(isProbableDuplicate(offer, repost)).toBe(true);
  });

  it("ne fusionne pas deux contrats différents", () => {
    expect(isProbableDuplicate(offer, { ...offer, contract: "alternance" as const })).toBe(false);
  });

  it("ne fusionne pas deux entreprises différentes", () => {
    expect(isProbableDuplicate(offer, { ...offer, company: "Back Market" })).toBe(false);
  });

  it("ne fusionne pas deux villes différentes", () => {
    expect(isProbableDuplicate(offer, { ...offer, location: "Lyon 69002" })).toBe(false);
  });
});
