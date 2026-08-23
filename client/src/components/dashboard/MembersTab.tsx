import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useProjectRole } from '@/hooks/useProjectRole';
import { 
    Users, 
    UserPlus, 
    Trash2, 
    Mail, 
    Clock, 
    Check, 
    Shield, 
    User,
    Loader2,
    ShieldAlert,
    UserCheck,
    Building2,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MembersTabProps {
    projectId: string;
}

const ROLE_LABELS = {
    owner: 'Proprietário',
    admin: 'Administrador (Stecla)',
    editor: 'Editor',
    viewer: 'Visualizador',
    parceiro: 'Projetista / Parceiro',
};

const ROLE_COLORS = {
    owner: 'bg-rose-500/10 text-[#9C1915] border-red-200 font-bold',
    admin: 'bg-amber-500/10 text-amber-800 border-amber-200 font-bold',
    editor: 'bg-blue-500/10 text-blue-800 border-blue-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-200',
    parceiro: 'bg-purple-50 text-purple-800 border-purple-200 font-bold',
};

const EMPRESAS_SUGESTOES = ['Stecla', 'Ocle', 'Thá', 'Neo', 'Cliente / Diretoria', 'Outra'];

export default function MembersTab({ projectId }: MembersTabProps) {
    const utils = trpc.useUtils();
    
    // User role check
    const { isAdmin } = useProjectRole(projectId);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer' | 'parceiro'>('viewer');
    const [inviteEmpresa, setInviteEmpresa] = useState('Stecla');
    const [isInviting, setIsInviting] = useState(false);

    // Fetch members
    const { data: members, isLoading, error } = trpc.members.list.useQuery(
        { projectId },
        { enabled: !!projectId }
    );

    // Fetch registered platform users for quick selection
    const { data: availableUsers } = trpc.members.searchUsers.useQuery(
        { projectId, query: '' },
        { enabled: isAdmin }
    );

    // Mutations
    const inviteMutation = trpc.members.invite.useMutation({
        onSuccess: () => {
            toast.success("Membro convidado com sucesso!");
            setInviteEmail('');
            utils.members.list.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error(err.message || "Erro ao convidar membro.");
        }
    });

    const updateMemberMutation = trpc.members.updateMember.useMutation({
        onSuccess: () => {
            toast.success("Dados do membro atualizados!");
            utils.members.list.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error(err.message || "Erro ao atualizar membro.");
        }
    });

    const removeMutation = trpc.members.remove.useMutation({
        onSuccess: () => {
            toast.success("Membro removido com sucesso!");
            utils.members.list.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error(err.message || "Erro ao remover membro.");
        }
    });

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setIsInviting(true);
        try {
            await inviteMutation.mutateAsync({
                projectId,
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
                empresa: inviteEmpresa,
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (memberId: string, role: 'admin' | 'editor' | 'viewer' | 'parceiro') => {
        try {
            await updateMemberMutation.mutateAsync({
                projectId,
                memberId,
                role,
            });
        } catch (err) {
            // Handled in mutation
        }
    };

    const handleEmpresaChange = async (memberId: string, empresa: string) => {
        try {
            await updateMemberMutation.mutateAsync({
                projectId,
                memberId,
                empresa,
            });
        } catch (err) {
            // Handled in mutation
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm("Tem certeza de que deseja remover este membro do projeto?")) return;

        try {
            await removeMutation.mutateAsync({
                projectId,
                memberId,
            });
        } catch (err) {
            // Handled in mutation
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[#9C1915]" />
                <p className="text-xs font-semibold animate-pulse">Carregando membros do projeto...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-red-600">
                <ShieldAlert className="h-10 w-10 mb-2" />
                <p className="text-sm font-bold">Erro ao carregar membros do projeto.</p>
                <p className="text-xs text-slate-500 mt-1">{error.message}</p>
            </div>
        );
    }

    // Filtrar sugestões de usuários cadastrados na plataforma que ainda NÃO são membros do projeto
    const currentMemberEmails = new Set(members?.map(m => m.email.toLowerCase()) || []);
    const registeredNonMembers = availableUsers?.filter(u => !currentMemberEmails.has(u.email.toLowerCase())) || [];

    return (
        <div className="space-y-6">
            {/* Seção de Convite (Apenas para Admins) */}
            {isAdmin && (
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                    <div className="h-1 w-full bg-[#9C1915]"></div>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                            <UserPlus className="h-4 w-4 text-[#9C1915]" />
                            Convidar Membro para o Projeto
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Adicione projetistas parceiros ou auditores internos atribuindo o papel e a empresa correspondente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                {/* Email */}
                                <div className="md:col-span-5 space-y-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">E-mail do Usuário</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="email"
                                            placeholder="ex: celso.cruz@ocle.com.br"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="pl-8 text-xs h-8.5 rounded-lg border-slate-200"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Empresa */}
                                <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">Empresa / Parceiro</Label>
                                    <Select value={inviteEmpresa} onValueChange={setInviteEmpresa}>
                                        <SelectTrigger className="text-xs h-8.5 rounded-lg border-slate-200">
                                            <SelectValue placeholder="Selecione a empresa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EMPRESAS_SUGESTOES.map((emp) => (
                                                <SelectItem key={emp} value={emp} className="text-xs">
                                                    {emp}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Papel */}
                                <div className="md:col-span-4 space-y-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">Papel / Função</Label>
                                    <div className="flex gap-2">
                                        <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                                            <SelectTrigger className="text-xs h-8.5 rounded-lg border-slate-200 flex-1">
                                                <SelectValue placeholder="Selecione o papel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin" className="text-xs">
                                                    Administrador (Stecla)
                                                </SelectItem>
                                                <SelectItem value="editor" className="text-xs">
                                                    Editor
                                                </SelectItem>
                                                <SelectItem value="parceiro" className="text-xs">
                                                    Projetista / Parceiro (Acesso Portal As-Built)
                                                </SelectItem>
                                                <SelectItem value="viewer" className="text-xs">
                                                    Visualizador
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button 
                                            type="submit" 
                                            disabled={isInviting || !inviteEmail.trim()}
                                            size="sm"
                                            className="h-8.5 px-4 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white shrink-0 shadow-xs"
                                        >
                                            {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Convidar"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Atalhos de Usuários Cadastrados */}
                        {registeredNonMembers.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                                    Usuários cadastrados na plataforma (clique para preencher):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {registeredNonMembers.slice(0, 5).map((u) => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => {
                                                setInviteEmail(u.email);
                                                if (u.email.includes("ocle")) setInviteEmpresa("Ocle");
                                                else if (u.email.includes("tha")) setInviteEmpresa("Thá");
                                                else setInviteEmpresa("Stecla");
                                            }}
                                            className="text-[11px] font-medium bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-[#9C1915] border border-slate-200 hover:border-red-200 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                                        >
                                            <UserCheck className="w-3 h-3 text-slate-400" />
                                            {u.name} ({u.email})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Listagem de Membros Atuais */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Membros Integrados ao Projeto ({members?.length || 0})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Usuários autorizados a visualizar ou editar este projeto.
                        </p>
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {members?.map((member) => {
                        const isOwner = member.role === 'owner';
                        return (
                            <div key={member.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900">
                                                {member.name || member.email}
                                            </span>
                                            {member.empresa && (
                                                <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                    {member.empresa}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                            <span>{member.email}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="flex items-center gap-1 text-[10px]">
                                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                                Desde {new Date(member.invitedAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    {/* Empresa selector para Admins */}
                                    {isAdmin && !isOwner ? (
                                        <Select
                                            value={member.empresa || 'Stecla'}
                                            onValueChange={(emp) => handleEmpresaChange(member.id, emp)}
                                        >
                                            <SelectTrigger className="text-[11px] h-7 w-28 rounded-md border-slate-200 bg-white font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EMPRESAS_SUGESTOES.map((emp) => (
                                                    <SelectItem key={emp} value={emp} className="text-xs">
                                                        {emp}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : null}

                                    {/* Role selector para Admins */}
                                    {isAdmin && !isOwner ? (
                                        <Select
                                            value={member.role}
                                            onValueChange={(role: any) => handleRoleChange(member.id, role)}
                                        >
                                            <SelectTrigger className="text-[11px] h-7 w-36 rounded-md border-slate-200 bg-white font-bold text-slate-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                                                <SelectItem value="editor" className="text-xs">Editor</SelectItem>
                                                <SelectItem value="parceiro" className="text-xs">Projetista / Parceiro</SelectItem>
                                                <SelectItem value="viewer" className="text-xs">Visualizador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge className={`text-[10px] px-2.5 py-0.5 border ${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.viewer}`}>
                                            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                                        </Badge>
                                    )}

                                    {/* Botão Remover */}
                                    {isAdmin && !isOwner && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(member.id)}
                                            className="h-7 w-7 p-0 text-slate-400 hover:text-[#9C1915] hover:bg-red-50 rounded-md"
                                            title="Remover membro"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
