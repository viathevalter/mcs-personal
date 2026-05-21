import { z } from 'zod';

export const epiSchema = z.object({
  id: z.string().uuid(),
  code: z.string().nullable().optional(),
  name: z.string().min(2, 'O nome do EPI é obrigatório'),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  default_cost: z.number().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Epi = z.infer<typeof epiSchema>;

export const createEpiSchema = epiSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateEpiDTO = z.infer<typeof createEpiSchema>;
export type UpdateEpiDTO = Partial<CreateEpiDTO>;
