import { z } from 'zod';

export const empresaSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(2, 'Nome da empresa é obrigatório'),
  trade_name: z.string().nullable().optional(),
  legal_name: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  vat_id: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  billing_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  cobranca_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  proposal_sender_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  marketing_sender_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  iban: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  bank_details: z.string().nullable().optional(),
  next_invoice_number: z.number().int().min(1).nullable().optional(),
  invoice_series: z.string().nullable().optional(),
  atcud_prefix: z.string().nullable().optional(),
  capital_social: z.string().nullable().optional(),
  conservatoria: z.string().nullable().optional(),
  matricula: z.string().nullable().optional(),
  certified_software_text: z.string().nullable().optional(),
  invoice_logo_url: z.string().nullable().optional(),
  microsoft_tenant_id: z.string().nullable().optional(),
  microsoft_client_id: z.string().nullable().optional(),
  microsoft_client_secret: z.string().nullable().optional(),
  microsoft_sharepoint_drive_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
});

export type Empresa = z.infer<typeof empresaSchema>;

export const createEmpresaSchema = empresaSchema.omit({
  id: true,
  created_at: true,
});

export type CreateEmpresaDTO = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaDTO = Partial<CreateEmpresaDTO>;
