import { z } from 'zod';

const ServiceStatusSchema = z.enum(['up', 'down']);

export const HealthSchema = z.object({
  status: z.enum(['ok', 'error']),
  postgres: ServiceStatusSchema,
  redis: ServiceStatusSchema,
});

export type Health = z.infer<typeof HealthSchema>;
