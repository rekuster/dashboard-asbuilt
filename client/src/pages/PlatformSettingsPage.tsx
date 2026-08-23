import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    ArrowLeft,
    Users,
    UserPlus,
    Building2,
    Shield,
    Search,
    Check,
    Loader2,
    Briefcase,
    FolderKanban,
    Mail,
    Plus,
    SlidersHorizontal,
    UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const ROLE_OPTIONS = [
    { value: "admin", label: "Administrador (Stecla)" },
    { value: "editor", label: "Editor" },
    { value: "parceiro", label: "Projetista / Parceiro (Portal As-Built)" },
    { value: "viewer", label: "Visualizador" },
];

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-rose-50 text-[#9C1915] border-red-200 font-bold",
    admin: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
    editor: "bg-blue-50 text-blue-800 border-blue-200",
    viewer: "bg-slate-100 text-slate-700 border-slate-200",
    parceiro: "bg-purple-50 text-purple-800 border-purple-200 font-bold",
};

const EMPRESAS = ["Stecla", "Ocle", "Thá", "Neo", "Cliente / Diretoria", "Outra"];

export default function PlatformSettingsPage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const utils = trpc.useUtils();

    const [search, setSearch] = useState("");
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Form de convite
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "editor" | "viewer" | "parceiro">("parceiro");
    const [newEmpresa, setNewEmpresa] = useState("Ocle");
    const [newSelectedProjects, setNewSelectedProjects] = useState<string[]>([]);
    const [isSavingInvite, setIsSavingInvite] = useState(false);

    // Queries
    const { data: platformUsers = [], isLoading: loadingUsers } =
        trpc.members.listAllUsers.useQuery();
    const { data: allProjects = [], isLoading: loadingProjects } =
        trpc.projects.list.useQuery();

    const updateMembershipsMutation = trpc.members.updateUserMemberships.useMutation({
        onSuccess: () => {
            toast.success("Acessos e permissões do usuário atualizados com sucesso!");
            utils.members.listAllUsers.invalidate();
            utils.projects.list.invalidate();
        },
        onError: (err) => {
            toast.error("Erro ao atualizar acessos: " + err.message);
        },
    });

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return platformUsers;
        return platformUsers.filter((u: any) => {
            const matchesName = (u.name || "").toLowerCase().includes(q);
            const matchesEmail = (u.email || "").toLowerCase().includes(q);
            const matchesEmpresa = (u.empresa || "").toLowerCase().includes(q);
            return matchesName || matchesEmail || matchesEmpresa;
        });
    }, [platformUsers, search]);

    const stats = useMemo(() => {
        const total = platformUsers.length;
        const parceiros = platformUsers.filter((u: any) => u.role === "parceiro").length;
        const admins = platformUsers.filter((u: any) => u.role === "admin" || u.role === "owner").length;
        const totalProjetos = allProjects.length;
        return { total, parceiros, admins, totalProjetos };
    }, [platformUsers, allProjects]);

    const handleToggleProjectForUser = async (userObj: any, projectId: string) => {
        const currentProjectIds = (userObj.projects || []).map((p: any) => p.projectId);
        const hasProject = currentProjectIds.includes(projectId);

        const newProjectIds = hasProject
            ? currentProjectIds.filter((id: string) => id !== projectId)
            : [...currentProjectIds, projectId];

        await updateMembershipsMutation.mutateAsync({
            email: userObj.email,
            name: userObj.name,
            role: userObj.role || "parceiro",
            empresa: userObj.empresa || "Stecla",
            projectIds: newProjectIds,
        });
    };

    const handleRoleChangeForUser = async (userObj: any, newRoleVal: any) => {
        const currentProjectIds = (userObj.projects || []).map((p: any) => p.projectId);
        await updateMembershipsMutation.mutateAsync({
            email: userObj.email,
            name: userObj.name,
            role: newRoleVal,
            empresa: userObj.empresa || "Stecla",
            projectIds: currentProjectIds,
        });
    };

    const handleEmpresaChangeForUser = async (userObj: any, newEmpresaVal: string) => {
        const currentProjectIds = (userObj.projects || []).map((p: any) => p.projectId);
        await updateMembershipsMutation.mutateAsync({
            email: userObj.email,
            name: userObj.name,
            role: userObj.role || "parceiro",
            empresa: newEmpresaVal,
            projectIds: currentProjectIds,
        });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsSavingInvite(true);
        try {
            await updateMembershipsMutation.mutateAsync({
                email: newEmail.trim().toLowerCase(),
                name: newName.trim() || undefined,
                role: newRole,
                empresa: newEmpresa,
                projectIds: newSelectedProjects,
            });
            toast.success("Usuário cadastrado e projetos vinculados!");
            setIsInviteOpen(false);
            setNewEmail("");
            setNewName("");
            setNewSelectedProjects([]);
        } finally {
            setIsSavingInvite(false);
        }
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans animate-in fade-in duration-200">
            {/* Header + Actions (Padrão Oficial Stecla) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/")}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 gap-1.5"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#9C1915]" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-[#9C1915]" />
                            Configurações da Plataforma
                        </h1>
                        <p className="text-xs text-[#575756]">
                            Gestão unificada de usuários, empresas parceiras e liberação de acessos aos projetos.
                        </p>
                    </div>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-8 px-3.5 rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs shrink-0">
                            <UserPlus className="w-3.5 h-3.5" />
                            Novo Usuário
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-[#9C1915]" />
                                Cadastrar Usuário & Liberar Projetos
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Informe os dados do usuário e selecione imediatamente os projetos aos quais ele terá acesso.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-slate-600">E-mail do Usuário *</Label>
                                <Input
                                    type="email"
                                    placeholder="ex: celso.cruz@ocle.com.br"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="text-xs h-8.5"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">Nome Completo</Label>
                                    <Input
                                        type="text"
                                        placeholder="Nome do usuário"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="text-xs h-8.5"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">Empresa / Parceiro</Label>
                                    <Select value={newEmpresa} onValueChange={setNewEmpresa}>
                                        <SelectTrigger className="text-xs h-8.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EMPRESAS.map((emp) => (
                                                <SelectItem key={emp} value={emp} className="text-xs">
                                                    {emp}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-slate-600">Papel / Perfil</Label>
                                <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                                    <SelectTrigger className="text-xs h-8.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value} className="text-xs">
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-slate-100">
                                <Label className="text-[10px] font-bold uppercase text-slate-600 block">
                                    Vincular aos Projetos ({newSelectedProjects.length} selecionados):
                                </Label>
                                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                    {allProjects.map((p) => {
                                        const isChecked = newSelectedProjects.includes(p.id);
                                        return (
                                            <label
                                                key={p.id}
                                                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-white transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewSelectedProjects([...newSelectedProjects, p.id]);
                                                        } else {
                                                            setNewSelectedProjects(newSelectedProjects.filter((id) => id !== p.id));
                                                        }
                                                    }}
                                                    className="rounded text-[#9C1915] focus:ring-[#9C1915]"
                                                />
                                                <span className="font-bold text-slate-900">{p.code}</span>
                                                <span>• {p.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsInviteOpen(false)}
                                    className="text-xs"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSavingInvite || !newEmail.trim()}
                                    size="sm"
                                    className="text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white"
                                >
                                    {isSavingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar Usuário"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 4 CARDS DE STATS GERAIS (PADRÃO STECLA) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Usuários Cadastrados</span>
                        <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                        <Users className="w-4.5 h-4.5" />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Projetistas Parceiros</span>
                        <span className="text-2xl font-black text-purple-700">{stats.parceiros}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Briefcase className="w-4.5 h-4.5" />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Administradores</span>
                        <span className="text-2xl font-black text-amber-700">{stats.admins}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Shield className="w-4.5 h-4.5" />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Projetos Ativos</span>
                        <span className="text-2xl font-black text-slate-900">{stats.totalProjetos}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                        <FolderKanban className="w-4.5 h-4.5" />
                    </div>
                </div>
            </div>

            {/* PAINEL PRINCIPAL: TABELA DE USUÁRIOS & PROJETOS VINCULADOS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Matriz de Usuários & Acesso aos Projetos ({filteredUsers.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Clique nas siglas dos projetos para liberar ou revogar o acesso em tempo real.
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por nome, e-mail..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 text-xs h-8.5 rounded-lg border-slate-200 bg-white"
                        />
                    </div>
                </div>

                {loadingUsers || loadingProjects ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#9C1915]" />
                        <p className="text-xs text-slate-500 font-medium">Carregando usuários e projetos...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        Nenhum usuário encontrado com os termos de busca.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredUsers.map((u: any) => {
                            const userProjectIds = (u.projects || []).map((p: any) => p.projectId);
                            const isMasterAdmin = (u.email || "").toLowerCase().includes("renata");

                            return (
                                <div
                                    key={u.email}
                                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                                >
                                    {/* Informações do Usuário */}
                                    <div className="flex items-start gap-3 min-w-[280px]">
                                        <div className="w-9 h-9 rounded-full bg-[#9C1915]/10 text-[#9C1915] border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                                            {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900">{u.name}</span>
                                                {u.role === "admin" && (
                                                    <Badge className="text-[9px] px-1.5 py-0 bg-red-50 text-[#9C1915] border-red-200">
                                                        Admin
                                                    </Badge>
                                                )}
                                                {u.role === "editor" && (
                                                    <Badge className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-800 border-blue-200">
                                                        Editor
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                                <Mail className="w-3 h-3 text-slate-400" />
                                                <span>{u.email}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Empresa e Papel */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Select
                                            value={u.empresa || "Stecla"}
                                            onValueChange={(val) => handleEmpresaChangeForUser(u, val)}
                                        >
                                            <SelectTrigger className="text-[11px] h-7.5 w-28 rounded-md border-slate-200 bg-white font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EMPRESAS.map((emp) => (
                                                    <SelectItem key={emp} value={emp} className="text-xs">
                                                        {emp}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={u.role || "parceiro"}
                                            onValueChange={(val) => handleRoleChangeForUser(u, val)}
                                            disabled={isMasterAdmin}
                                        >
                                            <SelectTrigger className="text-[11px] h-7.5 w-40 rounded-md border-slate-200 bg-white font-bold text-slate-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLE_OPTIONS.map((r) => (
                                                    <SelectItem key={r.value} value={r.value} className="text-xs">
                                                        {r.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Matriz de Projetos Liberados */}
                                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 lg:justify-end">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 hidden xl:inline">
                                            Acesso:
                                        </span>
                                        {allProjects.map((p) => {
                                            const hasAccess = isMasterAdmin || userProjectIds.includes(p.id);

                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    disabled={isMasterAdmin}
                                                    onClick={() => handleToggleProjectForUser(u, p.id)}
                                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                                                        hasAccess
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                                                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                                                    }`}
                                                    title={hasAccess ? `Acesso liberado a ${p.name}. Clique para remover.` : `Sem acesso a ${p.name}. Clique para liberar.`}
                                                >
                                                    {hasAccess ? (
                                                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                                    ) : (
                                                        <Plus className="w-3 h-3 text-slate-400" />
                                                    )}
                                                    <span>{p.code || p.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
