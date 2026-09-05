import { z } from "zod";

const cleanList = z.array(z.string().trim().min(1).max(80)).max(30)
  .transform((items) => [...new Set(items.map((item) => item.replace(/\s+/g, " ")))])
  .default([]);

export const profileSchema = z.object({
  headline: z.string().trim().max(160).default(""),
  educationLevel: z.enum(["", "bac", "bac+2", "bac+3", "bac+5", "doctorat"]).default(""),
  experienceYears: z.coerce.number().int().min(0).max(50).default(0),
  skills: cleanList,
  desiredRoles: cleanList,
  desiredLocations: cleanList,
  desiredContracts: z.array(z.enum(["stage", "alternance", "cdi", "cdd", "freelance"]))
    .min(1, "Choisis au moins un type de contrat.").max(5),
  remotePreference: z.enum(["indifferent", "hybrid", "remote"]),
  minimumScore: z.coerce.number().int().min(0).max(100)
});

export type CandidateProfileInput = z.infer<typeof profileSchema>;
