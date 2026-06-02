import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole, type ProjectRole } from '@/hooks/useProjectRole';
import { useParams, useLocation } from 'wouter';
import { LogOut, Shield, ArrowLeft, Settings } from 'lucide-react';

const ROLE_BADGES: Record<string, string> = {
    owner: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    admin: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewer: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    parceiro: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const ROLE_LABELS: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
    parceiro: 'Parceiro',
};

export default function TopBar() {
    const { user, signOut } = useAuth();
    const [location, setLocation] = useLocation();

    // Extract project ID from URL if we're inside a project
    const projectMatch = location.match(/\/project\/([^/]+)/);
    const projectId = projectMatch?.[1];

    const { role, isAdmin } = useProjectRole(projectId);

    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
    const userInitials = userName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const isInsideProject = !!projectId;

    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-3">
                    {isInsideProject && (
                        <button
                            onClick={() => {
                                if (location.includes('/settings')) {
                                    setLocation(`/project/${projectId}`);
                                } else {
                                    setLocation('/');
                                }
                            }}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group"
                            title={location.includes('/settings') ? "Voltar ao Dashboard" : "Voltar aos Projetos"}
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    )}

                    <img
                        src="/logos_stecla/versao_horizontal@4x.png"
                        alt="Stecla Engenharia"
                        className="h-7 object-contain hidden sm:block"
                    />

                    <div className="w-px h-6 bg-slate-200 hidden sm:block" />

                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
                        Plataforma As-Built
                    </span>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2.5">
                    {/* Role Badge - Only when inside a project */}
                    {isInsideProject && role && (
                        <span 
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md transition-all duration-300 shadow-sm ${ROLE_BADGES[role] || ''}`}
                        >
                            <Shield className="w-3 h-3" />
                            {ROLE_LABELS[role] || role}
                        </span>
                    )}

                    {/* Settings button - Only for admins inside a project */}
                    {isInsideProject && isAdmin && !location.includes('/settings') && (
                        <button
                            onClick={() => setLocation(`/project/${projectId}/settings`)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                            title="Configurações do Projeto"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-200" />

                    {/* User avatar + name */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                            {userInitials}
                        </div>
                        <div className="hidden md:flex flex-col">
                            <span className="text-xs font-semibold text-foreground leading-tight">
                                {userName}
                            </span>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                                {user?.email}
                            </span>
                        </div>
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={signOut}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-all"
                        title="Sair da conta"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}
