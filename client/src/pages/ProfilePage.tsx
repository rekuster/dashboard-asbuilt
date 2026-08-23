import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    ArrowLeft,
    User,
    Mail,
    Lock,
    KeyRound,
    Save,
    Loader2,
    ShieldCheck,
    Building2,
    CheckCircle2,
    Camera,
    FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const utils = trpc.useUtils();

    // Form states
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    // Password change states
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const { data: userProfile, isLoading: loadingProfile } = trpc.members.getProfile.useQuery(
        undefined,
        { enabled: !!user }
    );

    const { data: userProjects = [] } = trpc.projects.list.useQuery();

    const updateProfileMutation = trpc.members.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Perfil atualizado com sucesso!");
            utils.members.getProfile.invalidate();
            setSavingProfile(false);
        },
        onError: (err) => {
            toast.error("Erro ao salvar perfil: " + err.message);
            setSavingProfile(false);
        },
    });

    useEffect(() => {
        if (userProfile) {
            setName(userProfile.name || "");
            setEmail(userProfile.email || user?.email || "");
            setAvatarUrl(userProfile.avatarUrl || "");
        } else if (user) {
            setEmail(user.email || "");
            setName(user.user_metadata?.name || user.user_metadata?.full_name || "");
        }
    }, [userProfile, user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await updateProfileMutation.mutateAsync({
                name,
                avatarUrl,
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error("A nova senha deve ter no mínimo 6 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("A confirmação de senha não confere.");
            return;
        }

        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                throw new Error(error.message);
            }

            toast.success("Senha alterada com sucesso!");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error("Erro ao redefinir senha: " + error.message);
        } finally {
            setUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto pb-12 font-sans animate-in fade-in duration-200">
            {/* Header com Identidade Stecla */}
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
                            <User className="w-4 h-4 text-[#9C1915]" />
                            Meu Perfil
                        </h1>
                        <p className="text-xs text-[#575756]">
                            Gerencie seus dados de acesso e preferências na plataforma.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* BLOCO 1: DADOS PESSOAIS */}
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                    <div className="h-1 w-full bg-[#9C1915]" />
                    <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <User className="w-4 h-4 text-[#9C1915]" />
                            Dados Pessoais
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Informações exibidas para a equipe e parceiros em relatórios e apontamentos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nome */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                                        Nome Completo
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Seu nome"
                                            className="pl-8.5 text-xs h-9 rounded-lg border-slate-200"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* E-mail (Read-only) */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                                        E-mail de Login
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="pl-8.5 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        O e-mail principal é gerenciado pela autenticação institucional.
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="h-8.5 px-4 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs"
                                >
                                    {savingProfile ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* BLOCO 2: SEGURANÇA & ALTERAÇÃO DE SENHA */}
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                    <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-[#9C1915]" />
                            Segurança & Alteração de Senha
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Defina uma nova senha de acesso à plataforma (mínimo de 6 dígitos).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                                        Nova Senha
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pl-8.5 text-xs h-9 rounded-lg border-slate-200"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                                        Confirmar Nova Senha
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pl-8.5 text-xs h-9 rounded-lg border-slate-200"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={updatingPassword || !newPassword}
                                    variant="outline"
                                    className="h-8.5 px-4 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                                >
                                    {updatingPassword ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-3.5 h-3.5 text-[#9C1915]" />
                                    )}
                                    Atualizar Senha
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* BLOCO 3: PROJETOS VINCULADOS */}
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                    <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-[#9C1915]" />
                            Projetos com Acesso Liberado
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Projetos da plataforma aos quais sua conta tem autorização de visualização ou edição.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-1">
                        <div className="divide-y divide-slate-100">
                            {userProjects.map((p) => (
                                <div
                                    key={p.id}
                                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer rounded-lg px-2"
                                    onClick={() => setLocation(`/project/${p.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9C1915] border border-red-100 flex items-center justify-center font-bold text-xs">
                                            {p.code ? p.code.slice(0, 3) : "PRJ"}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                                            <p className="text-[10px] text-slate-400">{p.code} • {p.client || "Stecla"}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-[11px] font-bold border-slate-200"
                                    >
                                        Acessar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
