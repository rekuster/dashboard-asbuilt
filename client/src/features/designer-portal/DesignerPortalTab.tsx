import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
    getCanonicalDiscipline,
    getDisciplineDisplayName,
    DISCIPLINE_MAPPING,
} from "../issues/constants";
import { DesignerDisciplineCards } from "./components/DesignerDisciplineCards";
import { DesignerRoomsTable } from "./components/DesignerRoomsTable";
import { DesignerRoomResolutionView } from "./components/DesignerRoomResolutionView";
import { BcfUploadModal } from "@/components/dashboard/BcfUploadModal";
import { Loader2 } from "lucide-react";

interface DesignerPortalTabProps {
    projectId: string;
    selectedEdificacao?: string | null;
}

export default function DesignerPortalTab({
    projectId,
    selectedEdificacao: initialEdificacao,
}: DesignerPortalTabProps) {
    const { user } = useAuth();
    const { isParceiro, isAdmin, isEditor, empresa } = useProjectRole(projectId);

    // Estados de Navegação dos 3 Níveis
    const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [isBcfUploadOpen, setIsBcfUploadOpen] = useState(false);

    // Filtro de Edificação & Empresa Parceira
    const [selectedEdificacao, setSelectedEdificacao] = useState<string>(
        initialEdificacao || "todas"
    );
    const [selectedCompany, setSelectedCompany] = useState<string>(
        isParceiro && empresa ? empresa : "todas"
    );

    React.useEffect(() => {
        if (isParceiro && empresa) {
            setSelectedCompany(empresa);
        }
    }, [isParceiro, empresa]);

    // Queries
    const { data: project } = trpc.projects.getById.useQuery(
        { id: projectId },
        { enabled: !!projectId }
    );
    const { data: apontamentos = [], isLoading: loadingIssues } =
        trpc.dashboard.getApontamentos.useQuery({ projectId });
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({ projectId });
    const { data: bcfFiles = [] } = trpc.issues.getBcfFiles.useQuery(
        {
            projectId,
            edificacao: selectedEdificacao !== "todas" ? selectedEdificacao : undefined,
        },
        { enabled: !!projectId }
    );

    // Configuração de Disciplinas do Projeto
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

    // Lista de Edificações Únicas
    const edificacoesList = useMemo(() => {
        const set = new Set<string>();
        salas.forEach((s: any) => {
            if (s.edificacao) set.add(s.edificacao);
        });
        apontamentos.forEach((a: any) => {
            if (a.edificacao) set.add(a.edificacao);
        });
        return Array.from(set).sort();
    }, [salas, apontamentos]);

    // Lista de Empresas Configuradas
    const companiesList = useMemo(() => {
        if (project?.companiesConfig) {
            try {
                return JSON.parse(project.companiesConfig);
            } catch (e) {
                // ignore
            }
        }
        const set = new Set<string>();
        disciplinesConfig.forEach((d: any) => {
            if (d.responsavel) set.add(d.responsavel);
        });
        apontamentos.forEach((a: any) => {
            if (a.responsavel) set.add(a.responsavel);
        });
        return Array.from(set).sort();
    }, [project, disciplinesConfig, apontamentos]);

    // Apontamentos Verificados para o Portal (EM_REVISAO ou SANADA ou com BCF atribuído)
    const verifiedApontamentos = useMemo(() => {
        return apontamentos.filter((a: any) => {
            const hasBcf = !!(a.bcfIssueId || a.numeroBcf || (typeof a.bcfId === "number" || (typeof a.bcfId === "string" && a.bcfId.trim() !== "")));
            const isRevisaoOrSanada = a.status === "EM_REVISAO" || a.status === "SANADA" || a.status === "RESOLVIDA";
            // O projetista só visualiza o que já foi verificado pela Stecla (tem BCF ou está em revisão/sanada)
            return isRevisaoOrSanada || hasBcf;
        });
    }, [apontamentos]);

    // Disciplinas agrupadas com métricas consolidadas (filtradas por Edificação e Empresa)
    const disciplinesWithStats = useMemo(() => {
        const canonSet = new Set<string>();
        verifiedApontamentos.forEach((a: any) => {
            if (a.disciplina) {
                canonSet.add(getCanonicalDiscipline(a.disciplina, disciplinesConfig));
            }
        });

        // Constrói lista de cards por disciplina
        const list = Array.from(canonSet).map((sigla) => {
            const canonical = sigla.toUpperCase();

            // Identifica responsável e nome de exibição
            let responsavel = "Stecla";
            const customFound = disciplinesConfig.find(
                (c: any) => c.sigla.toUpperCase() === canonical
            );
            if (customFound && customFound.responsavel) {
                responsavel = customFound.responsavel;
            } else if (DISCIPLINE_MAPPING[canonical]?.responsavel) {
                responsavel = DISCIPLINE_MAPPING[canonical].responsavel;
            }

            const discIssues = verifiedApontamentos.filter((a: any) => {
                const aCanon = getCanonicalDiscipline(a.disciplina, disciplinesConfig);
                const matchesDisc = aCanon === canonical;
                const matchesEdif =
                    selectedEdificacao === "todas" || a.edificacao === selectedEdificacao;
                return matchesDisc && matchesEdif;
            });

            if (discIssues.length > 0 && discIssues[0].responsavel) {
                responsavel = discIssues[0].responsavel;
            }

            const totalApontamentos = discIssues.length;
            const ativas = discIssues.filter((a: any) => a.status === "ATIVA").length;
            const emRevisao = discIssues.filter((a: any) => a.status === "EM_REVISAO" || (a.status === "ATIVA" && (a.bcfIssueId || a.numeroBcf))).length;
            const sanadas = discIssues.filter(
                (a: any) => a.status === "SANADA" || a.status === "RESOLVIDA"
            ).length;
            const taxaResolucao =
                totalApontamentos > 0 ? Math.round((sanadas / totalApontamentos) * 100) : 100;

            const salasSet = new Set(discIssues.map((a: any) => a.sala).filter(Boolean));
            const totalSalas = salasSet.size;

            const displayName = getDisciplineDisplayName(canonical, disciplinesConfig);

            // BCF File vinculado a esta disciplina e edificação
            const foundBcf = bcfFiles.find(
                (b: any) =>
                    b.disciplina?.toUpperCase() === canonical &&
                    (selectedEdificacao === "todas" || b.edificacao === selectedEdificacao)
            );

            return {
                sigla: canonical,
                displayName: customFound?.nome || displayName.replace(` (${canonical})`, ""),
                responsavel,
                totalSalas,
                totalApontamentos,
                ativas,
                emRevisao,
                sanadas,
                taxaResolucao,
                bcfFileUrl: foundBcf?.fileUrl || null,
            };
        });

        // Filtragem por empresa e salas > 0
        return list
            .filter((d) => {
                if (selectedCompany === "todas") return true;
                return d.responsavel.toLowerCase() === selectedCompany.toLowerCase();
            })
            .filter((d) => d.totalApontamentos > 0)
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [verifiedApontamentos, disciplinesConfig, selectedCompany, selectedEdificacao, bcfFiles]);

    // Salas da Disciplina Selecionada (Nível 2)
    const selectedDisciplineRooms = useMemo(() => {
        if (!selectedDiscipline) return [];

        const canonical = selectedDiscipline.toUpperCase();
        const discIssues = verifiedApontamentos.filter((a: any) => {
            const aCanon = getCanonicalDiscipline(a.disciplina, disciplinesConfig);
            const matchesDisc = aCanon === canonical;
            const matchesEdif =
                selectedEdificacao === "todas" || a.edificacao === selectedEdificacao;
            return matchesDisc && matchesEdif;
        });

        // Agrupa por sala
        const map: Record<string, any> = {};

        discIssues.forEach((issue: any) => {
            const sName = (issue.sala || "").trim();
            if (!sName) return;

            if (!map[sName]) {
                const salaMeta = salas.find((s: any) => s.nome === sName);
                map[sName] = {
                    sala: sName,
                    numeroSala: salaMeta?.numeroSala || issue.numeroSala || "",
                    edificacao: issue.edificacao || salaMeta?.edificacao || "Geral",
                    pavimento: issue.pavimento || salaMeta?.pavimento || "",
                    setor: salaMeta?.setor || "",
                    total: 0,
                    ativas: 0,
                    emRevisao: 0,
                    sanadas: 0,
                    status: "CONFORME",
                    apontamentos: [],
                };
            }

            map[sName].total++;
            map[sName].apontamentos.push(issue);

            if (issue.status === "EM_REVISAO" || (issue.status === "ATIVA" && (issue.bcfIssueId || issue.numeroBcf))) {
                map[sName].emRevisao++;
            } else if (issue.status === "SANADA" || issue.status === "RESOLVIDA") {
                map[sName].sanadas++;
            } else {
                map[sName].ativas++;
            }
        });

        // Define status de cada sala
        return Object.values(map)
            .map((r: any) => {
                let status: "CONFORME" | "EM_REVISAO" | "ATIVA" = "CONFORME";
                if (r.emRevisao > 0 || r.ativas > 0) {
                    status = "EM_REVISAO";
                }
                return { ...r, status };
            })
            .filter((r) => r.total > 0);
    }, [selectedDiscipline, verifiedApontamentos, disciplinesConfig, salas, selectedEdificacao]);

    // Dados da disciplina selecionada
    const currentDisciplineInfo = useMemo(() => {
        if (!selectedDiscipline) return null;
        return disciplinesWithStats.find((d) => d.sigla === selectedDiscipline) || {
            sigla: selectedDiscipline,
            displayName: getDisciplineDisplayName(selectedDiscipline, disciplinesConfig),
            responsavel: "Stecla",
            bcfFileUrl: null,
        };
    }, [selectedDiscipline, disciplinesWithStats, disciplinesConfig]);

    if (loadingIssues) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="animate-spin w-8 h-8 text-[#9C1915]" />
                <p className="text-xs text-slate-500 font-medium animate-pulse">
                    Carregando dados do Portal As-Built...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-full pb-8">
            {/* NÍVEL 1: VISÃO DE CARDS POR DISCIPLINA */}
            {!selectedDiscipline && (
                <DesignerDisciplineCards
                    disciplines={disciplinesWithStats}
                    onSelectDiscipline={(sigla) => {
                        setSelectedDiscipline(sigla);
                        setSelectedRoom(null);
                    }}
                    isAdmin={isAdmin || isEditor}
                    selectedCompany={selectedCompany}
                    onCompanyChange={setSelectedCompany}
                    companiesList={companiesList}
                    selectedEdificacao={selectedEdificacao}
                    onEdificacaoChange={setSelectedEdificacao}
                    edificacoesList={edificacoesList}
                />
            )}

            {/* NÍVEL 2: TABELA DE SALAS DA DISCIPLINA */}
            {selectedDiscipline && !selectedRoom && currentDisciplineInfo && (
                <DesignerRoomsTable
                    disciplineSigla={currentDisciplineInfo.sigla}
                    disciplineDisplayName={currentDisciplineInfo.displayName}
                    responsavel={currentDisciplineInfo.responsavel}
                    rooms={selectedDisciplineRooms}
                    bcfFileUrl={currentDisciplineInfo.bcfFileUrl}
                    onBack={() => {
                        setSelectedDiscipline(null);
                        setSelectedRoom(null);
                    }}
                    onSelectRoom={(room) => setSelectedRoom(room)}
                    onUploadBcf={() => setIsBcfUploadOpen(true)}
                />
            )}

            {/* NÍVEL 3: FICHA DE RESOLUÇÃO AS-BUILT DA SALA */}
            {selectedDiscipline && selectedRoom && currentDisciplineInfo && (
                <DesignerRoomResolutionView
                    projectId={projectId}
                    room={selectedRoom}
                    disciplineSigla={currentDisciplineInfo.sigla}
                    disciplineDisplayName={currentDisciplineInfo.displayName}
                    responsavel={currentDisciplineInfo.responsavel}
                    disciplinesConfig={disciplinesConfig}
                    allRooms={selectedDisciplineRooms}
                    onBack={() => setSelectedRoom(null)}
                    onNavigateRoom={(newRoom) => setSelectedRoom(newRoom)}
                />
            )}

            {/* MODAL DE UPLOAD DE BCF (ADMIN E PARCEIROS) */}
            <BcfUploadModal
                isOpen={isBcfUploadOpen}
                onClose={() => setIsBcfUploadOpen(false)}
                projectId={projectId}
                initialDiscipline={selectedDiscipline || undefined}
                initialEdificacao={selectedEdificacao !== "todas" ? selectedEdificacao : undefined}
                disciplinesList={disciplinesWithStats.map((d) => ({
                    sigla: d.sigla,
                    nome: d.displayName,
                }))}
                edificacoesList={edificacoesList.length > 0 ? edificacoesList : ["Prédio Produção"]}
            />
        </div>
    );
}
