import { z } from 'zod';

export const jobFunctionStatusSchema = z.enum(['active', 'inactive', 'archived']);
export const jobFunctionRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

// Schema base vindo do DB
export const jobFunctionSchema = z.object({
  id: z.string().uuid().optional(), // opcional na criação
  empresa_id: z.string().uuid().optional(), // injetado pelo backend/contexto
  legacy_id: z.string().nullable().optional(),
  code: z.string().min(1, 'Código é obrigatório').max(50, 'Código muito longo'),
  name: z.string().min(3, 'Nome muito curto').max(150, 'Nome muito longo'),
  description: z.string().nullable().optional(),
  risk_level: jobFunctionRiskLevelSchema.nullable().optional(),
  default_language: z.string().max(10).nullable().optional(),
  status: jobFunctionStatusSchema.default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().nullable().optional(),
  updated_by: z.string().uuid().nullable().optional(),
});

export type JobFunction = z.infer<typeof jobFunctionSchema>;

// Formulário de Criação (Omitimos campos gerenciados pelo sistema)
export const createJobFunctionSchema = jobFunctionSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
});

export type CreateJobFunctionDTO = z.infer<typeof createJobFunctionSchema>;

// Formulário de Edição
export const updateJobFunctionSchema = createJobFunctionSchema.partial();

export type UpdateJobFunctionDTO = z.infer<typeof updateJobFunctionSchema>;

// --- PERGUNTAS TÉCNICAS (Fase 3) ---
export const questionTypeSchema = z.enum([
  'short_text', 'long_text', 'boolean', 'number', 'single_choice', 'multi_choice', 'date'
]);

export const jobFunctionQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  job_function_id: z.string().uuid(),
  question_text: z.string().min(3, 'Pergunta muito curta').max(500, 'Pergunta muito longa'),
  question_type: questionTypeSchema,
  is_required: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  status: jobFunctionStatusSchema.default('active'),
  options: z.array(z.string()).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type JobFunctionQuestion = z.infer<typeof jobFunctionQuestionSchema>;

export const createJobFunctionQuestionSchema = jobFunctionQuestionSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
});

export type CreateJobFunctionQuestionDTO = z.infer<typeof createJobFunctionQuestionSchema>;
export type UpdateJobFunctionQuestionDTO = Partial<CreateJobFunctionQuestionDTO>;

// --- EPIS (Fase 4) ---
export const epiSchema = z.object({
  id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  code: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  unit: z.string().nullable(),
  default_cost: z.number().nullable(),
  status: jobFunctionStatusSchema.default('active'),
});

export type Epi = z.infer<typeof epiSchema>;

export const jobFunctionEpiSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  job_function_id: z.string().uuid(),
  epi_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  renewal_period_days: z.number().int().nullable().optional(),
  is_required: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  status: jobFunctionStatusSchema.default('active'),
  created_at: z.string().optional(),
  // Opcional para preencher joins na UI
  epi: epiSchema.optional(),
});

export type JobFunctionEpi = z.infer<typeof jobFunctionEpiSchema>;

export const createJobFunctionEpiSchema = jobFunctionEpiSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  epi: true,
});

export type CreateJobFunctionEpiDTO = z.infer<typeof createJobFunctionEpiSchema>;
export type UpdateJobFunctionEpiDTO = Partial<CreateJobFunctionEpiDTO>;

// --- TARIFAS E CUSTOS (Fase 5) ---
export const jobFunctionRateRefSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  job_function_id: z.string().uuid(),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().uuid().nullable().optional(),
  currency_code: z.string().length(3).default('EUR'),
  base_cost_hour: z.number().min(0),
  minimum_sell_rate_hour: z.number().min(0).default(0),
  recommended_sell_rate_hour: z.number().min(0),
  minimum_margin_percent: z.number().min(0).max(100).nullable().optional(),
  status: jobFunctionStatusSchema.default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type JobFunctionRateRef = z.infer<typeof jobFunctionRateRefSchema>;

export const createJobFunctionRateRefSchema = jobFunctionRateRefSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
});

export type CreateJobFunctionRateRefDTO = z.infer<typeof createJobFunctionRateRefSchema>;
export type UpdateJobFunctionRateRefDTO = Partial<CreateJobFunctionRateRefDTO>;

// Filtros para listagem
export interface JobFunctionFilters {
  search?: string;
  status?: z.infer<typeof jobFunctionStatusSchema> | 'all';
  riskLevel?: z.infer<typeof jobFunctionRiskLevelSchema> | 'all';
}
