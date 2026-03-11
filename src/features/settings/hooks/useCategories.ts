import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getDiscountCategories,
    createDiscountCategory,
    updateDiscountCategory,
    deleteDiscountCategory,
    getBenefitCategories,
    createBenefitCategory,
    updateBenefitCategory,
    deleteBenefitCategory
} from '../api/categoriesApi';

// Discount Categories
export const useDiscountCategories = (empresaId?: string) => {
    return useQuery({
        queryKey: ['discount-categories', empresaId],
        queryFn: () => getDiscountCategories(empresaId!),
        enabled: !!empresaId,
    });
};

export const useCreateDiscountCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ empresaId, name }: { empresaId: string; name: string }) => createDiscountCategory(empresaId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discount-categories'] });
            toast.success('Categoria criada com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao criar categoria');
        }
    });
};

export const useUpdateDiscountCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateDiscountCategory(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discount-categories'] });
            toast.success('Categoria atualizada com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar categoria');
        }
    });
};

export const useDeleteDiscountCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDiscountCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discount-categories'] });
            toast.success('Categoria excluída com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao excluir categoria');
        }
    });
};

// Benefit Categories
export const useBenefitCategories = (empresaId?: string) => {
    return useQuery({
        queryKey: ['benefit-categories', empresaId],
        queryFn: () => getBenefitCategories(empresaId!),
        enabled: !!empresaId,
    });
};

export const useCreateBenefitCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ empresaId, name }: { empresaId: string; name: string }) => createBenefitCategory(empresaId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
            toast.success('Categoria criada com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao criar categoria');
        }
    });
};

export const useUpdateBenefitCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateBenefitCategory(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
            toast.success('Categoria atualizada com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar categoria');
        }
    });
};

export const useDeleteBenefitCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBenefitCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefit-categories'] });
            toast.success('Categoria excluída com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao excluir categoria');
        }
    });
};
