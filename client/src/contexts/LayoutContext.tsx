import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

interface LayoutContextType {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    selectedEdificacao: string | null;
    setSelectedEdificacao: (ed: string | null) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [location] = useLocation();
    const [activeTab, setActiveTabState] = useState<string>(() => {
        return sessionStorage.getItem("dashboard_active_tab") || "overview";
    });
    const [selectedEdificacao, setSelectedEdificacao] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        sessionStorage.setItem("dashboard_active_tab", tab);
    };

    // Reset or update on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    return (
        <LayoutContext.Provider
            value={{
                activeTab,
                setActiveTab,
                selectedEdificacao,
                setSelectedEdificacao,
                isMobileMenuOpen,
                setIsMobileMenuOpen,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
}
