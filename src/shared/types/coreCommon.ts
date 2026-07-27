import type { AppRole } from '../rbac/roles';

export type Role = AppRole;

export interface Empresa {
    id: string;
    codigo: string;
    nome: string;
    is_active: boolean;
    created_at: string;
    trade_name?: string | null;
    legal_name?: string | null;
    tax_id?: string | null;
    vat_id?: string | null;
    address_line?: string | null;
    postal_code?: string | null;
    city?: string | null;
    province?: string | null;
    country_id?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    billing_email?: string | null;
    cobranca_email?: string | null;
    iban?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    bank_details?: string | null;
    is_holding?: boolean | null;
}

// Re-using or extending the existing UserMembership if needed, 
// strictly typed per Supabase schema core_common.user_memberships
export interface UserMembership {
    id: string; // The prompt asked for 'id' in the user_memberships although it's usually composite. 
    user_id: string;
    empresa_id: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    // Optional join fields
    empresa_name?: string;
}
