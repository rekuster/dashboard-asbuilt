import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { trpc } from "@/lib/trpc";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [location] = useLocation();
    const {
        activeTab,
        setActiveTab,
        selectedEdificacao,
        setSelectedEdificacao,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
    } = useLayout();

    // Extract project ID if present in the URL
    const projectMatch = location.match(/\/project\/([^/]+)/);
    const projectId = projectMatch?.[1];

    const { data: project } = trpc.projects.getById.useQuery(
        { id: projectId! },
        { enabled: !!projectId }
    );

    const isAuthPage =
        location === "/login" ||
        location === "/register" ||
        location === "/forgot-password" ||
        location === "/reset-password";

    if (!user || isAuthPage) {
        return <div className="min-h-screen bg-[#F0F2F5]">{children}</div>;
    }

    return (
        <div className="min-h-screen flex bg-[#EEF0F2] text-slate-800 overflow-x-hidden font-sans">
            {/* Sidebar */}
            <Sidebar
                projectId={projectId}
                project={project}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isMobileOpen={isMobileMenuOpen}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
                <Header
                    projectId={projectId}
                    project={project}
                    activeTab={activeTab}
                    selectedEdificacao={selectedEdificacao}
                    onSelectEdificacao={setSelectedEdificacao}
                    onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                />

                <main className="flex-1 p-3.5 md:p-4 max-w-[1700px] w-full mx-auto animate-in fade-in duration-150">
                    {children}
                </main>
            </div>
        </div>
    );
}
