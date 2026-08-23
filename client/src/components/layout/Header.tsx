import React from "react";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import EdificacaoSelector from "@/components/dashboard/EdificacaoSelector";
import { Button } from "@/components/ui/button";

interface HeaderProps {
    projectId?: string;
    project?: any;
    activeTab?: string;
    selectedEdificacao?: string | null;
    onSelectEdificacao?: (ed: string | null) => void;
    onOpenMobileMenu?: () => void;
}

const TAB_TITLES: Record<string, string> = {
    overview: "Visão Geral",
    "data-hub": "Central de Dados",
    "field-reports": "Relato de Campo",
    issues: "Apontamentos & Divergências",
    "portal-projetista": "Portal As-Built",
    deliveries: "Entregas As-Built",
};

export function Header({
    projectId,
    project,
    activeTab = "overview",
    selectedEdificacao,
    onSelectEdificacao,
    onOpenMobileMenu,
}: HeaderProps) {
    const [location] = useLocation();
    const isInsideProject = !!projectId && !!project;
    const isSettingsPage = location.includes("/settings");
    const currentSectionName = location === "/platform-settings"
        ? "Configurações da Plataforma"
        : location === "/profile"
        ? "Meu Perfil"
        : isSettingsPage
        ? "Configurações do Projeto"
        : TAB_TITLES[activeTab] || "Projetos";

    return (
        <header className="sticky top-0 z-30 h-13 min-h-[52px] max-h-[52px] bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs">
            {/* Left: Stecla vertical red bar + Title / Breadcrumb */}
            <div className="flex items-center gap-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 text-slate-600 hover:bg-slate-100 rounded-md -ml-1"
                    onClick={onOpenMobileMenu}
                >
                    <Menu className="w-4 h-4" />
                </Button>

                <div className="flex items-center">
                    <div className="w-1.5 h-5 bg-[#9C1915] rounded-xs mr-2.5 shrink-0" />

                    {isInsideProject ? (
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold uppercase tracking-wide text-[#9C1915] font-sans">
                                {project.name || "Acompanhamento de Projetos"}
                            </h1>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="text-xs font-semibold text-[#575756]">
                                {currentSectionName}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold uppercase tracking-wide text-[#9C1915] font-sans">
                                Plataforma As-Built
                            </h1>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="text-xs font-semibold text-[#575756]">
                                {currentSectionName}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Edificacao Selector exibido APENAS na Visão Geral */}
            <div className="flex items-center gap-2">
                {isInsideProject && activeTab === "overview" && onSelectEdificacao && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                        <EdificacaoSelector
                            projectId={projectId}
                            selectedEdificacao={selectedEdificacao || null}
                            onSelect={onSelectEdificacao}
                        />
                    </div>
                )}
            </div>
        </header>
    );
}
