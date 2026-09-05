import { z } from "zod";

export const applicationStatus = z.enum(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);
export type ApplicationStatus = z.infer<typeof applicationStatus>;

export const createApplicationSchema = z.object({ jobId: z.string().uuid() });
export const updateApplicationSchema = z.object({
  id: z.string().uuid(),
  status: applicationStatus,
  notes: z.string().trim().max(2000).default("")
});
