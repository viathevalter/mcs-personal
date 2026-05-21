import { z } from 'zod';

export const countrySchema = z.object({
  id: z.string().uuid(),
  iso2: z.string().length(2, 'ISO2 deve ter 2 caracteres'),
  iso3: z.string().length(3, 'ISO3 deve ter 3 caracteres'),
  name: z.string().min(1, 'Nome é obrigatório'),
  phone_code: z.string().nullable().optional(),
  currency_code: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});
export type Country = z.infer<typeof countrySchema>;

export const createCountrySchema = countrySchema.omit({ id: true });
export type CreateCountryDTO = z.infer<typeof createCountrySchema>;
export type UpdateCountryDTO = Partial<CreateCountryDTO>;

export const regionSchema = z.object({
  id: z.string().uuid(),
  country_id: z.string().uuid('País é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});
export type Region = z.infer<typeof regionSchema>;

export const createRegionSchema = regionSchema.omit({ id: true });
export type CreateRegionDTO = z.infer<typeof createRegionSchema>;
export type UpdateRegionDTO = Partial<CreateRegionDTO>;
