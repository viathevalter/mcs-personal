import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMyMemberships } from '@/shared/hooks/useMyMemberships';
import { useEmpresas } from '@/shared/hooks/useEmpresas';
import type { Empresa } from '@/shared/types/coreCommon';
import type { AppRole, UserMembership } from '@/shared/rbac/roles';

interface EmpresaContextType {
    selectedEmpresaId: string | null;
    setSelectedEmpresaId: (id: string | null) => void;
    currentMembership: UserMembership | null;
    role: AppRole | null;
    empresas: Empresa[];
    isLoading: boolean;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(
        () => localStorage.getItem('mcs:selectedEmpresaId') || null
    );

    const { data: membershipData, isLoading: membershipLoading } = useMyMemberships();
    const { data: empresasData, isLoading: empresasLoading } = useEmpresas();

    const memberships = membershipData?.memberships || [];
    const empresas = empresasData || [];

    // Watch for changes and save to local storage
    useEffect(() => {
        if (selectedEmpresaId) {
            localStorage.setItem('mcs:selectedEmpresaId', selectedEmpresaId);
        } else {
            localStorage.removeItem('mcs:selectedEmpresaId');
        }
    }, [selectedEmpresaId]);

    // Auto-select initial empresa based on loaded empresas
    useEffect(() => {
        if (!empresas || empresas.length === 0) return;

        const validSelection = empresas.some(e => e.id === selectedEmpresaId);

        if (!validSelection) {
            setSelectedEmpresaId(empresas[0].id);
        }
    }, [empresas]);

    const currentMembership = memberships?.find(m => m.empresa_id === selectedEmpresaId) || null;
    const role = currentMembership?.role || null;
    const isLoading = membershipLoading || empresasLoading;

    return (
        <EmpresaContext.Provider value={{ selectedEmpresaId, setSelectedEmpresaId, currentMembership, role, empresas, isLoading }}>
            {children}
        </EmpresaContext.Provider>
    );
}

export const useEmpresa = () => {
    const context = useContext(EmpresaContext);
    if (context === undefined) {
        throw new Error('useEmpresa must be used within an EmpresaProvider');
    }
    return context;
};
