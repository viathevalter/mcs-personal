import { z } from 'zod';

export const supplierStatusSchema = z.enum(['active', 'inactive', 'archived']);
export type SupplierStatus = z.infer<typeof supplierStatusSchema>;

export const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  trade_name: z.string().min(2, 'Nome fantasia é obrigatório e deve ter no mínimo 2 caracteres'),
  legal_name: z.string().min(2, 'Razão social é obrigatória'),
  tax_id: z.string().min(5, 'NIF/Tax ID é obrigatório'),
  codigo: z.string().nullable().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  billing_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  phone: z.string().nullable().optional(),
  supplier_type: z.enum(['housing', 'transport', 'epi', 'tools', 'legal', 'accounting', 'general', 'other'], { message: 'Tipo de fornecedor é obrigatório' }),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().uuid().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: supplierStatusSchema.default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierSchema = supplierSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
});

export type CreateSupplierDTO = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDTO = Partial<CreateSupplierDTO>;
