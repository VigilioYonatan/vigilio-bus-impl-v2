import { z } from "zod";

export const workerMessageSchema = z
  .object({
    correlationId: z.string().trim().min(1).max(128),
    id: z.uuid(),
    occurredAt: z.iso.datetime({ offset: true }),
    payload: z.record(z.string(), z.unknown()).default({}),
    type: z.enum(["bus.healthcheck.v1"]),
    version: z.literal(1),
  })
  .strict();

export type WorkerMessage = z.infer<typeof workerMessageSchema>;
