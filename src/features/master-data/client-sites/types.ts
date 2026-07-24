import { z } from 'zod';
import { clientSchema } from '../clients/types';

export const siteStatusSchema = z.enum(['active', 'inactive', 'archived']);
export type SiteStatus = z.infer<typeof siteStatusSchema>;

export const clientSiteSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  client_id: z.string().optional().or(z.literal('')).nullable(),
  site_code: z.string().nullable().optional(),
  name: z.string().min(2, 'Nome do local é obrigatório'),
  country_id: z.string().nullable().optional(),
  region_id: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: siteStatusSchema.default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  
  // Relacionamentos para listagem
  client: clientSchema.optional(),
});

export type ClientSite = z.infer<typeof clientSiteSchema>;

export const createClientSiteSchema = clientSiteSchema.omit({
  id: true,
  empresa_id: true,
  created_at: true,
  updated_at: true,
  client: true,
});

export type CreateClientSiteDTO = z.infer<typeof createClientSiteSchema>;
export type UpdateClientSiteDTO = Partial<CreateClientSiteDTO>;
