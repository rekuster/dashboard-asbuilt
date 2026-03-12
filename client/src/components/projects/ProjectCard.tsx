import { Building2, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';

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
    ativo: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Ativo' },
    concluido: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Concluído' },
    arquivado: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Arquivado' },
};

export default function ProjectCard({ project }: ProjectCardProps) {
    const [, setLocation] = useLocation();
    const statusStyle = statusColors[project.status] || statusColors.ativo;

    return (
        <Card
            className="group cursor-pointer border border-slate-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
            onClick={() => setLocation(`/project/${project.id}`)}
        >
            {/* Image / gradient header */}
            <div className="h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-slate-50 relative overflow-hidden">
                {project.imageUrl ? (
                    <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-primary/20" />
                    </div>
                )}

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                    </span>
                </div>

                {/* Arrow indicator on hover */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Code + Name */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        {project.code}
                    </p>
                    <h3 className="text-lg font-bold text-foreground mt-0.5 leading-tight group-hover:text-primary transition-colors">
                        {project.name}
                    </h3>
                </div>

                {/* Meta */}
                <div className="space-y-1.5">
                    {project.client && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{project.client}</span>
                        </div>
                    )}
                    {project.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{project.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                            {project.startDate
                                ? new Date(project.startDate).toLocaleDateString('pt-BR')
                                : new Date(project.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
