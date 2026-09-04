import { createHash } from "node:crypto";
import { z } from "zod";

export const incomingJobSchema = z.object({
  externalId: z.string().min(1).max(300),
  source: z.string().min(1).max(100),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  description: z.string().max(100_000).default(""),
  location: z.string().max(200).default("France"),
  contract: z.enum(["stage", "alternance", "cdi", "cdd", "graduate"]).optional(),
  remote: z.boolean().default(false),
  applyUrl: z.string().url(),
  publishedAt: z.string().datetime().optional(),
  deadlineAt: z.string().datetime().optional()
});

export type IncomingJob = z.infer<typeof incomingJobSchema>;

export function fingerprint(job: IncomingJob) {
  const value = [job.source, job.externalId].map((part) => part.trim().toLowerCase()).join("|");
  return createHash("sha256").update(value).digest("hex");
}
