import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface SidebarContextType {
    isExpanded: boolean;
    toggleSidebar: () => void;
    setExpanded: (expanded: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    // Default to true (expanded) on large screens, or we can just default to true.
    const [isExpanded, setIsExpanded] = useState(true);

    const toggleSidebar = () => setIsExpanded(!isExpanded);
    const setExpanded = (expanded: boolean) => setIsExpanded(expanded);

    return (
        <SidebarContext.Provider value={{ isExpanded, toggleSidebar, setExpanded }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
