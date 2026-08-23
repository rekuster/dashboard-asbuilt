import React from "react";
import { useLocation } from "wouter";
import { Plus, Building2, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import ProjectCard from "@/components/projects/ProjectCard";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";

export default function Projects() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { data: projects, isLoading } = trpc.projects.list.useQuery();

    const userEmail = (user?.email || "").toLowerCase();
    const isSteclaAdmin =
        userEmail === "renata.vianna@stecla.com.br" ||
        userEmail.endsWith("@stecla.com.br");

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-8 animate-in fade-in duration-200">
            {/* Header + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <h1 className="text-base font-bold tracking-tight text-slate-900 font-sans">
                        Meus Projetos As-Built
                    </h1>
                    <p className="text-xs text-[#575756]">
                        Selecione um projeto para acessar o painel de verificação ou configure novos acessos.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {isSteclaAdmin && (
                        <Button
                            variant="outline"
                            onClick={() => setLocation("/platform-settings")}
                            className="h-8 px-3.5 rounded-md border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 shadow-xs"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#9C1915]" />
                            Configurações da Plataforma
                        </Button>
                    )}

                    <CreateProjectDialog>
                        <Button className="h-8 px-3.5 rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs">
                            <Plus className="w-3.5 h-3.5" />
                            Novo Projeto
                        </Button>
                    </CreateProjectDialog>
                </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="animate-spin w-6 h-6 text-[#940707]" />
                    <p className="text-slate-400 text-xs font-medium animate-pulse">
                        Carregando projetos...
                    </p>
                </div>
            ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {projects.map((project: any) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-slate-200 p-8">
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-[#940707]" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Nenhum projeto cadastrado
                    </h3>
                    <p className="text-[#6C6A6A] text-xs max-w-sm mb-4 leading-relaxed">
                        Crie seu primeiro projeto para começar a acompanhar as verificações
                        As-Built e modelos BIM.
                    </p>
                    <CreateProjectDialog>
                        <Button className="h-8 px-3.5 rounded-md bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold gap-1.5 shadow-xs">
                            <Plus className="w-3.5 h-3.5" />
                            Criar Primeiro Projeto
                        </Button>
                    </CreateProjectDialog>
                </div>
            )}
        </div>
    );
}
