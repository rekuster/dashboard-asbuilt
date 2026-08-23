import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
    getCanonicalDiscipline,
    getDisciplineDisplayName,
    isSameDiscipline,
    normalizeEdificacao,
} from "./constants";
import { IssueKPICards } from "./components/IssueKPICards";
import { DisciplineQualityMatrix } from "./components/DisciplineQualityMatrix";
import { RoomVerificationView } from "./components/RoomVerificationView";
import { VerificationReportDialog } from "./components/VerificationReportDialog";
import { Loader2, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IssueManagerTab({ projectId }: { projectId: string }) {
    const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    // Queries
    const { data: bcfFiles = [] } = trpc.issues.getBcfFiles.useQuery(
        { projectId },
        { enabled: !!projectId }
    );
    const partnerBcfFiles = useMemo(() => {
        return bcfFiles.filter((b: any) => b.uploadedBy === "Parceiro");
    }, [bcfFiles]);

    const utils = trpc.useUtils();

    // Auth & Roles Checks
    const { user } = useAuth();
    const { isEditor, isParceiro, isAdmin } = useProjectRole(projectId);
    const { data: project } = trpc.projects.getById.useQuery(
        { id: projectId },
        { enabled: !!projectId }
    );

    // Disciplinas configuradas no projeto
    const disciplinesConfig = useMemo(() => {
        if (project?.disciplinesConfig) {
            try {
                return JSON.parse(project.disciplinesConfig);
            } catch (e) {
                // ignore
            }
        }
        return [];
    }, [project]);

    // Queries
    const { data: issues = [], isLoading: issuesLoading } = trpc.dashboard.getApontamentos.useQuery({
        projectId,
    });
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({
        projectId,
    });
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: allVerificacoes = [] } = trpc.dashboard.getAllVerificacoes.useQuery({
        projectId,
    });

    const uniqueEdificacoes = useMemo(() => {
        const edifs = new Set(salas.map((s: any) => s.edificacao).filter(Boolean));
        issues.forEach((i: any) => {
            if (i.edificacao) edifs.add(i.edificacao);
        });
        return Array.from(edifs).sort() as string[];
    }, [salas, issues]);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Estatísticas Globais dos Apontamentos
    const stats = useMemo(() => {
        const total = issues.length;
        const active = issues.filter((i: any) => i.status === "ATIVA").length;
        const revision = issues.filter((i: any) => i.status === "EM_REVISAO").length;
        const resolved = issues.filter(
            (i: any) => i.status === "RESOLVIDA" || i.status === "SANADA"
        ).length;
        const qualityRate = total > 0 ? (resolved / total) * 100 : 100;

        return { total, active, revision, resolved, qualityRate };
    }, [issues]);

    // Estatísticas por Responsável (Ocle, Thá, Stecla, etc.)
    const chartStatsPerResponsavel = useMemo(() => {
        const resps = Array.from(
            new Set(issues.map((i: any) => i.responsavel).filter(Boolean))
        ) as string[];

        return resps.map((resp) => {
            const respIssues = issues.filter((i: any) => i.responsavel === resp);
            const total = respIssues.length;
            const active = respIssues.filter((i: any) => i.status === "ATIVA").length;
            const revision = respIssues.filter(
                (i: any) => i.status === "EM_REVISAO"
            ).length;
            const resolved = respIssues.filter(
                (i: any) => i.status === "RESOLVIDA" || i.status === "SANADA"
            ).length;
            const totalQuality = total > 0 ? Math.round((resolved / total) * 100) : 100;

            const discMap: Record<string, { total: number; resolvida: number; revisao: number; ativa: number }> = {};
            respIssues.forEach((i: any) => {
                const canon = getCanonicalDiscipline(i.disciplina, disciplinesConfig);
                if (!discMap[canon]) {
                    discMap[canon] = { total: 0, resolvida: 0, revisao: 0, ativa: 0 };
                }
                discMap[canon].total++;
                if (i.status === "RESOLVIDA" || i.status === "SANADA") {
                    discMap[canon].resolvida++;
                } else if (i.status === "EM_REVISAO") {
                    discMap[canon].revisao++;
                } else {
                    discMap[canon].ativa++;
                }
            });

            const data = Object.keys(discMap).map((d) => ({
                name: d,
                ...discMap[d],
                qualidade: `${Math.round((discMap[d].resolvida / discMap[d].total) * 100)}%`,
            }));

            return {
                responsavel: resp,
                total,
                active,
                revision,
                resolved,
                totalQuality,
                data,
            };
        });
    }, [issues, disciplinesConfig]);

    // Validação e Apontamentos agrupados por Disciplina Canônica Única -> Edificação -> Salas
    const groupedValidation = useMemo(() => {
        const map: Record<string, Record<string, any[]>> = {};

        // Coleta apenas siglas canônicas únicas presentes em apontamentos
        const canonDisciplinesSet = new Set<string>();
        issues.forEach((i: any) => {
            if (i.disciplina) {
                canonDisciplinesSet.add(getCanonicalDiscipline(i.disciplina, disciplinesConfig));
            }
        });

        const activeDisciplinesList = Array.from(canonDisciplinesSet).sort();

        activeDisciplinesList.forEach((canonDisc) => {
            const salasMap = new Map<string | number, any>();

            // Inclui todas as salas com apontamentos nesta disciplina
            issues.forEach((issue: any) => {
                if (
                    getCanonicalDiscipline(issue.disciplina, disciplinesConfig) === canonDisc &&
                    issue.sala
                ) {
                    const salaObj = salas.find(
                        (s: any) =>
                            s.nome?.trim().toLowerCase() === issue.sala?.trim().toLowerCase() ||
                            s.numeroSala?.trim() === issue.sala?.trim()
                    );
                    const salaKey = salaObj ? salaObj.id : issue.sala;

                    if (!salasMap.has(salaKey)) {
                        salasMap.set(salaKey, {
                            id: salaObj ? salaObj.id : issue.id,
                            salaId: salaObj ? salaObj.id : issue.id,
                            nome: issue.sala,
                            salaNome: issue.sala,
                            edificacao: issue.edificacao || salaObj?.edificacao || "Outros",
                            pavimento: issue.pavimento || salaObj?.pavimento || "—",
                            numeroSala: salaObj?.numeroSala || issue.sala,
                        });
                    }
                }
            });

            // Agrupa as salas por Edificação
            salasMap.forEach((sala) => {
                const roomApontamentos = issues.filter(
                    (a: any) =>
                        (a.sala?.trim().toLowerCase() === sala.nome?.trim().toLowerCase() ||
                         a.sala?.trim().toLowerCase() === sala.salaNome?.trim().toLowerCase()) &&
                        getCanonicalDiscipline(a.disciplina, disciplinesConfig) === canonDisc
                );

                const activeIssues = roomApontamentos.filter(
                    (a: any) => a.status === "ATIVA"
                );
                const revisionIssues = roomApontamentos.filter(
                    (a: any) => a.status === "EM_REVISAO"
                );
                const resolvedIssues = roomApontamentos.filter(
                    (a: any) => a.status === "RESOLVIDA" || a.status === "SANADA"
                );

                const verification = allVerificacoes.find(
                    (v: any) =>
                        v.salaId === sala.id &&
                        getCanonicalDiscipline(v.disciplina, disciplinesConfig) === canonDisc
                );

                let statusDisciplina = "PENDENTE";
                if (
                    verification?.status === "OK" ||
                    (verification as any)?.resultado === "CONFORME" ||
                    (roomApontamentos.length > 0 && activeIssues.length === 0 && revisionIssues.length === 0)
                ) {
                    statusDisciplina = "OK";
                } else if (activeIssues.length > 0) {
                    statusDisciplina = "AJUSTES";
                } else if (revisionIssues.length > 0) {
                    statusDisciplina = "REVISÃO";
                }

                if (!map[canonDisc]) map[canonDisc] = {};
                if (!map[canonDisc][sala.edificacao]) map[canonDisc][sala.edificacao] = [];

                map[canonDisc][sala.edificacao].push({
                    ...sala,
                    statusDisciplina,
                    divergenciasCount: roomApontamentos.length,
                    apontamentosCount: activeIssues.length,
                    revisionCount: revisionIssues.length,
                    resolvedCount: resolvedIssues.length,
                    apontamentosDetalhados: roomApontamentos,
                });
            });
        });

        return map;
    }, [salas, issues, allVerificacoes, disciplinesConfig]);

    const activeDisciplines = useMemo(() => {
        return Object.keys(groupedValidation).sort();
    }, [groupedValidation]);

    const disciplines = useMemo(
        () =>
            Array.from(new Set(issues.map((i: any) => i.disciplina)))
                .filter(Boolean)
                .sort(),
        [issues]
    );

    // Lista de todas as salas da disciplina selecionada para navegação sequencial
    const allRoomsInCurrentDiscipline = useMemo(() => {
        if (!selectedDiscipline || !groupedValidation[selectedDiscipline]) return [];
        const list: any[] = [];
        Object.values(groupedValidation[selectedDiscipline]).forEach((roomGroup) => {
            list.push(...roomGroup);
        });
        return list;
    }, [selectedDiscipline, groupedValidation]);

    if (issuesLoading && issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#9C1915]" />
                <p className="text-xs text-slate-500 font-medium">Carregando apontamentos...</p>
            </div>
        );
    }

    // NÍVEL 3: Página Dedicada de Verificação da Sala Selecionada
    if (selectedDiscipline && selectedRoom) {
        return (
            <RoomVerificationView
                projectId={projectId}
                discipline={selectedDiscipline}
                sala={selectedRoom}
                allRoomsInDiscipline={allRoomsInCurrentDiscipline}
                onBack={() => setSelectedRoom(null)}
                onSelectRoom={setSelectedRoom}
            />
        );
    }

    // NÍVEL 1 & 2: Visão Geral de Disciplinas ou Tabela de Salas da Disciplina
    return (
        <div className="space-y-3.5 font-sans pb-12 animate-in fade-in duration-150">
            {/* Header com Stats (Visível na página principal de disciplinas) */}
            {!selectedDiscipline && <IssueKPICards stats={stats} />}

            {/* ALERTA DE DEVOLUÇÃO BCF DO PROJETISTA (APENAS QUANDO HOUVER ARQUIVO REAL DO PARCEIRO) */}
            {!selectedDiscipline && partnerBcfFiles.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50/95 via-amber-50/70 to-white border border-amber-300/80 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#9C1915] rounded-full border-2 border-white" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white tracking-wider">
                                        Devolução BCF Recebida
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                        {partnerBcfFiles[0].disciplina} • {partnerBcfFiles[0].edificacao}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {new Date(partnerBcfFiles[0].createdAt).toLocaleDateString("pt-BR")}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    O parceiro enviou o pacote BCF atualizado ({partnerBcfFiles[0].fileName}). Os comentários e notas técnicas foram sincronizados nas salas para sua auditoria no Navisworks.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setSelectedDiscipline(partnerBcfFiles[0].disciplina)}
                                className="h-8 px-3.5 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs transition-transform active:scale-95"
                            >
                                <span>Auditar {partnerBcfFiles[0].disciplina}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gestão por Disciplina (Cards ou Tabela de Salas) */}
            <DisciplineQualityMatrix
                projectId={projectId}
                chartStatsPerResponsavel={chartStatsPerResponsavel}
                activeDisciplines={activeDisciplines}
                selectedDiscipline={selectedDiscipline}
                onSelectDiscipline={(disc) => {
                    setSelectedDiscipline(disc);
                    setSelectedRoom(null);
                }}
                onSelectRoom={(sala) => setSelectedRoom(sala)}
                groupedValidation={groupedValidation}
                onOpenReportModal={() => setIsReportModalOpen(true)}
            />

            <VerificationReportDialog
                projectId={projectId}
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                edificacoes={uniqueEdificacoes}
                disciplinas={disciplines}
            />
        </div>
    );
}
