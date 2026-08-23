import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
    LayoutDashboard,
    FileSpreadsheet,
    AlertCircle,
    Smartphone,
    Database,
    Users,
    Settings,
    FolderKanban,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Building2,
    X,
} from "lucide-react";

interface SidebarProps {
    projectId?: string;
    project?: any;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
}

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
    owner: { label: "Proprietário", bg: "bg-red-50 border border-red-200", text: "text-[#940707]" },
    admin: { label: "Administrador", bg: "bg-slate-100 border border-slate-200", text: "text-slate-700" },
    editor: { label: "Editor", bg: "bg-slate-100 border border-slate-200", text: "text-slate-700" },
    viewer: { label: "Visualizador", bg: "bg-slate-100 border border-slate-200", text: "text-slate-600" },
    parceiro: { label: "Projetista", bg: "bg-red-50 border border-red-200", text: "text-[#940707]" },
};

export function Sidebar({
    projectId,
    project,
    activeTab = "overview",
    onTabChange,
    isMobileOpen = false,
    onCloseMobile,
}: SidebarProps) {
    const [location, setLocation] = useLocation();
    const { user, signOut } = useAuth();
    const { role, isParceiro, isAdmin } = useProjectRole(projectId);
    const userEmail = (user?.email || "").toLowerCase();
    const isSteclaAdmin =
        userEmail === "renata.vianna@stecla.com.br" ||
        userEmail.endsWith("@stecla.com.br") ||
        userEmail.startsWith("admin@");

    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem("sidebar_collapsed") === "false" ? false : false;
    });

    const toggleCollapse = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem("sidebar_collapsed", String(next));
    };

    const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";
    const userInitials = userName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const isInsideProject = !!projectId;

    const navItems = [
        {
            id: "overview",
            label: "Visão Geral",
            icon: LayoutDashboard,
            show: !isParceiro,
        },
        {
            id: "data-hub",
            label: "Central de Dados",
            icon: Database,
            show: !isParceiro,
        },
        {
            id: "field-reports",
            label: "Relato de Campo",
            icon: Smartphone,
            show: !isParceiro,
        },
        {
            id: "issues",
            label: "Apontamentos",
            icon: AlertCircle,
            show: !isParceiro,
        },
        {
            id: "portal-projetista",
            label: "Portal As-Built",
            icon: Users,
            show: true,
        },
        {
            id: "deliveries",
            label: "Entregas As-Built",
            icon: FileSpreadsheet,
            show: !isParceiro,
        },
    ];

    const handleNavClick = (tabId: string) => {
        if (location.includes("/settings")) {
            setLocation(`/project/${projectId}`);
        }
        if (onTabChange) {
            onTabChange(tabId);
        }
        if (onCloseMobile) {
            onCloseMobile();
        }
    };

    const roleInfo = (role && ROLE_BADGES[role]) || (isSteclaAdmin ? ROLE_BADGES["admin"] : ROLE_BADGES["parceiro"]);

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                className={`
                    fixed lg:static top-0 bottom-0 left-0 z-50
                    flex flex-col bg-white text-slate-700 border-r border-slate-200
                    transition-all duration-200 ease-in-out select-none
                    ${isCollapsed ? "w-16" : "w-56"}
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                {/* Top Logo Brand */}
                <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200 bg-white">
                    <div
                        className="flex items-center gap-2 cursor-pointer overflow-hidden"
                        onClick={() => setLocation("/")}
                    >
                        <img
                            src="/logos_stecla/versao_reduzida@4x.png"
                            alt="Stecla"
                            className="h-7 w-7 object-contain shrink-0"
                        />
                        {!isCollapsed && (
                            <span className="font-extrabold text-xs tracking-tight text-slate-800 font-sans whitespace-nowrap">
                                STECLA AS-BUILT<span className="text-[#9C1915]">.</span>
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onCloseMobile}
                        className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Active Project Selector */}
                {isInsideProject && project && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                        {isCollapsed ? (
                            <div
                                className="w-9 h-9 mx-auto rounded-md bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:border-[#940707] transition-colors"
                                title={`${project.code} - ${project.name}`}
                                onClick={() => setLocation("/")}
                            >
                                <span className="text-[10px] font-black text-[#940707]">
                                    {project.code.slice(0, 3)}
                                </span>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200/80 rounded-lg p-2">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-[9px] font-black tracking-wider bg-[#940707] text-white px-1.5 py-0.5 rounded">
                                        {project.code}
                                    </span>
                                    <button
                                        onClick={() => setLocation("/")}
                                        className="text-[10px] text-slate-500 hover:text-[#940707] font-semibold transition-colors flex items-center gap-1"
                                        title="Trocar de Projeto"
                                    >
                                        <FolderKanban className="w-3 h-3" />
                                        Trocar
                                    </button>
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 truncate" title={project.name}>
                                    {project.name}
                                </h4>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 custom-scrollbar">
                    {!isInsideProject ? (
                        <button
                            onClick={() => setLocation("/")}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                                location === "/"
                                    ? "bg-slate-100 text-[#940707] font-bold"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <FolderKanban className="w-4 h-4 shrink-0" />
                            {!isCollapsed && <span>Meus Projetos</span>}
                        </button>
                    ) : (
                        navItems
                            .filter((item) => item.show)
                            .map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    !location.includes("/settings") && activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                                            isActive
                                                ? "bg-[#940707] text-white font-bold shadow-xs"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon
                                            className={`w-4 h-4 shrink-0 ${
                                                isActive ? "text-white" : "text-slate-500"
                                            }`}
                                        />
                                        {!isCollapsed && (
                                            <span className="truncate">{item.label}</span>
                                        )}
                                    </button>
                                );
                            })
                    )}

                    {/* Settings Link */}
                    {isInsideProject ? (
                        isAdmin && (
                            <div className="pt-2 mt-2 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setLocation(`/project/${projectId}/settings`);
                                        if (onCloseMobile) onCloseMobile();
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                                        location.includes("/settings")
                                            ? "bg-[#940707] text-white font-bold"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                    title={isCollapsed ? "Configurações do Projeto" : undefined}
                                >
                                    <Settings className="w-4 h-4 shrink-0" />
                                    {!isCollapsed && <span>Configurações do Projeto</span>}
                                </button>
                            </div>
                        )
                    ) : (
                        isSteclaAdmin && (
                            <div className="pt-2 mt-2 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setLocation(`/platform-settings`);
                                        if (onCloseMobile) onCloseMobile();
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                                        location.includes("/platform-settings")
                                            ? "bg-[#940707] text-white font-bold"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                    title={isCollapsed ? "Configurações da Plataforma" : undefined}
                                >
                                    <Settings className="w-4 h-4 shrink-0" />
                                    {!isCollapsed && <span>Configurações da Plataforma</span>}
                                </button>
                            </div>
                        )
                    )}
                </div>

                {/* Bottom User Section */}
                <div className="p-2 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setLocation("/profile");
                                if (onCloseMobile) onCloseMobile();
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                            title="Acessar Meu Perfil"
                        >
                            <div className="w-7 h-7 rounded-md bg-[#9C1915] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {userInitials}
                            </div>

                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate leading-tight hover:text-[#9C1915]">
                                        {userName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium truncate">
                                        {roleInfo.label}
                                    </div>
                                </div>
                            )}
                        </button>

                        <button
                            className="p-1.5 text-slate-400 hover:text-[#940707] hover:bg-red-50 rounded-md transition-colors shrink-0"
                            onClick={() => signOut()}
                            title="Sair da Conta"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Collapse Button */}
                    <div className="hidden lg:flex justify-center mt-1.5 pt-1.5 border-t border-slate-200/60">
                        <button
                            onClick={toggleCollapse}
                            className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                                <>
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Recolher</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
