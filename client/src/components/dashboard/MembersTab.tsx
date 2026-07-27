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
    UserCheck
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
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
    parceiro: 'Parceiro',
};

const ROLE_COLORS = {
    owner: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20 font-bold',
    admin: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20',
    editor: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
    viewer: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
    parceiro: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20',
};

export default function MembersTab({ projectId }: MembersTabProps) {
    const utils = trpc.useUtils();
    
    // User role check
    const { isAdmin } = useProjectRole(projectId);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer' | 'parceiro'>('viewer');
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

    const updateRoleMutation = trpc.members.updateRole.useMutation({
        onSuccess: () => {
            toast.success("Função do membro atualizada com sucesso!");
            utils.members.list.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error(err.message || "Erro ao atualizar função.");
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
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (memberId: string, role: 'admin' | 'editor' | 'viewer' | 'parceiro') => {
        try {
            await updateRoleMutation.mutateAsync({
                projectId,
                memberId,
                role,
            });
        } catch (err) {
            // Already handled
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
            // Already handled
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Carregando lista de membros...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
                <ShieldAlert className="h-10 w-10 mb-4" />
                <p className="text-sm font-medium">Erro ao carregar membros do projeto.</p>
                <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
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
                <Card className="border-border/40 bg-card/30 backdrop-blur-md relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/50 via-indigo-500/50 to-purple-500/50 opacity-70"></div>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Adicionar Membro ao Projeto
                        </CardTitle>
                        <CardDescription>
                            Convide novos usuários por e-mail ou escolha um dos usuários já cadastrados na plataforma abaixo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-1 w-full">
                                <Label htmlFor="email" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">E-mail do Usuário</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="exemplo@stecla.com.br"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="pl-9 bg-background/50 border-border/40 focus:border-primary/50 transition-all duration-300 focus:ring-1 focus:ring-primary/30"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-[220px] space-y-1">
                                <Label htmlFor="role" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Papel / Nível de Acesso</Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(val: any) => setInviteRole(val)}
                                >
                                    <SelectTrigger id="role" className="bg-background/50 border-border/40 focus:border-primary/50">
                                        <SelectValue placeholder="Selecione o papel" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover/90 backdrop-blur-md border-border/40">
                                        <SelectItem value="admin">Administrador (Total)</SelectItem>
                                        <SelectItem value="editor">Editor (Edita dados)</SelectItem>
                                        <SelectItem value="viewer">Visualizador (Somente leitura)</SelectItem>
                                        <SelectItem value="parceiro">Parceiro (Terceiro / BIMcollab)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isInviting} 
                                className="w-full md:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-2 group transition-all duration-300 shadow-md shadow-primary/20"
                            >
                                {isInviting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                        Convidar
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Usuários cadastrados na plataforma disponíveis para adicionar */}
                        {registeredNonMembers.length > 0 && (
                            <div className="pt-3 border-t border-border/20">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                                    Usuários cadastrados na plataforma (clique para preencher):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {registeredNonMembers.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => setInviteEmail(u.email)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 flex items-center gap-2 ${
                                                inviteEmail.toLowerCase() === u.email.toLowerCase()
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background/40 hover:bg-primary/10 border-border/40 text-foreground hover:border-primary/30'
                                            }`}
                                        >
                                            <span className="font-semibold">{u.name}</span>
                                            <span className="opacity-70 text-[11px]">({u.email})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tabela de Membros Atuais */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-md relative overflow-hidden transition-all duration-300">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                        <Users className="h-5 w-5 text-indigo-500" />
                        Membros do Projeto
                    </CardTitle>
                    <CardDescription>
                        Lista de todos os usuários com acesso a este projeto e seus respectivos papéis de autorização.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-border/20 bg-background/20">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-border/30 bg-muted/30 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-left">
                                    <th className="px-4 py-3">Membro / E-mail</th>
                                    <th className="px-4 py-3">Papel / Nível</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Adicionado em</th>
                                    {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {members?.map((member: any) => (
                                    <tr 
                                        key={member.id} 
                                        className="hover:bg-muted/10 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                                    member.role === 'owner' 
                                                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' 
                                                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                }`}>
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                        {member.name || (member.acceptedAt ? member.email.split('@')[0] : 'Convidado Pendente')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {isAdmin && member.role !== 'owner' ? (
                                                <Select
                                                    value={member.role as any}
                                                    onValueChange={(val: any) => handleRoleChange(member.id, val)}
                                                    disabled={updateRoleMutation.isPending}
                                                >
                                                    <SelectTrigger className="h-8 w-[160px] bg-background/50 border-border/40 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-popover/90 backdrop-blur-md border-border/40">
                                                        <SelectItem value="admin">Administrador</SelectItem>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                        <SelectItem value="viewer">Visualizador</SelectItem>
                                                        <SelectItem value="parceiro">Parceiro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={`border px-2.5 py-0.5 font-medium rounded-full text-[11px] ${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS] || ''}`}>
                                                    <Shield className="mr-1 h-3 w-3 inline-block align-text-bottom" />
                                                    {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {member.acceptedAt || member.role === 'owner' ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 w-fit">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 w-fit">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Pendente
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                            {new Date(member.invitedAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3.5 text-right">
                                                {member.role !== 'owner' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemove(member.id)}
                                                        disabled={removeMutation.isPending}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all duration-300"
                                                        title="Remover membro"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {(!members || members.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm font-medium">
                                            Nenhum membro associado a este projeto ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
