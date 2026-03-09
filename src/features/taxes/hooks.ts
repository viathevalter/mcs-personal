import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTaxRules, createTaxRule, updateTaxRule, deleteTaxRule } from './api';
import type { CreateTaxRulePayload, UpdateTaxRulePayload } from './types';

export const TAX_RULES_KEYS = {
    all: ['tax_rules'] as const,
};

export function useTaxRules() {
    return useQuery({
        queryKey: TAX_RULES_KEYS.all,
        queryFn: fetchTaxRules,
    });
}

export function useCreateTaxRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateTaxRulePayload) => createTaxRule(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TAX_RULES_KEYS.all });
        },
    });
}

export function useUpdateTaxRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateTaxRulePayload }) =>
            updateTaxRule(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TAX_RULES_KEYS.all });
        },
    });
}

export function useDeleteTaxRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteTaxRule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TAX_RULES_KEYS.all });
        },
    });
}
