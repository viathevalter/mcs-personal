import { z } from 'zod';

export const clientStatusSchema = z.enum(['active', 'inactive', 'archived']);
export type ClientStatus = z.infer<typeof clientStatusSchema>;

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  trade_name: z.string().min(2, 'Nome fantasia é obrigatório e deve ter no mínimo 2 caracteres'),
  legal_name: z.string().min(2, 'Razão social é obrigatória'),
  tax_id: z.string().min(5, 'NIF/Tax ID é obrigatório'),
  codigo: z.string().nullable().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  billing_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  phone: z.string().nullable().optional(),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().uuid().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: clientStatusSchema.default('active'),
  financial_status: z.enum(['active', 'debtor', 'blocked']).default('active'),
  credit_limit: z.coerce.number().nullable().optional(),
  current_debt: z.coerce.number().nullable().optional(),
  payment_term_id: z.string().uuid().or(z.literal('')).nullable().optional(),
  billing_cycle_start_day: z.coerce.number().min(1).max(31).nullable().optional(),
  vies_applicable: z.boolean().default(false).optional(),
  vies_status: z.string().default('not_checked').optional(),
  vies_valid: z.boolean().default(false).optional(),
  vies_returned_name: z.string().nullable().optional(),
  vies_returned_address: z.string().nullable().optional(),
  vies_request_date: z.string().nullable().optional(),
  vies_request_identifier: z.string().nullable().optional(),
  vies_last_checked_at: z.string().nullable().optional(),
  vies_last_checked_by: z.string().nullable().optional(),
  vies_requires_review: z.boolean().default(false).optional(),
  vies_last_error_code: z.string().nullable().optional(),
  vies_last_error_message: z.string().nullable().optional(),
  eu_vat_number: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema> & {
  payment_term?: {
    id: string;
    name: string;
    days: number;
  } | null;
};

export interface PaymentTerm {
  id: string;
  empresa_id: string;
  name: string;
  days: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const createClientSchema = clientSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
});

export type CreateClientDTO = z.infer<typeof createClientSchema>;
export type UpdateClientDTO = Partial<CreateClientDTO>;

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientViesCheckLog {
  id: string;
  empresa_id: string;
  client_id: string;
  country_code: string;
  vat_number: string;
  full_vat_number: string;
  status: string;
  valid: boolean;
  returned_name?: string | null;
  returned_address?: string | null;
  request_date?: string | null;
  request_identifier?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  checked_at?: string | null;
  checked_by?: string | null;
  trigger_source?: string | null;
  created_at?: string | null;
}
