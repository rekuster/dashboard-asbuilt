import React from "react";
import { Building2, MapPin, Calendar, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

interface ProjectCardProps {
    project: {
        id: string;
        code: string;
        name: string;
        client?: string | null;
        location?: string | null;
        status: string;
        imageUrl?: string | null;
        startDate?: string | null;
        createdAt: string;
    };
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ativo: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Ativo" },
    concluido: { bg: "bg-slate-100 border-slate-200", text: "text-slate-700", label: "Concluído" },
    arquivado: { bg: "bg-slate-100 border-slate-200", text: "text-slate-500", label: "Arquivado" },
};

export default function ProjectCard({ project }: ProjectCardProps) {
    const [, setLocation] = useLocation();
    const statusStyle = statusColors[project.status] || statusColors.ativo;

    return (
        <Card
            className="group cursor-pointer border border-slate-200 bg-white rounded-xl hover:border-[#940707] hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            onClick={() => setLocation(`/project/${project.id}`)}
        >
            {/* Image / header */}
            <div className="h-28 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-200/80">
                {project.imageUrl ? (
                    <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                        <Building2 className="w-8 h-8 text-slate-400 group-hover:text-[#940707] transition-colors" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Stecla Engenharia
                        </span>
                    </div>
                )}

                {/* Status badge */}
                <div className="absolute top-2.5 right-2.5">
                    <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text}`}
                    >
                        {statusStyle.label}
                    </span>
                </div>

                {/* Code badge */}
                <div className="absolute bottom-2.5 left-2.5">
                    <span className="bg-[#940707] text-white text-[9px] font-bold tracking-widest px-2 py-0.5 rounded shadow-xs">
                        {project.code}
                    </span>
                </div>
            </div>

            <CardContent className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-[#940707] transition-colors line-clamp-2">
                        {project.name}
                    </h3>
                </div>

                {/* Metadata */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                    {project.client && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6C6A6A]">
                            <Users className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{project.client}</span>
                        </div>
                    )}
                    {project.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6C6A6A]">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{project.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>
                            {project.startDate
                                ? new Date(project.startDate).toLocaleDateString("pt-BR")
                                : new Date(project.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
