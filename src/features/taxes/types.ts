export type TaxCategory =
    | 'SS_TRABALHADOR'
    | 'SS_EMPRESA'
    | 'IRS_DEFAULT'
    | 'SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO'
    | 'SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO'
    | 'FCT'
    | 'AJUDAS_CUSTO_LIMITE'
    | 'KMS_LIMITE'
    | 'OUTROS';

export interface TaxRule {
    id: string;
    empresa_id?: number | null;
    tax_type: TaxCategory;
    rate_percentage?: number | null;
    fixed_amount?: number | null;
    description: string;
    is_active: boolean;
    valid_from: string;
    valid_to?: string | null;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

export interface CreateTaxRulePayload {
    empresa_id?: number | null;
    tax_type: TaxCategory;
    rate_percentage?: number | null;
    fixed_amount?: number | null;
    description: string;
    valid_from: string;
    valid_to?: string | null;
}

export interface UpdateTaxRulePayload {
    empresa_id?: number | null;
    tax_type?: TaxCategory;
    rate_percentage?: number | null;
    fixed_amount?: number | null;
    description?: string;
    is_active?: boolean;
    valid_from?: string;
    valid_to?: string | null;
}
