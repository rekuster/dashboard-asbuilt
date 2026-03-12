import { Plus, Building2, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import { Loader2 } from 'lucide-react';

export default function Projects() {
    const { user, signOut } = useAuth();
    const { data: projects, isLoading } = trpc.projects.list.useQuery();

    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="/logos_stecla/versao_horizontal@4x.png"
                            alt="Stecla Engenharia"
                            className="h-8 object-contain hidden sm:block"
                        />
                        <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                        <div>
                            <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Plataforma As-Built
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                            Olá, <strong className="text-foreground">{userName}</strong>
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={signOut}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
                {/* Title + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Meus Projetos</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Selecione um projeto para acessar o dashboard ou crie um novo.
                        </p>
                    </div>

                    <CreateProjectDialog>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Novo Projeto
                        </Button>
                    </CreateProjectDialog>
                </div>

                {/* Projects Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin w-8 h-8 text-primary" />
                        <p className="text-muted-foreground text-sm">Carregando projetos...</p>
                    </div>
                ) : projects && projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project: any) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                            <Building2 className="w-10 h-10 text-primary/40" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Nenhum projeto ainda
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            Crie seu primeiro projeto para começar a acompanhar as verificações As-Built.
                        </p>
                        <CreateProjectDialog>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Criar primeiro projeto
                            </Button>
                        </CreateProjectDialog>
                    </div>
                )}
            </div>
        </div>
    );
}
